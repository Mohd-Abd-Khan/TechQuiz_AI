import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Extend Express Request type to include the authenticated user context
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

/**
 * Middleware to verify a short-lived JWT Access Token in the Authorization header.
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No authorization token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({
        success: false,
        message: 'Internal configuration error (JWT Secret is missing).',
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: 'user' | 'admin';
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Token is invalid or expired.',
      error: (error as Error).name,
    });
  }
};

/**
 * Middleware to check if the user is an administrator.
 * Must be mounted AFTER requireAuth.
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.',
      });
      return;
    }

    // Check user's current role directly from the database
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Admin credentials required.',
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

