import { Request, Response, NextFunction } from 'express';
import { Type } from '@google/genai';
import { AuthenticatedRequest } from '../middleware/auth';
import User from '../models/User';
import Attempt from '../models/Attempt';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import Badge from '../models/Badge';
import { withGeminiFailover } from '../config/gemini';
import mongoose from 'mongoose';

// ────────────────────────────────────────────────────────────────
// Shared types for the structured AI Study Recommendation contract
// ────────────────────────────────────────────────────────────────
export interface StudyRecommendation {
  priority: 'Critical' | 'Needs Improvement' | 'Good';
  icon: string;         // single emoji character
  title: string;        // ≤ 5 words
  score: number;        // 0-100 representing correct %
  description: string;  // ≤ 15 words
  action: string;       // ≤ 10 words
}

/** Gemini responseSchema that enforces the compact recommendation contract. */
const RECOMMENDATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recommendations: {
      type: Type.ARRAY,
      description: 'Exactly 1–3 prioritized study recommendations, ordered from most critical to least.',
      items: {
        type: Type.OBJECT,
        properties: {
          priority:    { type: Type.STRING, enum: ['Critical', 'Needs Improvement', 'Good'], description: 'Severity level based on score' },
          icon:        { type: Type.STRING, description: 'A single relevant emoji for the topic, e.g. 🔴 for OS, 🐍 for Python' },
          title:       { type: Type.STRING, description: 'Topic name, maximum 5 words' },
          score:       { type: Type.INTEGER, description: 'Correct percentage 0-100 for this category' },
          description: { type: Type.STRING, description: 'One concise sentence, maximum 15 words, describing what to improve' },
          action:      { type: Type.STRING, description: 'A single imperative action step, maximum 10 words' },
        },
        required: ['priority', 'icon', 'title', 'score', 'description', 'action'],
      },
    },
  },
  required: ['recommendations'],
};

/** Generates a rule-based fallback JSON when Gemini is unavailable. */
function buildFallbackRecommendations(progressData: { name: string; correct: number; incorrect: number; totalQuestions: number }[]): StudyRecommendation[] {
  const sorted = [...progressData].sort((a, b) => a.correct - b.correct).slice(0, 3);
  return sorted.map((d): StudyRecommendation => ({
    priority: d.correct < 40 ? 'Critical' : d.correct < 70 ? 'Needs Improvement' : 'Good',
    icon: d.correct < 40 ? '🔴' : d.correct < 70 ? '🟡' : '✅',
    title: d.name,
    score: d.correct,
    description: `Improve your ${d.name} fundamentals to raise your score.`,
    action: `Practice more ${d.name} quizzes.`,
  }));
}

/**
 * Fetch current user profile.
 */
export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Fetch attempts count and total points
    const attempts = await Attempt.find({ userId });
    const totalAttempts = attempts.length;
    let totalScore = 0;
    attempts.forEach((a) => {
      totalScore += a.score;
    });

    res.status(200).json({
      success: true,
      user,
      stats: {
        totalAttempts,
        totalScore,
        streak: user.streak,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────
// Shared progress aggregation helper (used by both endpoints)
// ────────────────────────────────────────────────────────────────
async function aggregateProgressData(userId: string | undefined) {
  const attempts = await Attempt.find({ userId });
  if (attempts.length === 0) return null;

  const quizIds = attempts.map((a) => a.quizId);
  const quizzes = await Quiz.find({ _id: { $in: quizIds } });
  const quizMap = new Map(quizzes.map((q) => [q._id.toString(), q]));

  const categoryStats: Record<string, { correct: number; total: number }> = {};

  attempts.forEach((attempt) => {
    const qz = quizMap.get(attempt.quizId.toString());
    if (!qz) return;
    const category = qz.category || 'General';
    if (!categoryStats[category]) categoryStats[category] = { correct: 0, total: 0 };
    attempt.questionsAttempted.forEach((qa) => {
      categoryStats[category].total += 1;
      if (qa.isCorrect) categoryStats[category].correct += 1;
    });
  });

  return Object.entries(categoryStats).map(([name, stats]) => {
    const correctPercent = Math.round((stats.correct / stats.total) * 100);
    return {
      name,
      correct: correctPercent,
      incorrect: 100 - correctPercent,
      totalQuestions: stats.total,
    };
  });
}

/** Calls Gemini with a strict responseSchema to produce structured recommendations. */
async function generateStructuredRecommendations(
  progressData: { name: string; correct: number; incorrect: number; totalQuestions: number }[]
): Promise<StudyRecommendation[]> {
  // Build a concise stats table for the prompt — no verbose paragraphs
  const statsLines = progressData
    .map((d) => `${d.name}: ${d.correct}% correct (${d.totalQuestions} questions)`)
    .join('\n');

  const prompt = [
    'You are a study plan generator for a developer quiz platform.',
    'A student has the following category performance scores:',
    statsLines,
    '',
    'Return up to 3 prioritized study recommendations, focusing on the weakest categories first.',
    'Each recommendation must be extremely concise — follow the word limits strictly:',
    '  - title: maximum 5 words',
    '  - description: maximum 15 words describing the core gap',
    '  - action: maximum 10 words as a single imperative action',
    'Assign priority: Critical (score < 40%), Needs Improvement (40–69%), Good (70%+).',
    'Choose a relevant single emoji for each topic.',
    'Do NOT write paragraphs. Do NOT add generic advice. Be specific to the topic.',
  ].join('\n');

  const responseText = await withGeminiFailover(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RECOMMENDATION_SCHEMA,
      },
    });
    return response.text;
  });

  if (!responseText) throw new Error('Empty Gemini response for recommendations');

  const parsed = JSON.parse(responseText) as { recommendations: StudyRecommendation[] };
  // Enforce max 3 items regardless of what Gemini returns
  return parsed.recommendations.slice(0, 3);
}

