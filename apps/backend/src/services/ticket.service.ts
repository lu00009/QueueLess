import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { TicketStatus, TicketEventType } from '@prisma/client';
import crypto from 'crypto';

export class TicketService {
  static async joinQueue(userId: string, data: { serviceId: string; customerName?: string | null; customerPhone?: string | null }) {
    // 1. Fetch Service and its Branch
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { branch: true },
    });

    if (!service) throw new AppError('Service not found', 404);
    if (!service.isActive) throw new AppError('Service is currently inactive', 400);

    // 2. Fetch User
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new AppError('User not found', 404);

    // 3. Find open Queue for this service
    const queue = await prisma.queue.findFirst({
      where: {
        serviceId: service.id,
        branchId: service.branchId,
        status: 'OPEN',
      },
    });

    if (!queue) throw new AppError('No open queue available for this service at this time', 400);

    // 4. Generate Verification Code & Next Sequence Number within Transaction
    return prisma.$transaction(async (tx) => {
      // Find highest sequence number today for this queue
      const lastTicket = await tx.queueTicket.findFirst({
        where: { queueId: queue.id },
        orderBy: { sequenceNumber: 'desc' },
      });

      const nextSequence = (lastTicket?.sequenceNumber || 0) + 1;
      const ticketNumber = `${service.code}-${String(nextSequence).padStart(3, '0')}`;
      const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

      // Check max daily limit if set
      if (service.maxDailyTickets && nextSequence > service.maxDailyTickets) {
        throw new AppError('Daily ticket capacity reached for this service', 400);
      }

      // Check if user already has an active ticket for this service
      const existingTicket = await tx.queueTicket.findFirst({
        where: {
          userId,
          serviceId: service.id,
          status: { in: [TicketStatus.WAITING, TicketStatus.CALLED, TicketStatus.SERVING] },
        },
      });

      if (existingTicket) {
        throw new AppError('You already have an active ticket for this service', 409);
      }

      // Create ticket
      const ticket = await tx.queueTicket.create({
        data: {
          organizationId: service.organizationId,
          branchId: service.branchId,
          serviceId: service.id,
          queueId: queue.id,
          userId,
          customerName: data.customerName || user.fullName,
          customerPhone: data.customerPhone || user.phone,
          ticketNumber,
          sequenceNumber: nextSequence,
          priorityScore: service.priorityLevel,
          status: TicketStatus.WAITING,
          verificationCode,
        },
        include: {
          service: true,
          branch: {
            include: { organization: true },
          },
        },
      });

      // Record Ticket Event
      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: TicketEventType.ISSUED,
          performedByUserId: userId,
          newStatus: TicketStatus.WAITING,
          metadata: { channel: 'MOBILE_APP' },
        },
      });

      // Calculate initial position & estimated wait
      const aheadCount = await tx.queueTicket.count({
        where: {
          queueId: queue.id,
          status: TicketStatus.WAITING,
          sequenceNumber: { lt: nextSequence },
        },
      });

      const position = aheadCount + 1;
      const estimatedWaitMinutes = position * service.estimatedDurationMinutes;

      // Update estimatedServiceTime
      const estTime = new Date();
      estTime.setMinutes(estTime.getMinutes() + estimatedWaitMinutes);

      await tx.queueTicket.update({
        where: { id: ticket.id },
        data: { estimatedServiceTime: estTime },
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
          const duration = t.service?.estimatedDurationMinutes || 15;
          const estimatedWaitMinutes = position * duration;
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
      where: {
        OR: [
          { id: ticketId },
          { ticketNumber: ticketId },
          { verificationCode: ticketId },
        ],
      },
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
      const duration = ticket.service?.estimatedDurationMinutes || 15;
      estimatedWaitMinutes = currentPosition * duration;
    }

    return {
      ...ticket,
      currentPosition,
      estimatedWaitMinutes,
    };
  }

  static async cancelTicket(ticketId: string, userId: string, reason?: string | null) {
    const ticket = await prisma.queueTicket.findFirst({
      where: {
        OR: [
          { id: ticketId },
          { ticketNumber: ticketId },
          { verificationCode: ticketId },
        ],
      },
    });

    if (!ticket) throw new AppError('Ticket not found', 404);

    // If ticket has a userId, only the customer owner or org staff/admin can cancel it
    if (ticket.userId && ticket.userId !== userId) {
      const membership = await prisma.organizationMembership.findFirst({
        where: { userId, organizationId: ticket.organizationId },
      });
      if (!membership) {
        throw new AppError('You are not authorized to cancel this ticket', 403);
      }
    }

    if (ticket.status !== TicketStatus.WAITING && ticket.status !== TicketStatus.CALLED) {
      throw new AppError(`Cannot cancel a ticket in "${ticket.status}" status`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.queueTicket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by customer',
        },
        include: { service: true, branch: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
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
