import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { OrgStatus } from '@prisma/client';

export class OrganizationService {
  static async create(data: { name: string; slug: string; address?: string; timezone?: string }) {
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug.toLowerCase().trim() },
    });
    if (existing) {
      throw new AppError('An organization with this slug already exists', 409);
    }

    return prisma.organization.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.toLowerCase().trim(),
        address: data.address?.trim(),
        timezone: data.timezone || 'UTC',
        status: OrgStatus.ACTIVE,
      },
    });
  }

  static async getById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        branches: { where: { isActive: true } },
      },
    });
    if (!org) throw new AppError('Organization not found', 404);
    return org;
  }

  static async listAll() {
    return prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { branches: true, memberships: true },
        },
      },
    });
  }

  static async update(id: string, data: { name?: string; address?: string; timezone?: string; logoUrl?: string }) {
    return prisma.organization.update({
      where: { id },
      data,
    });
  }
}
