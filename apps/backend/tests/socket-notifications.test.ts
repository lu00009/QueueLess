import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import ioClient, { Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app';
import { SocketGateway } from '../src/sockets/socket.gateway';
import { NotificationService } from '../src/services/notification.service';
import { prisma } from '../src/config/database';
import jwt from 'jsonwebtoken';
import { ENV } from '../src/config/env';
import { UserRole } from '@queueless/shared-types';
import { NotificationType } from '@prisma/client';

describe('Milestone 9: Real-Time Socket.IO & Push Notifications Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let testUserToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // 1. Setup ephemeral test HTTP + Socket.IO server
    const app = createApp();
    server = http.createServer(app);
    const io = new SocketIOServer(server, { cors: { origin: '*' } });
    SocketGateway.initialize(io);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    // 2. Fetch or create a test user
    const user = await prisma.user.findFirst({ where: { email: 'customer@example.com' } });
    testUserId = user!.id;
    testUserToken = jwt.sign(
      { userId: testUserId, email: user!.email, role: UserRole.CUSTOMER },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.deviceToken.deleteMany({ where: { userId: testUserId } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  test('1. Client connects to Socket.IO gateway with JWT and joins user room automatically', (done) => {
    const client: ClientSocket = ioClient(`http://localhost:${serverPort}`, {
      auth: { token: `Bearer ${testUserToken}` },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });

    client.on('connect_error', (err) => {
      done(err);
    });
  });

  test('2. Client subscribes to branch and queue rooms', (done) => {
    const client: ClientSocket = ioClient(`http://localhost:${serverPort}`, {
      auth: { token: `Bearer ${testUserToken}` },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      client.emit('room:join', { room: 'branch:test-branch-1' });
    });

    client.on('room:joined', (data) => {
      expect(data.room).toBe('branch:test-branch-1');
      client.disconnect();
      done();
    });
  });

  test('3. Registers FCM device token for mobile push notifications', async () => {
    const tokenRecord = await NotificationService.registerDeviceToken(
      testUserId,
      'fcm-mock-device-token-123456789',
      'ANDROID'
    );

    expect(tokenRecord).toBeDefined();
    expect(tokenRecord.token).toBe('fcm-mock-device-token-123456789');
    expect(tokenRecord.platform).toBe('ANDROID');

    // Verify token exists in database
    const dbToken = await prisma.deviceToken.findUnique({
      where: { token: 'fcm-mock-device-token-123456789' },
    });
    expect(dbToken).not.toBeNull();
  });

  test('4. Dispatches in-app notification and emits real-time event to connected user', (done) => {
    const client: ClientSocket = ioClient(`http://localhost:${serverPort}`, {
      auth: { token: `Bearer ${testUserToken}` },
      transports: ['websocket'],
    });

    client.on('connect', async () => {
      // Listen for notification event
      client.on('notification:received', (notification) => {
        expect(notification.title).toBe('Your Turn is Approaching!');
        expect(notification.message).toContain('Please head towards the counter');
        expect(notification.type).toBe(NotificationType.TURN_APPROACHING);
        client.disconnect();
        done();
      });

      // Trigger dispatchNotification
      await NotificationService.dispatchNotification({
        userId: testUserId,
        type: NotificationType.TURN_APPROACHING,
        title: 'Your Turn is Approaching!',
        message: 'Please head towards the counter area.',
      });
    });
  });

  test('5. Broadcasts ticket called event to room subscribers', (done) => {
    const client: ClientSocket = ioClient(`http://localhost:${serverPort}`, {
      auth: { token: `Bearer ${testUserToken}` },
      transports: ['websocket'],
    });

    const mockBranchId = 'branch-realtime-test';
    const mockQueueId = 'queue-realtime-test';

    client.on('connect', () => {
      client.emit('room:join', { room: `branch:${mockBranchId}` });
    });

    client.on('room:joined', () => {
      NotificationService.broadcastTicketEvent({
        event: 'queue:ticket:called',
        ticket: {
          id: 'ticket-999',
          ticketNumber: 'GE-099',
          sequenceNumber: 99,
          serviceId: 'srv-1',
          queueId: mockQueueId,
          branchId: mockBranchId,
          status: 'CALLED',
        },
        extra: { counterNumber: '02' },
      });
    });

    client.on('queue:ticket:called', (payload) => {
      expect(payload.ticketId).toBe('ticket-999');
      expect(payload.ticketNumber).toBe('GE-099');
      expect(payload.counterNumber).toBe('02');
      client.disconnect();
      done();
    });
  });
});