/**
 * Compile category-wise strength/weakness datasets for Recharts.
 * Returns structured JSON recommendations (not prose) via Gemini responseSchema.
 */
export const getUserProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const progressData = await aggregateProgressData(userId);

    if (!progressData || progressData.length === 0) {
      res.status(200).json({
        success: true,
        progress: [],
        aiRecommendations: JSON.stringify({ recommendations: [] }),
      });
      return;
    }

    let recommendations: StudyRecommendation[];
    try {
      recommendations = await generateStructuredRecommendations(progressData);
    } catch (err) {
      console.error('Gemini structured recommendations failed — using rule-based fallback:', err);
      recommendations = buildFallbackRecommendations(progressData);
    }

    res.status(200).json({
      success: true,
      progress: progressData,
      aiRecommendations: JSON.stringify({ recommendations }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Force-refresh AI study recommendations, bypassing any client-side cache.
 * Called by the "Generate New Plan" button on the Profile page.
 */
export const generateNewRecommendations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    const progressData = await aggregateProgressData(userId);

    if (!progressData || progressData.length === 0) {
      res.status(200).json({
        success: true,
        recommendations: [],
        message: 'No attempt data found. Complete a quiz to receive recommendations.',
      });
      return;
    }

    let recommendations: StudyRecommendation[];
    try {
      recommendations = await generateStructuredRecommendations(progressData);
    } catch (err) {
      console.error('Gemini refresh failed — using rule-based fallback:', err);
      recommendations = buildFallbackRecommendations(progressData);
    }

    res.status(200).json({
      success: true,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch public list of Badges and highlight unlocked status.
 */
export const getUserBadges = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Get all badges pre-seeded
    const allBadges = await Badge.find();

    // Return badges with unlocked flag
    const results = allBadges.map((badge) => ({
      ...badge.toObject(),
      isUnlocked: user.badges.includes(badge.badgeId),
    }));

    res.status(200).json({
      success: true,
      badges: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Panel Dashboard stats analytics.
 * Aggregates users, quizzes, attempts, averages, and charts lists.
 */
export const getAdminAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalQuizzes = await Quiz.countDocuments();
    const totalAttempts = await Attempt.countDocuments();

    // Average attempt scores
    const averageScoreStats = await Attempt.aggregate([
      {
        $group: {
          _id: null,
          avgBaseScore: { $avg: '$score' },
          avgSpeedBonus: { $sum: 0 },
          avgTotalScore: { $avg: '$score' },
        },
      },
    ]);

    const avgStats = averageScoreStats[0] || { avgBaseScore: 0, avgSpeedBonus: 0, avgTotalScore: 0 };

    // Group attempts by date for line charts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const attemptsOverTime = await Attempt.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format for Recharts
    const lineChartData = attemptsOverTime.map((d) => ({
      date: d._id,
      attempts: d.count,
      avgScore: Math.round(d.avgScore),
    }));

    // Group quizzes by category for radar/bar charts
    const quizzesByCategory = await Quiz.aggregate([
      {
        $group: {
          _id: '$category',
          quizzesCount: { $sum: 1 },
        },
      },
    ]);

    const radarChartData = quizzesByCategory.map((d) => ({
      category: d._id,
      count: d.quizzesCount,
    }));

    res.status(200).json({
      success: true,
      summary: {
        totalUsers,
        totalQuizzes,
        totalAttempts,
        avgScore: Math.round(avgStats.avgTotalScore),
      },
      charts: {
        activityOverTime: lineChartData,
        quizzesByCategory: radarChartData,
      },
    });
  } catch (error) {
    next(error);
  }
};
