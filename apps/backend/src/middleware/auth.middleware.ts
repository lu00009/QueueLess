import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { AppError } from './error.middleware';
import { UserRole, OrgRole } from '@queueless/shared-types';
import { prisma } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  membership?: {
    organizationId: string;
    role: OrgRole;
  };
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return next(new AppError('Authentication token required', 401));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(new AppError('Invalid token format. Expected Bearer <token>', 401));
  }

  try {
    const payload = verifyAccessToken(parts[1]);
    req.user = payload;
    next();
  } catch (err: any) {
    return next(new AppError(err.message || 'Invalid or expired access token', 401));
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: requires one of [${allowedRoles.join(', ')}]`,
          403
        )
      );
    }

    next();
  };
}

export function requireOrgAccess(allowedOrgRoles?: OrgRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // System Admins bypass organization membership requirements
    if (req.user.role === UserRole.SYSTEM_ADMIN) {
      return next();
    }

    const orgId =
      (req.headers['x-organization-id'] as string) ||
      req.params.organizationId ||
      req.params.orgId ||
      req.params.id ||
      req.body.organizationId;

    if (!orgId) {
      return next(new AppError('Organization context (x-organization-id) is required', 400));
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return next(new AppError('User is not an active member of this organization', 403));
    }

    if (allowedOrgRoles && allowedOrgRoles.length > 0) {
      if (!allowedOrgRoles.includes(membership.role as OrgRole)) {
        return next(
          new AppError(
            `Insufficient organization privileges. Required: [${allowedOrgRoles.join(', ')}]`,
            403
          )
        );
      }
    }

    req.membership = {
      organizationId: membership.organizationId,
      role: membership.role as OrgRole,
    };

    next();
  };
}
