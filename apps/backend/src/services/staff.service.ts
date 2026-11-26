import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { OrgRole, MembershipStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

export class StaffService {
  static async listByOrg(orgId: string) {
    return prisma.organizationMembership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async inviteOrAdd(orgId: string, data: {
    email: string;
    role: OrgRole;
    fullName?: string;
    phone?: string;
  }) {
    let user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!user) {
      const defaultPasswordHash = await bcrypt.hash('Staff@123456', 10);
      user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: defaultPasswordHash,
          fullName: data.fullName?.trim() || data.email.split('@')[0],
          phone: data.phone?.trim(),
          role: UserRole.CUSTOMER,
        },
      });
    }

    const existingMembership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (existingMembership) {
      throw new AppError('User is already a member of this organization', 409);
    }

    return prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: data.role,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        user: true,
      },
    });
  }

  static async updateRole(orgId: string, userId: string, role: OrgRole) {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });
    if (!membership) throw new AppError('Membership not found', 404);

    return prisma.organizationMembership.update({
      where: { id: membership.id },
      data: { role },
    });
  }

  static async assignStaff(orgId: string, data: {
    userId: string;
    branchId: string;
    counterId?: string | null;
    isPrimary?: boolean;
  }) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, organizationId: orgId },
    });
    if (!branch) throw new AppError('Branch not found in this organization', 404);

    return prisma.staffAssignment.upsert({
      where: {
        userId_branchId: {
          userId: data.userId,
          branchId: data.branchId,
        },
      },
      update: {
        counterId: data.counterId,
        isPrimary: data.isPrimary ?? true,
      },
      create: {
        organizationId: orgId,
        branchId: data.branchId,
        userId: data.userId,
        counterId: data.counterId,
        isPrimary: data.isPrimary ?? true,
      },
      include: {
        user: true,
        branch: true,
        counter: true,
      },
    });
  }

  static async remove(orgId: string, userId: string) {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });
    if (!membership) throw new AppError('Membership not found', 404);

    return prisma.$transaction([
      prisma.staffAssignment.deleteMany({
        where: { userId, organizationId: orgId },
      }),
      prisma.organizationMembership.delete({
        where: { id: membership.id },
      }),
    ]);
  }
}
