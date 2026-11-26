import { prisma } from '../src/config/database';
import { TicketService } from '../src/services/ticket.service';
import { TicketStatus } from '@prisma/client';

describe('Milestone 5: Customer Tickets API Tests', () => {
  let customerUserId: string;
  let serviceId: string;
  let generatedTicketId: string;

  beforeAll(async () => {
    const customer = await prisma.user.findUnique({ where: { email: 'customer@example.com' } });
    customerUserId = customer!.id;

    const service = await prisma.service.findFirst({
      where: { code: 'GEN' },
      include: { queues: true },
    });
    serviceId = service!.id;

    // Clean up any old active tickets for clean test run
    await prisma.queueTicket.deleteMany({
      where: { userId: customerUserId, serviceId },
    });
  });

  afterAll(async () => {
    await prisma.queueTicket.deleteMany({
      where: { userId: customerUserId, serviceId },
    });
    await prisma.$disconnect();
  });

  test('1. Customer joins queue and receives digital ticket with position & wait time', async () => {
    const ticket = await TicketService.joinQueue(customerUserId, {
      serviceId,
      customerName: 'John Doe',
    });

    expect(ticket).toBeDefined();
    expect(ticket.ticketNumber).toMatch(/^GE-\d{3}$/);
    expect(ticket.status).toBe(TicketStatus.WAITING);
    expect(ticket.currentPosition).toBe(1);
    expect(ticket.estimatedWaitMinutes).toBeGreaterThanOrEqual(15);
    expect(ticket.verificationCode.length).toBe(6);

    generatedTicketId = ticket.id;
  });

  test('2. Rejects duplicate active ticket for the same service', async () => {
    await expect(
      TicketService.joinQueue(customerUserId, {
        serviceId,
      })
    ).rejects.toThrow('You already have an active ticket');
  });

  test('3. Fetches customer active tickets with dynamic queue position', async () => {
    const activeTickets = await TicketService.getActiveTickets(customerUserId);
    expect(activeTickets.length).toBeGreaterThan(0);
    const myTicket = activeTickets.find((t) => t.id === generatedTicketId);
    expect(myTicket).toBeDefined();
    expect(myTicket?.status).toBe(TicketStatus.WAITING);
    expect(myTicket?.currentPosition).toBe(1);
  });

  test('4. Fetches ticket details by ID', async () => {
    const ticket = await TicketService.getTicketById(generatedTicketId, customerUserId);
    expect(ticket.id).toBe(generatedTicketId);
    expect(ticket.service.name).toBe('General Consultation');
    expect(ticket.events.length).toBeGreaterThan(0);
  });

  test('5. Customer cancels active ticket with reason', async () => {
    const cancelled = await TicketService.cancelTicket(
      generatedTicketId,
      customerUserId,
      'Changed schedule'
    );
    expect(cancelled.status).toBe(TicketStatus.CANCELLED);
    expect(cancelled.cancelReason).toBe('Changed schedule');

    // Verify it is no longer in active tickets
    const activeAfter = await TicketService.getActiveTickets(customerUserId);
    expect(activeAfter.some((t) => t.id === generatedTicketId)).toBe(false);

    // Verify it appears in ticket history
    const history = await TicketService.getTicketHistory(customerUserId);
    expect(history.some((t) => t.id === generatedTicketId)).toBe(true);
  });
});
