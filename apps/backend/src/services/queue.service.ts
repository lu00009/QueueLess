import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { QueueStatus } from '@prisma/client';

export class QueueService {
  static async listByBranch(branchId: string, orgId?: string) {
    const where: any = { branchId };
    if (orgId) where.organizationId = orgId;

    return prisma.queue.findMany({
      where,
      include: {
        service: true,
        configuration: true,
        _count: {
          select: {
            tickets: {
              where: { status: 'WAITING' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async updateConfig(queueId: string, orgId: string, data: any) {
    const queue = await prisma.queue.findFirst({
      where: { id: queueId, organizationId: orgId },
    });
    if (!queue) throw new AppError('Queue not found in this organization', 404);

    return prisma.queueConfiguration.upsert({
      where: { queueId },
      update: data,
      create: {
        queueId,
        ...data,
      },
    });
  }

  static async updateStatus(queueId: string, orgId: string, status: QueueStatus) {
    const queue = await prisma.queue.findFirst({
      where: { id: queueId, organizationId: orgId },
    });
    if (!queue) throw new AppError('Queue not found in this organization', 404);

    return prisma.queue.update({
      where: { id: queueId },
      data: { status },
    });
  }
}
