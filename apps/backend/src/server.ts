import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { ENV } from './config/env';
import { connectDatabase, prisma } from './config/database';

import { SocketGateway } from './sockets/socket.gateway';

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO with auth and rooms gateway
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  SocketGateway.initialize(io);

  // Connect to Database
  await connectDatabase();

  server.listen(ENV.PORT, () => {
    console.log(`🚀 QueueLess Backend API running on http://localhost:${ENV.PORT}`);
    console.log(`📡 Health check available at http://localhost:${ENV.PORT}/api/v1/health`);
    console.log(`⚡ Socket.IO initialized`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Stopping server gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database connection closed. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
