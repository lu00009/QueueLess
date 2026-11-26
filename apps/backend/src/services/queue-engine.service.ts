import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { TicketStatus, TicketEventType, CounterStatus, NotificationType } from '@prisma/client';
import crypto from 'crypto';
import { NotificationService } from './notification.service';

export class QueueEngineService {
  /**
   * Concurrency-safe ticket generation using atomic sequence increment
   */
  static async generateTicket(data: {
    serviceId: string;
    userId?: string;
    customerName: string;
    customerPhone?: string;
    priorityOverride?: number;
  }) {
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { queues: true },
    });

    if (!service || !service.isActive) {
      throw new AppError('Service not found or inactive', 404);
    }

    if (service.queues.length === 0) {
      throw new AppError('No queue found for this service', 400);
    }

    const queue = service.queues[0];
    if (queue.status !== 'OPEN') {
      throw new AppError(`Queue is currently ${queue.status}`, 400);
    }

    // Atomic increment inside transaction
    return prisma.$transaction(async (tx) => {
      // Atomic increment on queue sequence
      const updatedQueue = await tx.queue.update({
        where: { id: queue.id },
        data: { currentSequence: { increment: 1 } },
      });

      const seq = updatedQueue.currentSequence;
      const prefix = queue.prefix || service.code.slice(0, 2);
      const ticketNumber = `${prefix}-${String(seq).padStart(3, '0')}`;
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const priorityScore = data.priorityOverride !== undefined ? data.priorityOverride : service.priorityLevel;

      // Estimate wait time using active counters
      const activeCountersCount = await tx.serviceCounter.count({
        where: {
          branchId: service.branchId,
          status: { in: [CounterStatus.IDLE, CounterStatus.SERVING] },
          supportedServices: { some: { serviceId: service.id } },
        },
      });

      const effectiveCounters = Math.max(1, activeCountersCount);
      const waitingAhead = await tx.queueTicket.count({
        where: {
          queueId: queue.id,
          status: TicketStatus.WAITING,
        },
      });

      const position = waitingAhead + 1;
      const estimatedWaitMinutes = Math.ceil((position * service.estimatedDurationMinutes) / effectiveCounters);
      const estimatedServiceTime = new Date(Date.now() + estimatedWaitMinutes * 60 * 1000);

      const ticket = await tx.queueTicket.create({
        data: {
          organizationId: service.organizationId,
          branchId: service.branchId,
          serviceId: service.id,
          queueId: queue.id,
          userId: data.userId,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone?.trim(),
          ticketNumber,
          sequenceNumber: seq,
          priorityScore,
          status: TicketStatus.WAITING,
          estimatedServiceTime,
          verificationCode,
        },
        include: { service: true, branch: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: TicketEventType.ISSUED,
          performedByUserId: data.userId,
          newStatus: TicketStatus.WAITING,
          metadata: { initialPosition: position, estimatedWaitMinutes, effectiveCounters },
        },
      });

      return {
        ...ticket,
        currentPosition: position,
        estimatedWaitMinutes,
      };
    });
  }

  /**
   * Concurrency-safe Call Next Ticket using PostgreSQL `FOR UPDATE SKIP LOCKED`
   * Prevents two staff members from being assigned the same ticket under high concurrency.
   */
  static async callNext(counterId: string, staffUserId: string) {
    const counter = await prisma.serviceCounter.findUnique({
      where: { id: counterId },
      include: { supportedServices: true },
    });

    if (!counter) throw new AppError('Counter not found', 404);

    // Get queue IDs for all services this counter is configured to serve
    const serviceIds = counter.supportedServices.map((s) => s.serviceId);
    let queues;
    if (serviceIds.length > 0) {
      queues = await prisma.queue.findMany({
        where: { serviceId: { in: serviceIds }, status: 'OPEN' },
      });
    } else {
      // If counter has no specific services assigned, serve any open queue in this branch
      queues = await prisma.queue.findMany({
        where: { branchId: counter.branchId, status: 'OPEN' },
      });
    }

    if (queues.length === 0) {
      throw new AppError('No open queues available for this counter', 400);
    }

    const queueIds = queues.map((q) => q.id);

    return prisma.$transaction(async (tx) => {
      // Atomic SELECT with FOR UPDATE SKIP LOCKED ordered by priorityScore DESC, sequenceNumber ASC
      const candidates: any = await tx.$queryRawUnsafe(`
        SELECT id FROM "QueueTicket"
        WHERE "queueId" = ANY($1::text[])
          AND status = 'WAITING'
        ORDER BY "priorityScore" DESC, "sequenceNumber" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `, queueIds);

      if (!candidates || candidates.length === 0) {
        throw new AppError('No waiting customers in queue for this counter', 400);
      }

      const nextTicketId = candidates[0].id;

      // Update ticket to CALLED
      const ticket = await tx.queueTicket.update({
        where: { id: nextTicketId },
        data: {
          status: TicketStatus.CALLED,
          counterId: counter.id,
          calledAt: new Date(),
        },
        include: { service: true, counter: true, branch: true },
      });

      // Update counter status to SERVING
      await tx.serviceCounter.update({
        where: { id: counter.id },
        data: {
          status: CounterStatus.SERVING,
          currentStaffId: staffUserId,
        },
      });

      // Update queue's currentServingTicketId
      await tx.queue.update({
        where: { id: ticket.queueId },
        data: { currentServingTicketId: ticket.id },
      });

      // Record lifecycle event
      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: TicketEventType.CALLED,
          performedByUserId: staffUserId,
          counterId: counter.id,
          previousStatus: TicketStatus.WAITING,
          newStatus: TicketStatus.CALLED,
          metadata: { counterNumber: counter.number, calledAt: ticket.calledAt },
        },
      });

      // Broadcast real-time ticket called event to Socket rooms
      NotificationService.broadcastTicketEvent({
        event: 'queue:ticket:called',
        ticket,
        extra: {
          counterNumber: counter.number,
          counterName: counter.name,
          calledAt: ticket.calledAt,
        },
      });

      // If customer has a registered account, notify them directly
      if (ticket.userId) {
        NotificationService.dispatchNotification({
          userId: ticket.userId,
          ticketId: ticket.id,
          type: NotificationType.CALLED,
          title: `You're Being Called!`,
          message: `Ticket ${ticket.ticketNumber} please proceed to Counter ${counter.number}.`,
          data: { counterNumber: counter.number, ticketNumber: ticket.ticketNumber },
        }).catch(() => {});
      }

      return ticket;
    });
  }

  /**
   * Call a specific eligible ticket (e.g. VIP or priority recall)
   */
  static async callSpecificTicket(counterId: string, ticketId: string, staffUserId: string) {
    const counter = await prisma.serviceCounter.findUnique({ where: { id: counterId } });
    if (!counter) throw new AppError('Counter not found', 404);

    return prisma.$transaction(async (tx) => {
      const candidates: any = await tx.$queryRawUnsafe(`
        SELECT id FROM "QueueTicket"
        WHERE id = $1
          AND status IN ('WAITING', 'SKIPPED')
        FOR UPDATE SKIP LOCKED
      `, ticketId);

      if (!candidates || candidates.length === 0) {
        throw new AppError('Ticket is not available to be called (may already be in progress or served)', 409);
      }

      const ticket = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CALLED,
          counterId: counter.id,
          calledAt: new Date(),
        },
        include: { service: true, counter: true, branch: true },
      });

      await tx.serviceCounter.update({
        where: { id: counter.id },
        data: {
          status: CounterStatus.SERVING,
          currentStaffId: staffUserId,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: TicketEventType.CALLED,
          performedByUserId: staffUserId,
          counterId: counter.id,
          newStatus: TicketStatus.CALLED,
        },
      });

      return ticket;
    });
  }

  /**
   * Customer arrives at desk -> Mark ticket as SERVING
   */
  static async startServing(ticketId: string, staffUserId: string) {
    const ticket = await prisma.queueTicket.findUnique({
      where: { id: ticketId },
      include: { counter: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.status !== TicketStatus.CALLED) {
      throw new AppError(`Cannot start serving a ticket with status "${ticket.status}". Expected "CALLED".`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.SERVING,
          servingStartedAt: new Date(),
        },
        include: { service: true, counter: true, branch: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.SERVING,
          performedByUserId: staffUserId,
          counterId: ticket.counterId,
          previousStatus: TicketStatus.CALLED,
          newStatus: TicketStatus.SERVING,
        },
      });

      NotificationService.broadcastTicketEvent({
        event: 'queue:ticket:serving',
        ticket: updated,
      });

      return updated;
    });
  }

  /**
   * Complete customer service -> Mark ticket as COMPLETED, revert counter to IDLE
   */
  static async completeTicket(ticketId: string, staffUserId: string) {
    const ticket = await prisma.queueTicket.findUnique({
      where: { id: ticketId },
      include: { counter: true, service: true },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.status !== TicketStatus.SERVING && ticket.status !== TicketStatus.CALLED) {
      throw new AppError(`Cannot complete ticket with status "${ticket.status}"`, 400);
    }

    const now = new Date();
    const durationSeconds = ticket.servingStartedAt
      ? Math.round((now.getTime() - ticket.servingStartedAt.getTime()) / 1000)
      : Math.round((now.getTime() - (ticket.calledAt || now).getTime()) / 1000);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.COMPLETED,
          completedAt: now,
        },
        include: { service: true, counter: true, branch: true },
      });

      // Free counter back to IDLE
      if (ticket.counterId) {
        await tx.serviceCounter.update({
          where: { id: ticket.counterId },
          data: { status: CounterStatus.IDLE },
        });
      }

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.COMPLETED,
          performedByUserId: staffUserId,
          counterId: ticket.counterId,
          previousStatus: ticket.status,
          newStatus: TicketStatus.COMPLETED,
          metadata: { durationSeconds },
        },
      });

      NotificationService.broadcastTicketEvent({
        event: 'queue:ticket:completed',
        ticket: updated,
        extra: { durationSeconds },
      });

      return {
        ...updated,
        durationSeconds,
      };
    });
  }

  /**
   * Skip a called customer if they do not appear at the counter
   */
  static async skipTicket(ticketId: string, staffUserId: string, reason?: string) {
    const ticket = await prisma.queueTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.status !== TicketStatus.CALLED) {
      throw new AppError(`Cannot skip a ticket in "${ticket.status}" status. Only CALLED tickets can be skipped.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.SKIPPED,
          skippedAt: new Date(),
          skipReason: reason || 'Customer did not show up',
        },
        include: { service: true, counter: true, branch: true },
      });

      // Free counter back to IDLE
      if (ticket.counterId) {
        await tx.serviceCounter.update({
          where: { id: ticket.counterId },
          data: { status: CounterStatus.IDLE },
        });
      }

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.SKIPPED,
          performedByUserId: staffUserId,
          counterId: ticket.counterId,
          previousStatus: TicketStatus.CALLED,
          newStatus: TicketStatus.SKIPPED,
          metadata: { reason: updated.skipReason },
        },
      });

      return updated;
    });
  }

  /**
   * Recall a previously skipped ticket back to CALLED
   */
  static async recallTicket(ticketId: string, staffUserId: string, counterId?: string) {
    const ticket = await prisma.queueTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new AppError('Ticket not found', 404);
    if (ticket.status !== TicketStatus.SKIPPED) {
      throw new AppError(`Cannot recall a ticket in "${ticket.status}" status. Only SKIPPED tickets can be recalled.`, 400);
    }

    const targetCounterId = counterId || ticket.counterId;
    if (!targetCounterId) throw new AppError('A valid counterId is required to recall the ticket', 400);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CALLED,
          counterId: targetCounterId,
          calledAt: new Date(),
        },
        include: { service: true, counter: true, branch: true },
      });

      await tx.serviceCounter.update({
        where: { id: targetCounterId },
        data: {
          status: CounterStatus.SERVING,
          currentStaffId: staffUserId,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          eventType: TicketEventType.RECALLED,
          performedByUserId: staffUserId,
          counterId: targetCounterId,
          previousStatus: TicketStatus.SKIPPED,
          newStatus: TicketStatus.CALLED,
        },
      });

      return updated;
    });
  }

  /**
   * Get queue statistics and operational metrics for staff console
   */
  static async getQueueStats(branchId: string, orgId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const whereBranch: any = { branchId };
    if (orgId) whereBranch.organizationId = orgId;

    const [waitingCount, servingCount, completedTodayCount, skippedTodayCount, completedToday] = await Promise.all([
      prisma.queueTicket.count({
        where: { ...whereBranch, status: TicketStatus.WAITING },
      }),
      prisma.queueTicket.count({
        where: { ...whereBranch, status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] } },
      }),
      prisma.queueTicket.count({
        where: { ...whereBranch, status: TicketStatus.COMPLETED, completedAt: { gte: todayStart } },
      }),
      prisma.queueTicket.count({
        where: { ...whereBranch, status: TicketStatus.SKIPPED, skippedAt: { gte: todayStart } },
      }),
      prisma.queueTicket.findMany({
        where: {
          ...whereBranch,
          status: TicketStatus.COMPLETED,
          completedAt: { gte: todayStart },
          servingStartedAt: { not: null },
        },
        select: { servingStartedAt: true, completedAt: true },
      }),
    ]);

    const totalSeconds = completedToday.reduce((acc, curr) => {
      if (curr.completedAt && curr.servingStartedAt) {
        return acc + Math.round((curr.completedAt.getTime() - curr.servingStartedAt.getTime()) / 1000);
      }
      return acc;
    }, 0);
    const avgServiceTimeSeconds = completedToday.length > 0 ? Math.round(totalSeconds / completedToday.length) : 0;

    return {
      waitingCount,
      servingCount,
      completedTodayCount,
      skippedTodayCount,
      avgServiceTimeSeconds,
      avgServiceTimeMinutes: Math.round(avgServiceTimeSeconds / 60),
    };
  }

  /**
   * Get recently skipped tickets eligible for recall
   */
  static async getSkippedTickets(branchId: string) {
    return prisma.queueTicket.findMany({
      where: {
        branchId,
        status: TicketStatus.SKIPPED,
      },
      include: {
        service: true,
        counter: true,
      },
      orderBy: { skippedAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Get ordered waiting list for a specific queue
   */
  static async getWaitingList(queueId: string) {
    return prisma.queueTicket.findMany({
      where: {
        queueId,
        status: TicketStatus.WAITING,
      },
      orderBy: [
        { priorityScore: 'desc' },
        { sequenceNumber: 'asc' },
      ],
      include: { service: true },
    });
  }

  /**
   * Get current active ticket for a counter
   */
  static async getCurrentCounterTicket(counterId: string) {
    return prisma.queueTicket.findFirst({
      where: {
        counterId,
        status: { in: [TicketStatus.CALLED, TicketStatus.SERVING] },
      },
      include: { service: true, branch: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
