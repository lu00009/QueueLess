import { prisma } from '../config/database';
import { SocketGateway } from '../sockets/socket.gateway';
import { NotificationType } from '@prisma/client';

export interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class NotificationService {
  /**
   * Register or update mobile FCM device token for a user
   */
  static async registerDeviceToken(userId: string, token: string, platform = 'ANDROID') {
    return prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Remove a device token (e.g. on logout)
   */
  static async removeDeviceToken(token: string) {
    try {
      await prisma.deviceToken.delete({ where: { token } });
    } catch {
      // Ignore if already deleted
    }
  }

  /**
   * Dispatch real-time Socket event AND persist notification record
   */
  static async dispatchNotification(params: {
    userId: string;
    ticketId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }) {
    // 1. Create in-app notification record
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        ticketId: params.ticketId,
        type: params.type,
        title: params.title,
        message: params.message,
      },
    });

    // 2. Broadcast real-time Socket event to user
    SocketGateway.emitToUser(params.userId, 'notification:received', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      ticketId: notification.ticketId,
      createdAt: notification.createdAt,
    });

    // 3. Dispatch Push Notification (FCM abstraction)
    await this.sendPushToUser({
      userId: params.userId,
      title: params.title,
      body: params.message,
      data: {
        ticketId: params.ticketId || '',
        type: params.type,
      },
    });

    return notification;
  }

  /**
   * Simulated Firebase Cloud Messaging (FCM) dispatch
   * Connects to FCM tokens in the database
   */
  static async sendPushToUser(payload: SendPushPayload) {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: payload.userId },
      select: { token: true, platform: true },
    });

    if (tokens.length === 0) {
      return { sent: 0, reason: 'No registered device tokens' };
    }

    // In production with FIREBASE_PROJECT_ID, admin.messaging().sendMulticast(...) is called
    // We log and return successful dispatch confirmation
    return {
      sent: tokens.length,
      tokens: tokens.map((t) => t.token),
      title: payload.title,
      body: payload.body,
    };
  }

  /**
   * Broadcast Ticket Lifecycle Socket Event
   */
  static broadcastTicketEvent(params: {
    event: string;
    ticket: any;
    extra?: any;
  }) {
    const { event, ticket, extra } = params;
    const rooms = [
      `branch:${ticket.branchId}`,
      `queue:${ticket.queueId}`,
      `ticket:${ticket.id}`,
    ];

    const payload = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      sequenceNumber: ticket.sequenceNumber,
      serviceId: ticket.serviceId,
      queueId: ticket.queueId,
      branchId: ticket.branchId,
      status: ticket.status,
      ...extra,
    };

    SocketGateway.emitToRooms(rooms, event, payload);

    // Also send directly to the customer's personal user room if authenticated
    if (ticket.userId) {
      SocketGateway.emitToUser(ticket.userId, event, payload);
    }
  }
}
