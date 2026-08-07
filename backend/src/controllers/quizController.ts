import { Request, Response, NextFunction } from 'express';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import Attempt from '../models/Attempt';
import User from '../models/User';
import Badge from '../models/Badge';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { generateDailyChallenge } from '../services/cronService';

// Interface for quiz submission payload
interface SubmitAnswerPayload {
  questionId: string;
  selectedOption: number;
  timeTaken: number;
}

/**
 * ============================================================================
 * ADMIN ENDPOINTS
 * ============================================================================
 */

export const triggerDailyChallengeGeneration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await generateDailyChallenge();
    res.status(200).json({
      success: true,
      message: 'Daily Challenge generated and rotated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const createQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, category, difficulty, timeLimitPerQuestion } = req.body;
    const userId = req.user?.id;

    const newQuiz = new Quiz({
      title,
      description,
      category,
      difficulty,
      timeLimitPerQuestion: timeLimitPerQuestion || 30,
      creator: userId ? new mongoose.Types.ObjectId(userId) : null,
    });

    await newQuiz.save();
    res.status(201).json({ success: true, message: 'Quiz created successfully', quiz: newQuiz });
  } catch (error) {
    next(error);
  }
};

export const updateQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, category, difficulty, timeLimitPerQuestion, isActive } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      id,
      { title, description, category, difficulty, timeLimitPerQuestion, isActive },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Quiz updated successfully', quiz });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    // Delete quiz
    await Quiz.deleteOne({ _id: id });
    // Delete associated questions
    await Question.deleteMany({ quizId: id });

    res.status(200).json({ success: true, message: 'Quiz and its questions deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { text, options, correctIndex, points, explanation } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    const newQuestion = new Question({
      quizId,
      text,
      options,
      correctIndex,
      points: points || 10,
      explanation,
    });

    await newQuestion.save();
    res.status(201).json({ success: true, message: 'Question added successfully', question: newQuestion });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { text, options, correctIndex, points, explanation } = req.body;

    const question = await Question.findByIdAndUpdate(
      id,
      { text, options, correctIndex, points, explanation },
      { new: true, runValidators: true }
    );

    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Question updated successfully', question });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const bulkImportQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { quizId } = req.params;
    const { questions } = req.body; // Array of questions

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid payload. Expecting non-empty array of questions.' });
      return;
    }

    const questionsToInsert = questions.map((q: any) => ({
      quizId,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      points: q.points || 10,
      explanation: q.explanation || '',
    }));

    await Question.insertMany(questionsToInsert);

    res.status(201).json({ success: true, message: `Successfully imported ${questionsToInsert.length} questions` });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * USER ENDPOINTS
 * ============================================================================
 */

export const getQuizzes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get active quizzes (admins can see all)
    const quizzes = await Quiz.find({ isActive: true });
    
    // Attach question counts dynamically
    const results = await Promise.all(
      quizzes.map(async (quiz) => {
        const count = await Question.countDocuments({ quizId: quiz._id });
        return {
          ...quiz.toObject(),
          questionCount: count,
        };
      })
    );

    res.status(200).json({ success: true, quizzes: results });
  } catch (error) {
    next(error);
  }
};

// Admin detailed list of all quizzes
export const getAdminQuizzes = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    const results = await Promise.all(
      quizzes.map(async (quiz) => {
        const count = await Question.countDocuments({ quizId: quiz._id });
        return {
          ...quiz.toObject(),
          questionCount: count,
        };
      })
    );
    res.status(200).json({ success: true, quizzes: results });
  } catch (error) {
    next(error);
  }
};

// Fetch questions for attempting (Correct Index stripped out to prevent cheating)
export const getQuizQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz || !quiz.isActive) {
      res.status(404).json({ success: false, message: 'Quiz not found or disabled.' });
      return;
    }

    const questions = await Question.find({ quizId: id }).select('-correctIndex -explanation');
    res.status(200).json({
      success: true,
      quiz,
      questions,
    });
  } catch (error) {
    next(error);
  }
};

// Admin fetch questions (Includes correct Index & explanation)
export const getAdminQuizQuestions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }
    const questions = await Question.find({ quizId: id });
    res.status(200).json({ success: true, quiz, questions });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit quiz answers: processes base scores and speed bonuses.
 */
