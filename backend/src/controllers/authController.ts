import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Otp from '../models/Otp';
import Session from '../models/Session';
import { sendOtpEmail, sendPasswordResetEmail } from '../config/mailer';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to hash tokens using SHA-256
const hashSha256 = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

// Helper to sign access token (short-lived: 15m)
const generateAccessToken = (userId: string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured in .env');
  return jwt.sign({ id: userId, email, role }, secret, { expiresIn: '15m' });
};

// Helper to sign refresh token (long-lived: 7d)
const generateRefreshToken = (sessionId: string): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not configured in .env');
  return jwt.sign({ sessionId }, secret, { expiresIn: '7d' });
};

// Cookie options for cross-origin (SameSite=none + Secure=true in production)
const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

const getClearCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  };
};

/**
 * Generates a cryptographically secure 6-digit OTP using crypto.randomInt (CSPRNG).
 * Math.random() is NOT used — it is not suitable for security tokens.
 */
const generateSecureOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Register a new inactive user, generate OTP, and send email.
 * Atomic: the user document is rolled back if OTP creation fails.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: existingUser.email === email
          ? 'Email address is already registered.'
          : 'Username is already taken.',
      });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, passwordHash, role: 'user', isVerified: false });
    await newUser.save();

    const otpCode = generateSecureOtp();
    const otpHash = hashSha256(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      await new Otp({ email, otpHash, expiresAt }).save();
      await sendOtpEmail(email, username, otpCode);
    } catch (otpError) {
      // Rollback: delete user if OTP or email fails so they can re-register
      await User.deleteOne({ _id: newUser._id });
      throw otpError;
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. A 6-digit verification code has been sent to your email.',
      email,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend a fresh OTP to an unverified user's email.
 */
export const resendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Generic response prevents user enumeration
    const genericOk = () =>
      res.status(200).json({
        success: true,
        message: 'If this email is registered and unverified, a new code has been sent.',
      });

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      genericOk();
      return;
    }

    // Purge old OTPs and issue a fresh one
    await Otp.deleteMany({ email });

    const otpCode = generateSecureOtp();
    await new Otp({ email, otpHash: hashSha256(otpCode), expiresAt: new Date(Date.now() + 10 * 60 * 1000) }).save();
    await sendOtpEmail(email, user.username, otpCode);

    genericOk();
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 6-digit OTP, activate account, and remove OTP record.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const inputOtpHash = hashSha256(otp);
    const otpRecord = await Otp.findOne({ email, otpHash: inputOtpHash });
    if (!otpRecord) {
      res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    user.isVerified = true;
    await user.save();
    await Otp.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Your account is now active. You can log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in user — single-write session using pre-generated ObjectId.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Your account has not been verified yet. Please verify your email first.',
        isVerified: false,
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
      return;
    }

    // Pre-generate session _id so refresh token can be signed before the first DB write.
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessionId = new mongoose.Types.ObjectId();
    const accessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const refreshToken = generateRefreshToken(sessionId.toString());
    const signature = refreshToken.split('.')[2];

    await new Session({
      _id: sessionId,
      userId: user._id,
      refreshTokenHash: hashSha256(signature),
      ipAddress,
      userAgent,
      expiresAt,
    }).save(); // Single DB write — no temp hash

    res.cookie('refreshToken', refreshToken, getCookieOptions());
    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        streak: user.streak,
        badges: user.badges,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sends a secure password reset link to the user's email address.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Always return the same response to prevent user enumeration
    const genericOk = () =>
      res.status(200).json({
        success: true,
        message: 'If this email is registered, a password reset link has been sent.',
      });

    const user = await User.findOne({ email, isVerified: true });
    if (!user) {
      genericOk();
      return;
    }

    // Generate a secure 64-char hex token, store its hash
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashSha256(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, user.username, resetUrl);

    genericOk();
  } catch (error) {
    next(error);
  }
};

/**
 * Validates reset token and updates the user's password.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, token, newPassword } = req.body;

    const user = await User.findOne({
      email,
      passwordResetToken: hashSha256(token),
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset link.' });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all active sessions for security
    await Session.deleteMany({ userId: user._id });
    res.clearCookie('refreshToken', getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Session refresh: rotates HttpOnly refresh tokens and issues fresh access tokens.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokenCookie = req.cookies.refreshToken;
    if (!tokenCookie) {
      res.status(401).json({ success: false, message: 'Unauthorized. Refresh token cookie missing.' });
      return;
    }

    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      res.status(500).json({ success: false, message: 'Internal configuration error.' });
      return;
    }

    let decodedSessionId = '';
    try {
      const decoded = jwt.verify(tokenCookie, secret) as { sessionId: string };
      decodedSessionId = decoded.sessionId;
    } catch {
      res.clearCookie('refreshToken', getClearCookieOptions());
      res.status(401).json({ success: false, message: 'Unauthorized. Refresh token is invalid or expired.' });
      return;
    }

    const session = await Session.findById(decodedSessionId);
    if (!session) {
      res.clearCookie('refreshToken', getClearCookieOptions());
      res.status(401).json({ success: false, message: 'Unauthorized. Session not found or revoked.' });
      return;
    }

    const signature = tokenCookie.split('.')[2];
    if (session.refreshTokenHash !== hashSha256(signature)) {
      await Session.deleteOne({ _id: session._id });
      res.clearCookie('refreshToken', getClearCookieOptions());
      res.status(401).json({ success: false, message: 'Unauthorized. Session compromised and revoked.' });
      return;
    }

    const user = await User.findById(session.userId);
    if (!user || !user.isVerified) {
      res.status(401).json({ success: false, message: 'Unauthorized. Account inactive or deleted.' });
      return;
    }

    const newAccessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const newRefreshToken = generateRefreshToken(session._id.toString());
    const newSignature = newRefreshToken.split('.')[2];
    session.refreshTokenHash = hashSha256(newSignature);
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    res.cookie('refreshToken', newRefreshToken, getCookieOptions());
    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout: revokes active session from DB and clears the HttpOnly cookie.
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokenCookie = req.cookies.refreshToken;
    if (tokenCookie) {
      const secret = process.env.REFRESH_TOKEN_SECRET;
      if (secret) {
        try {
          const decoded = jwt.verify(tokenCookie, secret) as { sessionId: string };
          await Session.deleteOne({ _id: decoded.sessionId });
        } catch {
          // Still clear cookie even if token parse fails
        }
      }
    }
    res.clearCookie('refreshToken', getClearCookieOptions());
    res.status(200).json({ success: true, message: 'Logged out successfully. Session invalidated.' });
  } catch (error) {
    next(error);
  }
};
