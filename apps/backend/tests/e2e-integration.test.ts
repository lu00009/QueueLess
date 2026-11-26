import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { UserRole, OrgRole, TicketStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

describe('Milestone 11: End-to-End Integration & Multi-Tenant QA Test Suite', () => {
  const app = createApp();

  // Test Entities
  let metroOrgId: string;
  let bankOrgId: string;

  let metroAdminToken: string;
  let metroStaffToken: string;
  let bankStaffToken: string;
  let customerToken: string;
  let customerUserId: string;

  let branchId: string;
  let serviceId: string;
  let queueId: string;
  let counterAId: string;
  let counterBId: string;

  beforeAll(async () => {
    // 0. Pre-clean any existing E2E records to ensure idempotent test runs
    await prisma.ticketEvent.deleteMany({ where: { ticket: { branch: { code: { startsWith: 'E2E' } } } } });
    await prisma.queueTicket.deleteMany({ where: { branch: { code: { startsWith: 'E2E' } } } });
    await prisma.counterServiceAssignment.deleteMany({ where: { counter: { branch: { code: { startsWith: 'E2E' } } } } });
    await prisma.serviceCounter.deleteMany({ where: { branch: { code: { startsWith: 'E2E' } } } });
    await prisma.queueConfiguration.deleteMany({ where: { queue: { branch: { code: { startsWith: 'E2E' } } } } });
    await prisma.queue.deleteMany({ where: { branch: { code: { startsWith: 'E2E' } } } });
    await prisma.service.deleteMany({ where: { branch: { code: { startsWith: 'E2E' } } } });
    await prisma.operatingHour.deleteMany({ where: { branch: { code: { startsWith: 'E2E' } } } });
    await prisma.branch.deleteMany({ where: { code: { startsWith: 'E2E' } } });

    // 1. Fetch seeded organizations
    const metroOrg = await prisma.organization.findUnique({ where: { slug: 'metro-health' } });
    const bankOrg = await prisma.organization.findUnique({ where: { slug: 'city-bank' } });
    metroOrgId = metroOrg!.id;
    bankOrgId = bankOrg!.id;

    // 2. Fetch or create users with known credentials
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Metro Admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'e2e-admin@metrohealth.org' },
      update: {},
      create: {
        email: 'e2e-admin@metrohealth.org',
        passwordHash,
        fullName: 'E2E Metro Admin',
        role: UserRole.CUSTOMER,
      },
    });
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: adminUser.id, organizationId: metroOrgId } },
      update: {},
      create: { userId: adminUser.id, organizationId: metroOrgId, role: OrgRole.ORG_ADMIN },
    });

    // Metro Staff
    const staffUser = await prisma.user.upsert({
      where: { email: 'e2e-staff@metrohealth.org' },
      update: {},
      create: {
        email: 'e2e-staff@metrohealth.org',
        passwordHash,
        fullName: 'E2E Metro Staff',
        role: UserRole.CUSTOMER,
      },
    });
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: staffUser.id, organizationId: metroOrgId } },
      update: {},
      create: { userId: staffUser.id, organizationId: metroOrgId, role: OrgRole.ORG_STAFF },
    });

    // Bank Staff (Different Tenant)
    const bankStaffUser = await prisma.user.upsert({
      where: { email: 'e2e-staff@citybank.com' },
      update: {},
      create: {
        email: 'e2e-staff@citybank.com',
        passwordHash,
        fullName: 'E2E Bank Staff',
        role: UserRole.CUSTOMER,
      },
    });
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: bankStaffUser.id, organizationId: bankOrgId } },
      update: {},
      create: { userId: bankStaffUser.id, organizationId: bankOrgId, role: OrgRole.ORG_STAFF },
    });

    // Customer
    const customerUser = await prisma.user.upsert({
      where: { email: 'e2e-customer@example.com' },
      update: {},
      create: {
        email: 'e2e-customer@example.com',
        passwordHash,
        fullName: 'E2E Customer Test',
        role: UserRole.CUSTOMER,
      },
    });
    customerUserId = customerUser.id;

    // Log in to obtain tokens
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-admin@metrohealth.org',
      password: 'Password@123',
    });
    metroAdminToken = adminLogin.body.data.accessToken;

    const staffLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-staff@metrohealth.org',
      password: 'Password@123',
    });
    metroStaffToken = staffLogin.body.data.accessToken;

    const bankLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-staff@citybank.com',
      password: 'Password@123',
    });
    bankStaffToken = bankLogin.body.data.accessToken;

    const customerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'e2e-customer@example.com',
      password: 'Password@123',
    });
    customerToken = customerLogin.body.data.accessToken;

    // Set up dedicated test branch, service, counters
    const branchRes = await request(app)
      .post(`/api/v1/organizations/${metroOrgId}/branches`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({
        name: 'E2E Test Hospital Branch',
        code: 'E2E',
        address: '999 QA Boulevard',
      });
    branchId = branchRes.body.data.id;

    const serviceRes = await request(app)
      .post(`/api/v1/branches/${branchId}/services`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({
        name: 'E2E Cardiology Clinic',
        code: 'CARD',
        estimatedDurationMinutes: 12,
        priorityLevel: 1,
      });
    serviceId = serviceRes.body.data.id;

    const queue = await prisma.queue.findFirst({ where: { serviceId } });
    queueId = queue!.id;

    const counter1Res = await request(app)
      .post(`/api/v1/branches/${branchId}/counters`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({
        name: 'E2E Counter 1',
        number: 'E1',
      });
    counterAId = counter1Res.body.data.id;

    const counter2Res = await request(app)
      .post(`/api/v1/branches/${branchId}/counters`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({
        name: 'E2E Counter 2',
        number: 'E2',
      });
    counterBId = counter2Res.body.data.id;

    // Bind counters to service
    await request(app)
      .put(`/api/v1/counters/${counterAId}/services`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({ serviceIds: [serviceId] });

    await request(app)
      .put(`/api/v1/counters/${counterBId}/services`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId)
      .send({ serviceIds: [serviceId] });
  });

  afterAll(async () => {
    // Cleanup QA test data safely in proper child-to-parent order
    if (branchId) {
      // 1. Delete events of tickets in this branch or queues
      await prisma.ticketEvent.deleteMany({
        where: {
          OR: [
            { ticket: { branchId } },
            { ticket: { queueId } },
          ],
        },
      });
      // 2. Delete notifications
      await prisma.notification.deleteMany({
        where: { user: { email: { contains: 'e2e-' } } },
      });
      // 3. Delete all queue tickets
      await prisma.queueTicket.deleteMany({
        where: {
          OR: [
            { branchId },
            { queueId },
          ],
        },
      });
      // 4. Delete counter service assignments & counters
      await prisma.counterServiceAssignment.deleteMany({ where: { counter: { branchId } } });
      await prisma.serviceCounter.deleteMany({ where: { branchId } });
      // 5. Delete queue configs and queues
      await prisma.queueConfiguration.deleteMany({ where: { queueId } });
      await prisma.queue.deleteMany({ where: { serviceId } });
      // 6. Delete services and branch
      await prisma.service.deleteMany({ where: { branchId } });
      await prisma.operatingHour.deleteMany({ where: { branchId } });
      await prisma.branch.delete({ where: { id: branchId } }).catch(() => {});
    }
    await prisma.organizationMembership.deleteMany({
      where: { user: { email: { contains: 'e2e-' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-' } },
    });
    await prisma.$disconnect();
  });

  test('1. Full End-to-End Customer Journey: Discovery -> Queue Join -> Staff Call -> Serve -> Complete', async () => {
    // Step 1: Customer discovers branch and services
    const discoveryRes = await request(app).get('/api/v1/branches');
    expect(discoveryRes.status).toBe(200);
    const discovered = discoveryRes.body.data.find((b: any) => b.id === branchId);
    expect(discovered).toBeDefined();

    // Step 2: Customer joins queue
    const joinRes = await request(app)
      .post('/api/v1/tickets/join')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId,
        customerName: 'E2E Customer Test',
      });
    expect(joinRes.status).toBe(201);
    const ticketId = joinRes.body.data.id;
    const ticketNumber = joinRes.body.data.ticketNumber;
    expect(ticketNumber).toMatch(/^CA-\d{3}$/);
    expect(joinRes.body.data.currentPosition).toBe(1);

    // Step 3: Staff operator calls next customer
    const callRes = await request(app)
      .post(`/api/v1/counters/${counterAId}/call-next`)
      .set('Authorization', `Bearer ${metroStaffToken}`)
      .set('X-Organization-Id', metroOrgId);
    expect(callRes.status).toBe(200);
    expect(callRes.body.data.id).toBe(ticketId);
    expect(callRes.body.data.status).toBe(TicketStatus.CALLED);

    // Step 4: Staff starts serving customer
    const startServingRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/start-serving`)
      .set('Authorization', `Bearer ${metroStaffToken}`)
      .set('X-Organization-Id', metroOrgId);
    expect(startServingRes.status).toBe(200);
    expect(startServingRes.body.data.status).toBe(TicketStatus.SERVING);

    // Step 5: Staff completes service
    const completeRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/complete`)
      .set('Authorization', `Bearer ${metroStaffToken}`)
      .set('X-Organization-Id', metroOrgId);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe(TicketStatus.COMPLETED);

    // Verify customer's active ticket list is now empty and history contains the completed ticket
    const activeRes = await request(app)
      .get('/api/v1/tickets/active')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(activeRes.body.data.some((t: any) => t.id === ticketId)).toBe(false);

    const historyRes = await request(app)
      .get('/api/v1/tickets/history')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(historyRes.body.data.some((t: any) => t.id === ticketId)).toBe(true);
  });

  test('2. Multi-Tenant Strict Security: Cross-organization data isolation is enforced', async () => {
    // City Bank staff attempts to call or access Metro Health counter/tickets
    const crossCallRes = await request(app)
      .post(`/api/v1/counters/${counterAId}/call-next`)
      .set('Authorization', `Bearer ${bankStaffToken}`)
      .set('X-Organization-Id', metroOrgId);

    // Must be rejected with 403 Forbidden because bankStaff has no membership in metroOrgId
    expect(crossCallRes.status).toBe(403);
  });

  test('3. Administrative Audit Logs & Reporting: Completed operations appear in audit/analytics', async () => {
    const analyticsRes = await request(app)
      .get(`/api/v1/organizations/${metroOrgId}/analytics`)
      .set('Authorization', `Bearer ${metroAdminToken}`)
      .set('X-Organization-Id', metroOrgId);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.summary.totalBranches).toBeGreaterThan(0);
    expect(analyticsRes.body.data.summary.completedTicketsCount).toBeGreaterThanOrEqual(1);
  });

  test('4. Queue Engine Concurrency Integrity: Concurrent requests never generate duplicate numbers', async () => {
    // Generate distinct tokens or anonymous requests if allowed, or distinct users
    // Fire 10 simultaneous ticket creation requests with staff/customer tokens
    const promises = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v1/tickets/join')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId,
          customerName: `Concurrent Test User ${i + 1}`,
        })
    );

    // Note: since 1 user cannot have multiple active tickets on same service (prevent duplicate policy),
    // we test concurrency with QueueEngineService.generateTicket directly or distinct users.
    const concurrentUsersPromises = Array.from({ length: 10 }, async (_, i) => {
      const email = `concurrent-user-${i}@example.com`;
      const u = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: 'dummy',
          fullName: `Concurrent ${i}`,
          role: UserRole.CUSTOMER,
        },
      });
      return request(app)
        .post('/api/v1/tickets/join')
        .set('Authorization', `Bearer ${metroAdminToken}`) // using admin session to join or generate
        .send({
          serviceId,
          customerName: `Customer ${i}`,
        });
    });

    const results: any[] = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/v1/tickets/join')
          .set('Authorization', `Bearer ${metroStaffToken}`)
          .send({
            serviceId,
            customerName: `Walk-in Customer ${i + 1}`,
          })
      )
    );
    results.forEach((res: any) => expect(res.status).toBe(201));

    const sequenceNumbers = results.map((res: any) => res.body.data.sequenceNumber);
    const uniqueSequences = new Set(sequenceNumbers);
    expect(uniqueSequences.size).toBe(10);
  });
});
