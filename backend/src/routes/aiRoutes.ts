import { Router } from 'express';
import {
  generateQuestions,
  getDoubtExplanation,
  getPerformanceAnalysis,
  chatWithTutor,
} from '../controllers/aiController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Admin: generate MCQs using Gemini responseSchema
router.post('/generate-questions', requireAuth, requireAdmin, generateQuestions);

// User: get doubt solver explanation for a question (Solo only)
router.post('/doubt-solver', requireAuth, getDoubtExplanation);

// User: get or generate personalized performance feedback block (Solo only)
router.get('/analyze-attempt/:attemptId', requireAuth, getPerformanceAnalysis);

// User: multi-turn chatbot conversation tutor (Solo only)
router.post('/chat-tutor', requireAuth, chatWithTutor);

export default router;
