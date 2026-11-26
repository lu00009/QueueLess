import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/refresh-token', AuthController.refreshToken);
authRouter.post('/logout', authenticateToken, AuthController.logout);
authRouter.get('/me', authenticateToken, AuthController.getMe);
authRouter.patch('/me', authenticateToken, AuthController.updateMe);
