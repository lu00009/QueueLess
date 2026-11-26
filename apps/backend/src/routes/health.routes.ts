import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { HealthCheckResponse } from '@queueless/shared-types';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  const response: HealthCheckResponse = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
    version: '1.0.0',
  };

  const httpStatus = dbStatus === 'connected' ? 200 : 503;
  res.status(httpStatus).json(response);
});
