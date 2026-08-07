import { Router } from 'express';
import {
  getUserProfile,
  getUserProgress,
  getUserBadges,
  getAdminAnalytics,
  generateNewRecommendations,
} from '../controllers/userController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// User profile details
router.get('/profile', requireAuth, getUserProfile);

// Category-wise progress Recharts dataset and AI suggestions
router.get('/progress', requireAuth, getUserProgress);

// Badges unlocked grid lists
router.get('/badges', requireAuth, getUserBadges);

// Force-refresh structured AI study recommendations
router.post('/recommendations/refresh', requireAuth, generateNewRecommendations);

// Admin dashboard summary counts and trend lines (Admins only)
router.get('/admin/analytics', requireAuth, requireAdmin, getAdminAnalytics);

export default router;
