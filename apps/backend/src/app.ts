import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { errorHandler, AppError } from './middleware/error.middleware';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { orgManagementRouter } from './routes/org-management.routes';
import { authenticateToken, requireRoles, requireOrgAccess, AuthenticatedRequest } from './middleware/auth.middleware';
import { UserRole, OrgRole } from '@queueless/shared-types';

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
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', orgManagementRouter);

  // Test Route for Role-Based Access Control Verification
  app.get(
    '/api/v1/test/admin-only',
    authenticateToken,
    requireRoles(UserRole.SYSTEM_ADMIN),
    (req: AuthenticatedRequest, res: Response) => {
      res.json({ success: true, message: 'Welcome System Admin', user: req.user });
    }
  );

  // Test Route for Organization Tenant Isolation Verification
  app.get(
    '/api/v1/test/org-admin-only',
    authenticateToken,
    requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
    (req: AuthenticatedRequest, res: Response) => {
      res.json({
        success: true,
        message: 'Welcome Org Admin/Owner',
        membership: req.membership,
      });
    }
  );

  // 404 Handler
  app.use((req: Request, res: Response, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
  });

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
