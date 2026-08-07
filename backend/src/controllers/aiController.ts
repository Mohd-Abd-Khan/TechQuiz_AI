import { Response, NextFunction } from 'express';
import { Type, Schema } from '@google/genai';
import { withGeminiFailover } from '../config/gemini';
import { AuthenticatedRequest } from '../middleware/auth';
import Question from '../models/Question';
import Attempt from '../models/Attempt';
import Chat from '../models/Chat';
import Quiz from '../models/Quiz';
import mongoose from 'mongoose';

/**
 * AI Question Generator (Admin Tool)
 * Topic and difficulty selected, generates 1-10 MCQ questions with response schema.
 */
export const generateQuestions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { topic, difficulty, count } = req.body; // topic e.g., 'React Hooks', difficulty e.g., 'advanced', count e.g., 5

    if (!topic || !difficulty) {
      res.status(400).json({ success: false, message: 'Topic and difficulty are required' });
      return;
    }

    const questionCount = Math.min(Math.max(parseInt(count || '5', 10), 1), 10);

    const prompt = `Generate a JSON array of exactly ${questionCount} multiple choice questions (MCQ) on the technical topic: "${topic}".
    The target difficulty level is: "${difficulty}".
    Ensure every question is high quality, technically accurate, and testing practical engineering skills.
    Each question must contain:
    1. A clear question text (focus on practical real-world scenarios).
    2. An array of exactly 4 options.
    3. The correctIndex (0, 1, 2, or 3) representing the index of the correct answer in the options array.
    4. A clear explanation of why the correct option is right and the others are incorrect.
    5. A points value (default 10).`;

    // Execute with failover rotation support
    const responseText = await withGeminiFailover(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of AI generated MCQ questions',
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: 'Question text testing specific concept' },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of exactly 4 choices'
                },
                correctIndex: { type: Type.INTEGER, description: '0-based index of correct option (0-3)' },
                explanation: { type: Type.STRING, description: 'Explanation detailing correct option logic and analogies' },
                points: { type: Type.INTEGER, description: 'Points assigned, e.g. 10' }
              },
              required: ['text', 'options', 'correctIndex', 'explanation']
            }
          }
        }
      });
      return response.text;
    });

    if (!responseText) {
      res.status(500).json({ success: false, message: 'Failed to generate content from Gemini API.' });
      return;
    }

    // Parse verified JSON
    const questions = JSON.parse(responseText);
    res.status(200).json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Gemini Question Generation Error:', error);
    next(error);
  }
};

/**
 * AI Doubt Solver (Result Page - Solo Only)
 * Explains correct answer, student mistakes, and provides an analogy.
 */
export const getDoubtExplanation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId, questionId, selectedOption } = req.body;
    const userId = req.user?.id;

    if (!attemptId || !questionId) {
      res.status(400).json({ success: false, message: 'attemptId and questionId are required' });
      return;
    }

    // Verify attempt mode & owner
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Quiz attempt log not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this attempt.' });
      return;
    }

    // Multiplayer room check: strictly disabled during matches to save token limits
    if (attempt.mode === 'multiplayer') {
      res.status(403).json({
        success: false,
        message: 'AI Doubt Solver is not available for multiplayer matches to preserve rate limits.',
      });
      return;
    }

    // Find the original question definition
    const question = await Question.findById(questionId);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    const selectedText = selectedOption >= 0 && selectedOption < 4 
      ? question.options[selectedOption] 
      : 'Skipped';
    const correctText = question.options[question.correctIndex];

    const prompt = `You are a helpful programming tutor. A student just took a quiz and got a question wrong.
    Question: "${question.text}"
    Options available:
    1. ${question.options[0]}
    2. ${question.options[1]}
    3. ${question.options[2]}
    4. ${question.options[3]}
    
    Correct Answer: "${correctText}" (Index: ${question.correctIndex})
    Student's Answer: "${selectedText}" (Index: ${selectedOption})
    Original Explanation: "${question.explanation}"
    
    Please explain:
    1. Why the Correct Answer is correct.
    2. Why the Student's selected option was incorrect or what the typical misconception is.
    3. Give a clear, helpful real-world technical analogy to make this concept easy to understand.
    Provide a professional, clean Markdown response.`;

    const explanation = await withGeminiFailover(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    });

    res.status(200).json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error('Doubt Solver Error:', error);
    next(error);
  }
};

/**
 * AI Performance Analyzer (Lazy-loaded per submission - Solo Only)
 * Analyzes the attempt details, identifies weak areas, and provides customized learning steps.
 */