export const submitQuizAttempt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: quizId } = req.params;
    const { answers, mode }: { answers: SubmitAnswerPayload[]; mode?: 'solo' | 'multiplayer' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    // Fetch correct options from DB
    const questions = await Question.find({ quizId });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let calculatedScore = 0;
    let calculatedSpeedBonus = 0;
    let totalTimeTaken = 0;

    const questionsAttempted = answers.map((ans) => {
      const q = questionMap.get(ans.questionId);
      if (!q) {
        throw new Error(`Question ${ans.questionId} does not belong to this quiz.`);
      }

      const isCorrect = ans.selectedOption === q.correctIndex;
      totalTimeTaken += ans.timeTaken;

      let scoreGain = 0;
      let speedBonus = 0;

      if (isCorrect) {
        scoreGain = q.points;

        // Speed bonus logic:
        // Max question response time limit in seconds
        const maxTime = quiz.timeLimitPerQuestion || 30;
        const ratio = ans.timeTaken / maxTime;

        if (ratio < 0.3) {
          // Less than 30% time taken: +5 bonus
          speedBonus = 5;
        } else if (ratio < 0.6) {
          // Less than 60% time taken: +2 bonus
          speedBonus = 2;
        }
      }

      calculatedScore += scoreGain;
      calculatedSpeedBonus += speedBonus;

      return {
        questionId: q._id,
        selectedOption: ans.selectedOption,
        isCorrect,
        timeTaken: ans.timeTaken,
      };
    });

    const finalScore = calculatedScore + calculatedSpeedBonus;

    // Save Attempt document
    const attempt = new Attempt({
      userId: new mongoose.Types.ObjectId(userId),
      quizId: new mongoose.Types.ObjectId(quizId),
      questionsAttempted,
      score: calculatedScore, // Base score
      speedBonus: calculatedSpeedBonus, // Speed bonus score
      timeTaken: totalTimeTaken,
      mode: mode || 'solo',
    });

    await attempt.save();

    // Update User Streak & Activity
    const user = await User.findById(userId);
    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (user.lastActiveDate) {
        const lastActive = new Date(user.lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - lastActive.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Streak increments on consecutive days
          user.streak += 1;
        } else if (diffDays > 1) {
          // Reset streak if missed days
          user.streak = 1;
        }
      } else {
        user.streak = 1;
      }

      user.lastActiveDate = today;

      // Check Badges triggers
      const currentBadges = new Set(user.badges);
      let unlockedBadgeMsg = '';

      // Rule 1: 'first_quiz'
      if (!currentBadges.has('first_quiz')) {
        user.badges.push('first_quiz');
        unlockedBadgeMsg = 'Achievement Unlocked: First Quiz Attempt!';
      }

      // Rule 2: 'speed_demon' - got at least 15 points in speed bonuses in a single attempt
      if (calculatedSpeedBonus >= 15 && !currentBadges.has('speed_demon')) {
        user.badges.push('speed_demon');
        unlockedBadgeMsg = 'Achievement Unlocked: Speed Demon!';
      }

      // Rule 3: Streak benchmarks
      if (user.streak >= 7 && !currentBadges.has('streak_7')) {
        user.badges.push('streak_7');
        unlockedBadgeMsg = 'Achievement Unlocked: 7-Day Streak Master!';
      }

      await user.save();

      res.status(200).json({
        success: true,
        attempt,
        totalScore: finalScore,
        baseScore: calculatedScore,
        speedBonus: calculatedSpeedBonus,
        streak: user.streak,
        badgeUnlocked: unlockedBadgeMsg || null,
      });
    } else {
      res.status(200).json({
        success: true,
        attempt,
        totalScore: finalScore,
        baseScore: calculatedScore,
        speedBonus: calculatedSpeedBonus,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Leaderboards: top 10 scorers per quiz.
 */
export const getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: quizId } = req.params;

    // Mongoose aggregate pipeline
    const leaderboard = await Attempt.aggregate([
      { $match: { quizId: new mongoose.Types.ObjectId(quizId) } },
      // Project the totalScore as score + speedBonus
      {
        $project: {
          userId: 1,
          timeTaken: 1,
          baseScore: '$score',
          speedBonus: '$speedBonus',
          totalScore: { $add: ['$score', '$speedBonus'] },
          createdAt: 1,
        },
      },
      // Sort by totalScore descending, then timeTaken ascending (faster answer breaks ties)
      { $sort: { totalScore: -1, timeTaken: 1 } },
      { $limit: 10 },
      // Join to get username
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalScore: 1,
          baseScore: 1,
          speedBonus: 1,
          timeTaken: 1,
          createdAt: 1,
          username: '$user.username',
        },
      },
    ]);

    res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
};

/**
 * Downloads a compiled PDF study guide for a specific quiz attempt.
 */
import { generateAttemptPdfBuffer } from '../services/pdfService';

export const downloadAttemptPdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const pdfBuffer = await generateAttemptPdfBuffer(attemptId, userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="study-notes-${attemptId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch detailed metrics for a specific quiz attempt.
 */
export const getAttemptDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Quiz attempt log not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this attempt.' });
      return;
    }

    const quiz = await Quiz.findById(attempt.quizId);
    const questions = await Question.find({ quizId: attempt.quizId });

    res.status(200).json({
      success: true,
      attempt,
      quiz,
      questions,
    });
  } catch (error) {
    next(error);
  }
};


