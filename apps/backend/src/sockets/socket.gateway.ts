import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { TokenPayload } from '../utils/jwt';

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export class SocketGateway {
  private static io: SocketIOServer | null = null;

  public static initialize(io: SocketIOServer) {
    this.io = io;

    // Authentication Middleware for incoming Socket connections
    io.use((socket: AuthenticatedSocket, next) => {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!authHeader) {
        // Allow anonymous connection for public display monitors if necessary, otherwise require token
        return next();
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

      try {
        const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET) as TokenPayload;
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
    });

    // Connection Handler
    io.on('connection', (socket: AuthenticatedSocket) => {
      const userId = socket.user?.userId;
      if (userId) {
        // Automatically join private user room
        socket.join(`user:${userId}`);
      }

      // Room join handler with authorization checks
      socket.on('room:join', ({ room }: { room: string }) => {
        if (!room) return;

        // Allow public queue & branch subscriptions, or enforce user matching
        if (room.startsWith('user:')) {
          if (room !== `user:${userId}`) {
            socket.emit('error', { message: 'Unauthorized room subscription' });
            return;
          }
        }

        socket.join(room);
        socket.emit('room:joined', { room });
      });

      // Room leave handler
      socket.on('room:leave', ({ room }: { room: string }) => {
        if (room) {
          socket.leave(room);
          socket.emit('room:left', { room });
        }
      });

      socket.on('disconnect', () => {
        // Socket cleaned up automatically
      });
    });
  }

  public static getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast an event to specific rooms
   */
  public static emitToRooms(rooms: string | string[], event: string, payload: any) {
    if (!this.io) return;
    const roomList = Array.isArray(rooms) ? rooms : [rooms];
    let emitter: any = this.io;
    for (const room of roomList) {
      emitter = emitter.to(room);
    }
    emitter.emit(event, payload);
  }

  /**
   * Direct emit to a specific user
   */
  public static emitToUser(userId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  /**
   * Direct emit to a specific ticket channel
   */
  public static emitToTicket(ticketId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`ticket:${ticketId}`).emit(event, payload);
  }
}
