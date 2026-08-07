import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Otp from '../models/Otp';
import Session from '../models/Session';
import { sendOtpEmail } from '../config/mailer';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to hash OTPs using SHA-256
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

/**
 * Register a new inactive user, generate OTP, and send email.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
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

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create inactive user
    const newUser = new User({
      username,
      email,
      passwordHash,
      role: 'user', // Defaults to user
      isVerified: false,
    });

    await newUser.save();

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashSha256(otpCode);

    // TTL expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const newOtp = new Otp({
      email,
      otpHash,
      expiresAt,
    });

    await newOtp.save();

    // Send verification email
    await sendOtpEmail(email, username, otpCode);

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
 * Verify 6-digit OTP, activate account, and remove OTP record.
 */
export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    // Hash the input OTP to match
    const inputOtpHash = hashSha256(otp);

    // Check OTP record
    const otpRecord = await Otp.findOne({ email, otpHash: inputOtpHash });
    if (!otpRecord) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.',
      });
      return;
    }

    // Find and verify the user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    user.isVerified = true;
    await user.save();

    // Clean up OTP document
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
 * Log in user, compare password, establish database session, and issue HttpOnly cookie + access token.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
      return;
    }

    // Verify account activation
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: 'Your account has not been verified yet. Please verify your email first.',
        isVerified: false,
      });
      return;
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
      return;
    }

    // Create session in database
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Temporary placeholder for token signature hash (updated post-generation)
    const tempHash = crypto.randomBytes(32).toString('hex');
    const session = new Session({
      userId: user._id,
      refreshTokenHash: tempHash,
      ipAddress,
      userAgent,
      expiresAt,
    });
    await session.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const refreshToken = generateRefreshToken(session._id.toString());

    // Update session with correct SHA-256 hash of refresh token signature
    const signature = refreshToken.split('.')[2];
    session.refreshTokenHash = hashSha256(signature);
    await session.save();

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || true, // default to true in testing
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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
 * Session refresh: rotates HttpOnly refresh tokens and issues fresh access tokens.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokenCookie = req.cookies.refreshToken;
    if (!tokenCookie) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Refresh token cookie missing.',
      });
      return;
    }

    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
      res.status(500).json({
        success: false,
        message: 'Internal configuration error (Refresh Secret is missing).',
      });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tokenCookie, secret);
    } catch (err) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Refresh token signature invalid.',
      });
      return;
    }

    const { sessionId } = decoded;
    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Active session not found in database.',
      });
      return;
    }

    // Verify refresh token hash matching (defends against replay/theft)
    const signature = tokenCookie.split('.')[2];
    const incomingHash = hashSha256(signature);
    if (session.refreshTokenHash !== incomingHash) {
      // Token mismatch could imply compromise. Revoke session to be safe.
      await Session.deleteOne({ _id: session._id });
      res.clearCookie('refreshToken');
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Session compromised and revoked.',
      });
      return;
    }

    const user = await User.findById(session.userId);
    if (!user || !user.isVerified) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Account inactive or deleted.',
      });
      return;
    }

    // Generate new Access and Refresh tokens (Rotation)
    const newAccessToken = generateAccessToken(user._id.toString(), user.email, user.role);
    const newRefreshToken = generateRefreshToken(session._id.toString());

    // Update session in DB
    const newSignature = newRefreshToken.split('.')[2];
    session.refreshTokenHash = hashSha256(newSignature);
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // reset 7 days
    await session.save();

    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout: revokes active session from DB and clears the HttpOnly cookie container.
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
        } catch (err) {
          // Token signature validation failed but we still want to wipe cookie
        }
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || true,
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Session invalidated.',
    });
  } catch (error) {
    next(error);
  }
};
