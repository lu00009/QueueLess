import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../validators/auth.validator';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = refreshTokenSchema.parse(req.body);
      const result = await AuthService.refreshToken(validated.refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Refresh token can optionally be blacklisted or cleared client-side
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getProfile(req.user!.userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const result = await AuthService.updateProfile(req.user!.userId, validated);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
