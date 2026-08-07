import { Router } from 'express';
import {
  getQuizzes,
  getQuizQuestions,
  submitQuizAttempt,
  getLeaderboard,
  downloadAttemptPdf,
  getAttemptDetails,
  getAdminQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAdminQuizQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  bulkImportQuestions,
  triggerDailyChallengeGeneration,
} from '../controllers/quizController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * ============================================================================
 * PUBLIC / USER ROUTES
 * ============================================================================
 */
// Get list of active quizzes
router.get('/', getQuizzes);

// Get specific quiz and its stripped questions for attempt
router.get('/:id', getQuizQuestions);

// Submit quiz answers (requires authorization)
router.post('/:id/submit', requireAuth, submitQuizAttempt);

// Get quiz top-10 leaderboard
router.get('/:id/leaderboard', getLeaderboard);

// Download PDF study notes for an attempt
router.get('/attempt/:attemptId/pdf', requireAuth, downloadAttemptPdf);

// Get attempt details
router.get('/attempt/:attemptId', requireAuth, getAttemptDetails);

/**
 * ============================================================================
 * ADMIN CONTROL PANEL ROUTES (Authorized Admins Only)
 * ============================================================================
 */
// Detailed list of all quizzes
router.get('/admin/list', requireAuth, requireAdmin, getAdminQuizzes);

// Force manual daily challenge generation
router.post('/admin/daily-challenge/generate', requireAuth, requireAdmin, triggerDailyChallengeGeneration);

// Create a new quiz setup
router.post('/admin/create', requireAuth, requireAdmin, createQuiz);

// Update a quiz meta definition
router.put('/admin/update/:id', requireAuth, requireAdmin, updateQuiz);

// Delete quiz and all its child questions
router.delete('/admin/delete/:id', requireAuth, requireAdmin, deleteQuiz);

// Get quiz questions including correct answers
router.get('/admin/quiz/:id/questions', requireAuth, requireAdmin, getAdminQuizQuestions);

// Add single question
router.post('/admin/quiz/:quizId/question/add', requireAuth, requireAdmin, addQuestion);

// Update single question details
router.put('/admin/question/update/:id', requireAuth, requireAdmin, updateQuestion);

// Delete single question
router.delete('/admin/question/delete/:id', requireAuth, requireAdmin, deleteQuestion);

// Bulk import questions in one payload
router.post('/admin/quiz/:quizId/import', requireAuth, requireAdmin, bulkImportQuestions);

export default router;
