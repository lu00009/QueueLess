import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CounterStatus } from '@prisma/client';

export class CounterService {
  static async create(branchId: string, orgId: string, data: {
    name: string;
    number: string;
    serviceIds?: string[];
  }) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId },
    });
    if (!branch) throw new AppError('Branch not found in this organization', 404);

    const existing = await prisma.serviceCounter.findUnique({
      where: {
        branchId_number: {
          branchId,
          number: data.number.trim(),
        },
      },
    });
    if (existing) {
      throw new AppError(`Counter number "${data.number}" already exists in this branch`, 409);
    }

    return prisma.$transaction(async (tx) => {
      const counter = await tx.serviceCounter.create({
        data: {
          organizationId: orgId,
          branchId,
          name: data.name.trim(),
          number: data.number.trim(),
          status: CounterStatus.OFFLINE,
        },
      });

      if (data.serviceIds && data.serviceIds.length > 0) {
        await tx.counterServiceAssignment.createMany({
          data: data.serviceIds.map((serviceId) => ({
            counterId: counter.id,
            serviceId,
          })),
        });
      }

      return counter;
    });
  }

  static async listByBranch(branchId: string) {
    return prisma.serviceCounter.findMany({
      where: { branchId },
      include: {
        currentStaff: {
          select: { id: true, fullName: true, email: true },
        },
        supportedServices: {
          include: { service: true },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  static async update(id: string, orgId: string, data: any) {
    const counter = await prisma.serviceCounter.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!counter) throw new AppError('Counter not found in this organization', 404);

    return prisma.serviceCounter.update({
      where: { id },
      data,
    });
  }

  static async setSupportedServices(counterId: string, orgId: string, serviceIds: string[]) {
    const counter = await prisma.serviceCounter.findFirst({
      where: { id: counterId, organizationId: orgId },
    });
    if (!counter) throw new AppError('Counter not found in this organization', 404);

    return prisma.$transaction(async (tx) => {
      await tx.counterServiceAssignment.deleteMany({
        where: { counterId },
      });

      if (serviceIds.length > 0) {
        await tx.counterServiceAssignment.createMany({
          data: serviceIds.map((serviceId) => ({
            counterId,
            serviceId,
          })),
        });
      }

      return tx.counterServiceAssignment.findMany({
        where: { counterId },
        include: { service: true },
      });
    });
  }

  static async updateStatus(counterId: string, orgId: string, status: CounterStatus, staffId?: string) {
    const counter = await prisma.serviceCounter.findFirst({
      where: { id: counterId, organizationId: orgId },
    });
    if (!counter) throw new AppError('Counter not found in this organization', 404);

    return prisma.serviceCounter.update({
      where: { id: counterId },
      data: {
        status,
        ...(staffId !== undefined ? { currentStaffId: staffId } : {}),
      },
    });
  }
}
