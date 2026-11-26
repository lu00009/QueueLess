import { prisma } from '../src/config/database';
import { QueueEngineService } from '../src/services/queue-engine.service';
import { TicketStatus, CounterStatus } from '@prisma/client';

describe('Milestone 6: Concurrency-Safe Queue Engine Tests', () => {
  let branchId: string;
  let serviceId: string;
  let queueId: string;
  let counterAId: string;
  let counterBId: string;
  let counterCId: string;
  let staffUserId: string;

  beforeAll(async () => {
    const staff = await prisma.user.findUnique({ where: { email: 'staff@metrohealth.com' } });
    staffUserId = staff!.id;

    // Get Metro Health Main Campus & General service
    const service = await prisma.service.findFirst({
      where: { code: 'GEN' },
      include: { branch: true, queues: true },
    });
    serviceId = service!.id;
    branchId = service!.branchId;
    queueId = service!.queues[0].id;

    // Create 3 isolated test counters
    const counterA = await prisma.serviceCounter.create({
      data: {
        organizationId: service!.organizationId,
        branchId,
        name: 'Test Desk 1',
        number: `T1_${Date.now()}`,
        status: CounterStatus.IDLE,
      },
    });
    const counterB = await prisma.serviceCounter.create({
      data: {
        organizationId: service!.organizationId,
        branchId,
        name: 'Test Desk 2',
        number: `T2_${Date.now()}`,
        status: CounterStatus.IDLE,
      },
    });
    const counterC = await prisma.serviceCounter.create({
      data: {
        organizationId: service!.organizationId,
        branchId,
        name: 'Test Desk 3',
        number: `T3_${Date.now()}`,
        status: CounterStatus.IDLE,
      },
    });

    counterAId = counterA.id;
    counterBId = counterB.id;
    counterCId = counterC.id;

    // Map test counters to the service
    await prisma.counterServiceAssignment.createMany({
      data: [
        { counterId: counterAId, serviceId },
        { counterId: counterBId, serviceId },
        { counterId: counterCId, serviceId },
      ],
    });

    // Clean up any remaining waiting tickets in this queue before test
    await prisma.queueTicket.deleteMany({
      where: { queueId },
    });
  });

  afterAll(async () => {
    await prisma.queueTicket.deleteMany({ where: { queueId } });
    await prisma.counterServiceAssignment.deleteMany({
      where: { counterId: { in: [counterAId, counterBId, counterCId] } },
    });
    await prisma.serviceCounter.deleteMany({
      where: { id: { in: [counterAId, counterBId, counterCId] } },
    });
    await prisma.$disconnect();
  });

  test('1. High-concurrency ticket generation: 20 simultaneous requests yield strictly consecutive sequences with zero duplicates', async () => {
    const concurrentRequests = 20;

    // Fire 20 ticket generation requests simultaneously
    const promises = Array.from({ length: concurrentRequests }, (_, i) =>
      QueueEngineService.generateTicket({
        serviceId,
        customerName: `Concurrent Customer ${i + 1}`,
      })
    );

    const results = await Promise.all(promises);

    expect(results.length).toBe(concurrentRequests);

    // Verify all ticket IDs are unique
    const uniqueIds = new Set(results.map((t) => t.id));
    expect(uniqueIds.size).toBe(concurrentRequests);

    // Verify all sequence numbers are unique
    const sequences = results.map((t) => t.sequenceNumber).sort((a, b) => a - b);
    const uniqueSequences = new Set(sequences);
    expect(uniqueSequences.size).toBe(concurrentRequests);

    // Verify strictly consecutive sequence numbers (each diff is exactly 1)
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBe(sequences[i - 1] + 1);
    }
  });

  test('2. Priority queue ordering: High-priority ticket is called before low-priority ticket regardless of arrival time', async () => {
    // Clear queue for isolated priority test
    await prisma.queueTicket.deleteMany({ where: { queueId } });

    // 1. Issue low priority ticket (priorityScore: 1)
    const lowPrio = await QueueEngineService.generateTicket({
      serviceId,
      customerName: 'Low Priority Customer',
      priorityOverride: 1,
    });

    // 2. Issue high priority ticket after low priority (priorityScore: 3)
    const highPrio = await QueueEngineService.generateTicket({
      serviceId,
      customerName: 'Emergency VIP Customer',
      priorityOverride: 3,
    });

    // 3. Issue normal priority ticket (priorityScore: 2)
    const normalPrio = await QueueEngineService.generateTicket({
      serviceId,
      customerName: 'Standard Customer',
      priorityOverride: 2,
    });

    // Ensure low priority has an earlier sequence number than high priority
    expect(lowPrio.sequenceNumber).toBeLessThan(highPrio.sequenceNumber);

    // Call next ticket at Counter A -> Must be the HIGH priority ticket!
    const firstCalled = await QueueEngineService.callNext(counterAId, staffUserId);
    expect(firstCalled.id).toBe(highPrio.id);
    expect(firstCalled.priorityScore).toBe(3);

    // Complete it to free counter
    await QueueEngineService.completeTicket(firstCalled.id, staffUserId);

    // Call next ticket at Counter A -> Must be the NORMAL priority ticket!
    const secondCalled = await QueueEngineService.callNext(counterAId, staffUserId);
    expect(secondCalled.id).toBe(normalPrio.id);
    expect(secondCalled.priorityScore).toBe(2);

    await QueueEngineService.completeTicket(secondCalled.id, staffUserId);

    // Call next ticket at Counter A -> Finally the LOW priority ticket!
    const thirdCalled = await QueueEngineService.callNext(counterAId, staffUserId);
    expect(thirdCalled.id).toBe(lowPrio.id);
    expect(thirdCalled.priorityScore).toBe(1);

    await QueueEngineService.completeTicket(thirdCalled.id, staffUserId);
  });

  test('3. High-concurrency ticket calling with SKIP LOCKED: 3 counters calling simultaneously never receive duplicate tickets', async () => {
    await prisma.queueTicket.deleteMany({ where: { queueId } });

    // Generate 6 waiting tickets
    for (let i = 1; i <= 6; i++) {
      await QueueEngineService.generateTicket({
        serviceId,
        customerName: `Batch Customer ${i}`,
      });
    }

    // Counters A, B, and C call next simultaneously
    const callPromises = [
      QueueEngineService.callNext(counterAId, staffUserId),
      QueueEngineService.callNext(counterBId, staffUserId),
      QueueEngineService.callNext(counterCId, staffUserId),
    ];

    const calledTickets = await Promise.all(callPromises);

    expect(calledTickets.length).toBe(3);

    // Verify all 3 called tickets are distinct
    const calledIds = new Set(calledTickets.map((t) => t.id));
    expect(calledIds.size).toBe(3);

    // Verify each counter has status SERVING
    const counters = await prisma.serviceCounter.findMany({
      where: { id: { in: [counterAId, counterBId, counterCId] } },
    });
    for (const c of counters) {
      expect(c.status).toBe(CounterStatus.SERVING);
    }
  });

  test('4. Complete ticket lifecycle transitions: WAITING -> CALLED -> SERVING -> COMPLETED', async () => {
    await prisma.queueTicket.deleteMany({ where: { queueId } });

    // Free Counter A
    await prisma.serviceCounter.update({
      where: { id: counterAId },
      data: { status: CounterStatus.IDLE },
    });

    const ticket = await QueueEngineService.generateTicket({
      serviceId,
      customerName: 'Lifecycle Customer',
    });
    expect(ticket.status).toBe(TicketStatus.WAITING);

    // Step 1: Staff calls ticket
    const called = await QueueEngineService.callNext(counterAId, staffUserId);
    expect(called.id).toBe(ticket.id);
    expect(called.status).toBe(TicketStatus.CALLED);
    expect(called.calledAt).toBeDefined();

    // Step 2: Customer arrives -> Start serving
    const serving = await QueueEngineService.startServing(called.id, staffUserId);
    expect(serving.status).toBe(TicketStatus.SERVING);
    expect(serving.servingStartedAt).toBeDefined();

    // Step 3: Complete service
    const completed = await QueueEngineService.completeTicket(serving.id, staffUserId);
    expect(completed.status).toBe(TicketStatus.COMPLETED);
    expect(completed.completedAt).toBeDefined();
    expect(completed.durationSeconds).toBeGreaterThanOrEqual(0);

    // Verify Counter A returned to IDLE
    const counterAfter = await prisma.serviceCounter.findUnique({ where: { id: counterAId } });
    expect(counterAfter?.status).toBe(CounterStatus.IDLE);
  });

  test('5. Skip and Recall lifecycle: CALLED -> SKIPPED -> RECALLED back to CALLED', async () => {
    await prisma.queueTicket.deleteMany({ where: { queueId } });

    await prisma.serviceCounter.update({
      where: { id: counterAId },
      data: { status: CounterStatus.IDLE },
    });

    await QueueEngineService.generateTicket({
      serviceId,
      customerName: 'No-show Customer',
    });

    // Call ticket
    const called = await QueueEngineService.callNext(counterAId, staffUserId);
    expect(called.status).toBe(TicketStatus.CALLED);

    // Customer fails to appear -> Skip ticket
    const skipped = await QueueEngineService.skipTicket(called.id, staffUserId, 'No response at counter');
    expect(skipped.status).toBe(TicketStatus.SKIPPED);
    expect(skipped.skipReason).toBe('No response at counter');

    // Verify Counter A freed back to IDLE
    const counterAfterSkip = await prisma.serviceCounter.findUnique({ where: { id: counterAId } });
    expect(counterAfterSkip?.status).toBe(CounterStatus.IDLE);

    // Customer arrives late -> Recall ticket
    const recalled = await QueueEngineService.recallTicket(skipped.id, staffUserId, counterAId);
    expect(recalled.status).toBe(TicketStatus.CALLED);
    expect(recalled.counterId).toBe(counterAId);

    // Verify Counter A is back to SERVING
    const counterAfterRecall = await prisma.serviceCounter.findUnique({ where: { id: counterAId } });
    expect(counterAfterRecall?.status).toBe(CounterStatus.SERVING);

    // Clean up
    await QueueEngineService.completeTicket(recalled.id, staffUserId);
  });
});
