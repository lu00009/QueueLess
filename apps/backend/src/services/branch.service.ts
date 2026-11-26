import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class BranchService {
  static async create(orgId: string, data: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const existing = await prisma.branch.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: data.code.toUpperCase().trim(),
        },
      },
    });
    if (existing) {
      throw new AppError(`Branch code "${data.code}" already exists in this organization`, 409);
    }

    return prisma.branch.create({
      data: {
        organizationId: orgId,
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        address: data.address?.trim(),
        phone: data.phone?.trim(),
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  }

  static async listByOrg(orgId: string) {
    return prisma.branch.findMany({
      where: { organizationId: orgId },
      include: {
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: {
          select: { services: true, counters: true, queues: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getById(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        organization: true,
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        services: { where: { isActive: true } },
        counters: true,
        queues: {
          include: {
            service: true,
            configuration: true,
          },
        },
      },
    });
    if (!branch) throw new AppError('Branch not found', 404);
    return branch;
  }

  static async update(id: string, orgId: string, data: any) {
    const branch = await prisma.branch.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!branch) throw new AppError('Branch not found in this organization', 404);

    return prisma.branch.update({
      where: { id },
      data,
    });
  }

  static async setOperatingHours(branchId: string, orgId: string, hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId },
    });
    if (!branch) throw new AppError('Branch not found in this organization', 404);

    // Upsert all 7 days in transaction
    await prisma.$transaction(
      hours.map((h) =>
        prisma.operatingHour.upsert({
          where: {
            branchId_dayOfWeek: {
              branchId,
              dayOfWeek: h.dayOfWeek,
            },
          },
          update: {
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
          create: {
            branchId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isClosed: h.isClosed,
          },
        })
      )
    );

    return prisma.operatingHour.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  static async discoverPublic(params: { search?: string; lat?: number; lng?: number; radiusKm?: number }) {
    const where: any = { isActive: true };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { address: { contains: params.search, mode: 'insensitive' } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const branches = await prisma.branch.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        services: {
          where: { isActive: true },
          select: { id: true, name: true, code: true, estimatedDurationMinutes: true },
        },
        _count: {
          select: { services: true, counters: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return branches;
  }
}
