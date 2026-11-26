import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { QueueStatus } from '@prisma/client';

export class ServiceService {
  static async create(branchId: string, orgId: string, data: {
    name: string;
    code: string;
    description?: string;
    estimatedDurationMinutes?: number;
    maxDailyTickets?: number;
    priorityLevel?: number;
  }) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId },
    });
    if (!branch) throw new AppError('Branch not found in this organization', 404);

    const existing = await prisma.service.findUnique({
      where: {
        branchId_code: {
          branchId,
          code: data.code.toUpperCase().trim(),
        },
      },
    });
    if (existing) {
      throw new AppError(`Service with code "${data.code}" already exists in this branch`, 409);
    }

    // Create service and its associated Queue + QueueConfiguration automatically
    return prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          organizationId: orgId,
          branchId,
          name: data.name.trim(),
          code: data.code.toUpperCase().trim(),
          description: data.description?.trim(),
          estimatedDurationMinutes: data.estimatedDurationMinutes || 15,
          maxDailyTickets: data.maxDailyTickets || 500,
          priorityLevel: data.priorityLevel || 2,
        },
      });

      const queue = await tx.queue.create({
        data: {
          organizationId: orgId,
          branchId,
          serviceId: service.id,
          name: `${service.name} Queue`,
          prefix: service.code.slice(0, 2),
          status: QueueStatus.OPEN,
        },
      });

      await tx.queueConfiguration.create({
        data: {
          queueId: queue.id,
          maxWaitingCapacity: 100,
          autoCallNext: false,
          allowRemoteJoin: true,
          geofenceRadiusMeters: 5000,
          notificationThresholdAhead: 3,
          bufferMinutes: 5,
        },
      });

      return service;
    });
  }

  static async listByBranch(branchId: string) {
    return prisma.service.findMany({
      where: { branchId, isActive: true },
      include: {
        queues: {
          include: {
            configuration: true,
            _count: {
              select: {
                tickets: {
                  where: { status: 'WAITING' },
                },
              },
            },
          },
        },
      },
      orderBy: { priorityLevel: 'desc' },
    });
  }

  static async update(id: string, orgId: string, data: any) {
    const service = await prisma.service.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!service) throw new AppError('Service not found in this organization', 404);

    return prisma.service.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string, orgId: string) {
    const service = await prisma.service.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!service) throw new AppError('Service not found in this organization', 404);

    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
