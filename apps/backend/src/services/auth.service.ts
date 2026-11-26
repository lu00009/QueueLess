import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { UserRole, OrgRole, AuthTokensDto } from '@queueless/shared-types';

export class AuthService {
  static async register(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<AuthTokensDto> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        phone: data.phone?.trim(),
        role: data.role || UserRole.CUSTOMER,
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role as OrgRole,
      })),
    };
  }

  static async login(data: { email: string; password: string }): Promise<AuthTokensDto> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { status: { in: ['ACTIVE', 'INVITED'] } },
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Upon successful login with credentials, promote any pending INVITED memberships to ACTIVE
    await prisma.organizationMembership.updateMany({
      where: {
        userId: user.id,
        status: 'INVITED',
      },
      data: {
        status: 'ACTIVE',
      },
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role as OrgRole,
      })),
    };
  }

  static async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new AppError('User account inactive or not found', 401);
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err: any) {
      throw new AppError(err.message || 'Invalid or expired refresh token', 401);
    }
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role as UserRole,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      },
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role as OrgRole,
      })),
    };
  }

  static async updateProfile(userId: string, data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      phone: updated.phone,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
