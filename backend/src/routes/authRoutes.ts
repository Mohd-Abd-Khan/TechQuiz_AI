import { Router } from 'express';
import { register, verifyOtp, login, refresh, logout } from '../controllers/authController';
import { validateBody, registerSchema, loginSchema, verifyOtpSchema } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authLimiter to prevent brute force on signup, login, and OTP verify routes
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/verify-otp', authLimiter, validateBody(verifyOtpSchema), verifyOtp);
router.post('/login', authLimiter, validateBody(loginSchema), login);

// Token refresh & Logout
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