export const getPerformanceAnalysis = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt log not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this attempt.' });
      return;
    }

    // Lazy load: if analysis already exists in document, return it immediately
    if (attempt.aiFeedback) {
      res.status(200).json({ success: true, feedback: attempt.aiFeedback });
      return;
    }

    // Fetch quiz category/difficulty
    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz details not found' });
      return;
    }

    // Populate question details
    const questionIds = attempt.questionsAttempted.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Construct detailed attempt overview for prompt
    let correctCount = 0;
    let wrongSummary = '';

    attempt.questionsAttempted.forEach((qa, idx) => {
      const q = questionMap.get(qa.questionId.toString());
      if (qa.isCorrect) {
        correctCount++;
      } else if (q) {
        wrongSummary += `\nQuestion ${idx + 1}: "${q.text}"\n  Selected: "${qa.selectedOption >= 0 ? q.options[qa.selectedOption] : 'Skipped'}"\n  Should be: "${q.options[q.correctIndex]}"\n`;
      }
    });

    const prompt = `Analyze a student's quiz submission and provide customized feedback.
    Quiz Topic Category: "${quiz.category}"
    Difficulty level: "${quiz.difficulty}"
    Score: ${attempt.score} points out of ${questions.length * 10} maximum base points.
    Speed Bonus Earned: ${attempt.speedBonus} points.
    Total Time Taken: ${attempt.timeTaken} seconds.
    Number of Correct Answers: ${correctCount}/${attempt.questionsAttempted.length}.
    
    Here is a log of questions they got WRONG (if any):
    ${wrongSummary || 'None (Perfect Score!)'}
    
    Please provide:
    1. A brief summary of their performance.
    2. Identify specific weak areas (specific concepts based on the questions they missed).
    3. Three specific, actionable study recommendations or topics to read.
    4. A short, highly motivating concluding tip.
    Keep the tone friendly, encouraging, and highly technical. Return a clean, well-spaced Markdown block.`;

    const analysisText = await withGeminiFailover(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text;
      if (!text) {
        throw new Error('Gemini Performance Analyzer returned empty response.');
      }
      return text;
    });

    // Cache the feedback inside the attempt document
    attempt.aiFeedback = analysisText;
    await attempt.save();

    res.status(200).json({
      success: true,
      feedback: analysisText,
    });
  } catch (error) {
    console.error('Performance Analyzer Error:', error);
    next(error);
  }
};

/**
 * AI Chatbot Tutor (Solo Only)
 * Multi-turn chat session with history loading.
 */
export const chatWithTutor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { attemptId, message } = req.body;
    const userId = req.user?.id;

    if (!attemptId || !message) {
      res.status(400).json({ success: false, message: 'attemptId and message are required' });
      return;
    }

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Quiz attempt log not found' });
      return;
    }

    if (attempt.userId.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden. You do not own this attempt.' });
      return;
    }

    // Lock chatbot if the attempt was a multiplayer match
    if (attempt.mode === 'multiplayer') {
      res.status(403).json({
        success: false,
        message: 'AI Tutor is not active for multiplayer rooms to avoid rate limits.',
      });
      return;
    }

    // Fetch or create chat session
    let chatSession = await Chat.findOne({ userId, attemptId });
    if (!chatSession) {
      chatSession = new Chat({
        userId: new mongoose.Types.ObjectId(userId),
        attemptId: new mongoose.Types.ObjectId(attemptId),
        messages: [],
      });
    }

    const quiz = await Quiz.findById(attempt.quizId);
    const quizTitle = quiz ? quiz.title : 'the quiz';

    // System instruction system setup
    const systemInstruction = `You are a friendly, expert technical tutor helping a student understand concepts from the quiz "${quizTitle}".
    The student scored ${attempt.score} points on this quiz.
    Answer their questions, explain programming structures, and provide code examples where appropriate. Keep explanations clear and correct.`;

    // Map history to Gemini API SDK format (strictly user/model roles)
    const geminiHistory = chatSession.messages.map((m) => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.text }],
    }));

    // Send user message and receive response via the failover wrapper
    const replyText = await withGeminiFailover(async (ai) => {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: geminiHistory,
        config: {
          systemInstruction,
        }
      });
      const result = await chat.sendMessage({ message });
      const text = result.text;
      if (!text) {
        throw new Error('Empty response from Gemini Tutor.');
      }
      return text;
    });

    // Update history inside MongoDB
    chatSession.messages.push({
      role: 'user',
      text: message,
      timestamp: new Date(),
    });
    chatSession.messages.push({
      role: 'model',
      text: replyText,
      timestamp: new Date(),
    });

    await chatSession.save();

    res.status(200).json({
      success: true,
      reply: replyText,
      messages: chatSession.messages,
    });
  } catch (error) {
    console.error('Chatbot Tutor Error:', error);
    next(error);
  }
};
