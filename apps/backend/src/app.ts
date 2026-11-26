import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { errorHandler, AppError } from './middleware/error.middleware';
import { healthRouter } from './routes/health.routes';

export function createApp(): Express {
  const app = express();

  // Security and utilities middleware
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (ENV.CORS_ORIGIN.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly
    },
    credentials: true,
  }));
  app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/v1/health', healthRouter);

  // 404 Handler
  app.use((req: Request, res: Response, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
