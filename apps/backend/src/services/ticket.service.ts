import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { TicketStatus, TicketEventType } from '@prisma/client';
import crypto from 'crypto';

export class TicketService {
  static async joinQueue(userId: string, data: {
    serviceId: string;
    customerName?: string;
    customerPhone?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: {
        branch: true,
        queues: {
          include: { configuration: true },
        },
      },
    });

    if (!service || !service.isActive) {
      throw new AppError('Service not found or inactive', 404);
    }

    if (service.queues.length === 0) {
      throw new AppError('Queue is not configured for this service', 400);
    }

    const queue = service.queues[0];
    if (queue.status !== 'OPEN') {
      throw new AppError(`Queue is currently ${queue.status}. Ticket admission paused.`, 400);
    }

    // Check duplicate active tickets for user in this queue
    const activeExisting = await prisma.queueTicket.findFirst({
      where: {
        userId,
        queueId: queue.id,
        status: { in: [TicketStatus.WAITING, TicketStatus.CALLED, TicketStatus.SERVING] },
      },
    });

    if (activeExisting) {
      throw new AppError(
        `You already have an active ticket (#${activeExisting.ticketNumber}) for this service`,
        409
      );
    }

    // Concurrency-safe atomic sequence increment and ticket creation
    return prisma.$transaction(async (tx) => {
      const updatedQueue = await tx.queue.update({
        where: { id: queue.id },
        data: { currentSequence: { increment: 1 } },
      });

      const seq = updatedQueue.currentSequence;
      const prefix = queue.prefix || service.code.slice(0, 2);
      const ticketNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

      // Count existing waiting tickets ahead
      const waitingAhead = await tx.queueTicket.count({
        where: {
          queueId: queue.id,
          status: TicketStatus.WAITING,
        },
      });

      const position = waitingAhead + 1;
      const estimatedWaitMinutes = position * service.estimatedDurationMinutes;
      const estimatedServiceTime = new Date(Date.now() + estimatedWaitMinutes * 60 * 1000);

      const ticket = await tx.queueTicket.create({
        data: {
          organizationId: service.organizationId,
          branchId: service.branchId,
          serviceId: service.id,
          queueId: queue.id,
          userId,
          customerName: data.customerName?.trim() || user.fullName,
          customerPhone: data.customerPhone?.trim() || user.phone,
          ticketNumber,
          sequenceNumber: seq,
          priorityScore: service.priorityLevel,
          status: TicketStatus.WAITING,
          estimatedServiceTime,
          verificationCode,
        },
        include: {
          service: true,
          branch: {
            include: { organization: true },
          },
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: TicketEventType.ISSUED,
          performedByUserId: userId,
          newStatus: TicketStatus.WAITING,
          metadata: { initialPosition: position, estimatedWaitMinutes },
        },
      });

      return {
        ...ticket,
        currentPosition: position,
        estimatedWaitMinutes,
      };
    });
  }

  static async getActiveTickets(userId: string) {
    const tickets = await prisma.queueTicket.findMany({
      where: {
        userId,
        status: { in: [TicketStatus.WAITING, TicketStatus.CALLED, TicketStatus.SERVING] },
      },
      include: {
        service: true,
        branch: {
          include: { organization: true },
        },
        counter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute dynamic position for each waiting ticket
    return Promise.all(
      tickets.map(async (t) => {
        if (t.status === TicketStatus.WAITING) {
          const ahead = await prisma.queueTicket.count({
            where: {
              queueId: t.queueId,
              status: TicketStatus.WAITING,
              sequenceNumber: { lt: t.sequenceNumber },
            },
          });
          const position = ahead + 1;
          const estimatedWaitMinutes = position * t.service.estimatedDurationMinutes;
          return { ...t, currentPosition: position, estimatedWaitMinutes };
        }
        return { ...t, currentPosition: 0, estimatedWaitMinutes: 0 };
      })
    );
  }

  static async getTicketHistory(userId: string) {
    return prisma.queueTicket.findMany({
      where: {
        userId,
        status: { in: [TicketStatus.COMPLETED, TicketStatus.CANCELLED, TicketStatus.SKIPPED] },
      },
      include: {
        service: true,
        branch: {
          include: { organization: true },
        },
        counter: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  static async getTicketById(ticketId: string, userId: string) {
    const ticket = await prisma.queueTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        service: true,
        branch: {
          include: { organization: true },
        },
        counter: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);

    let currentPosition = 0;
    let estimatedWaitMinutes = 0;

    if (ticket.status === TicketStatus.WAITING) {
      const ahead = await prisma.queueTicket.count({
        where: {
          queueId: ticket.queueId,
          status: TicketStatus.WAITING,
          sequenceNumber: { lt: ticket.sequenceNumber },
        },
      });
      currentPosition = ahead + 1;
      estimatedWaitMinutes = currentPosition * ticket.service.estimatedDurationMinutes;
    }

    return {
      ...ticket,
      currentPosition,
      estimatedWaitMinutes,
    };
  }

  static async cancelTicket(ticketId: string, userId: string, reason?: string) {
    const ticket = await prisma.queueTicket.findFirst({
      where: { id: ticketId, userId },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);

    if (ticket.status !== TicketStatus.WAITING && ticket.status !== TicketStatus.CALLED) {
      throw new AppError(`Cannot cancel a ticket in "${ticket.status}" status`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by customer',
        },
        include: { service: true, branch: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.CANCELLED,
          performedByUserId: userId,
          previousStatus: ticket.status,
          newStatus: TicketStatus.CANCELLED,
          metadata: { reason },
        },
      });

      return updated;
    });
  }
}
