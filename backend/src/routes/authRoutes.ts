import { Router } from 'express';
import {
  register,
  verifyOtp,
  login,
  refresh,
  logout,
  resendOtp,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { validateBody, registerSchema, loginSchema, verifyOtpSchema } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Auth core flows — rate-limited to prevent brute force
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/verify-otp', authLimiter, validateBody(verifyOtpSchema), verifyOtp);
router.post('/login', authLimiter, validateBody(loginSchema), login);

// OTP resend (also rate-limited)
router.post('/resend-otp', authLimiter, resendOtp);

// Password reset flow
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Token refresh & Logout
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;

