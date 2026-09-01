import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import quizRoutes from './routes/quizRoutes';
import aiRoutes from './routes/aiRoutes';
import userRoutes from './routes/userRoutes';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();

// Enable trust proxy for rate limiting behind reverse proxies (Render, AWS, Vercel)
app.set('trust proxy', 1);

// Configure CORS
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = Array.from(
  new Set([clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Allow explicitly listed origins or any Vercel deployment subdomain
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin "${origin}" is not permitted.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


// Apply middleware
app.use(express.json());
app.use(cookieParser());

// Apply global rate limiting to all API requests
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// Root test endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'TechQuiz AI API is healthy and operational.' });
});

// 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global Error Catching Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error. Please contact admin support.',
  });
});

export default app;
