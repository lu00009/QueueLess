import { Router, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { z } from 'zod';

export const notificationRouter = Router();

const deviceTokenSchema = z.object({
  token: z.string().min(10, 'Valid device token is required'),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']).default('ANDROID'),
});

/**
 * Register mobile FCM device token
 */
notificationRouter.post(
  '/notifications/device-token',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const validated = deviceTokenSchema.parse(req.body);
      const tokenRecord = await NotificationService.registerDeviceToken(
        req.user!.userId,
        validated.token,
        validated.platform
      );
      res.status(200).json({ success: true, message: 'Device token registered', data: tokenRecord });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Delete device token (on logout)
 */
notificationRouter.delete(
  '/notifications/device-token',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (token) {
        await NotificationService.removeDeviceToken(token);
      }
      res.status(200).json({ success: true, message: 'Device token removed' });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Get in-app customer notification history
 */
notificationRouter.get(
  '/notifications',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.status(200).json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }
);
