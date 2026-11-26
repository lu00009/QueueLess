import { prisma } from '../src/config/database';
import { BranchService } from '../src/services/branch.service';
import { ServiceService } from '../src/services/service.service';
import { CounterService } from '../src/services/counter.service';
import { StaffService } from '../src/services/staff.service';
import { QueueService } from '../src/services/queue.service';
import { OrgRole, CounterStatus, QueueStatus } from '@prisma/client';

describe('Milestone 4: Organization & Service Management Tests', () => {
  let metroOrgId: string;
  let cityBankOrgId: string;
  let testBranchId: string;
  let testServiceId: string;
  let testCounterId: string;
  let testQueueId: string;
  let testStaffUserId: string;

  beforeAll(async () => {
    const metroOrg = await prisma.organization.findUnique({ where: { slug: 'metro-health' } });
    const bankOrg = await prisma.organization.findUnique({ where: { slug: 'city-bank' } });
    metroOrgId = metroOrg!.id;
    cityBankOrgId = bankOrg!.id;
  });

  afterAll(async () => {
    if (testBranchId) {
      // Cascade delete test branch and associated items
      await prisma.branch.deleteMany({ where: { id: testBranchId } });
    }
    if (testStaffUserId) {
      await prisma.user.deleteMany({ where: { id: testStaffUserId } });
    }
    await prisma.$disconnect();
  });

  test('1. Creates a new branch under organization', async () => {
    const branch = await BranchService.create(metroOrgId, {
      name: 'Downtown Medical Center',
      code: 'DMC1',
      address: '123 Main St, New York, NY',
      phone: '+15551239876',
      latitude: 40.7128,
      longitude: -74.0060,
    });

    expect(branch).toBeDefined();
    expect(branch.code).toBe('DMC1');
    expect(branch.organizationId).toBe(metroOrgId);
    testBranchId = branch.id;
  });

  test('2. Sets 7-day operating hours for the branch', async () => {
    const hours = [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '18:00', isClosed: true }, // Sunday closed
      { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false }, // Mon
      { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false }, // Tue
      { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false }, // Wed
      { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false }, // Thu
      { dayOfWeek: 5, openTime: '08:00', closeTime: '17:00', isClosed: false }, // Fri
      { dayOfWeek: 6, openTime: '09:00', closeTime: '14:00', isClosed: false }, // Sat
    ];

    const result = await BranchService.setOperatingHours(testBranchId, metroOrgId, hours);
    expect(result.length).toBe(7);
    expect(result.find((h) => h.dayOfWeek === 0)?.isClosed).toBe(true);
    expect(result.find((h) => h.dayOfWeek === 1)?.openTime).toBe('08:00');
  });

  test('3. Creates service and automatically creates associated Queue & QueueConfiguration', async () => {
    const service = await ServiceService.create(testBranchId, metroOrgId, {
      name: 'General Consultation',
      code: 'GEN',
      description: 'Routine physician consultation and prescriptions',
      estimatedDurationMinutes: 20,
      priorityLevel: 2,
    });

    expect(service).toBeDefined();
    expect(service.code).toBe('GEN');
    testServiceId = service.id;

    // Verify associated Queue was created automatically
    const queues = await QueueService.listByBranch(testBranchId);
    expect(queues.length).toBeGreaterThan(0);
    const queue = queues.find((q) => q.serviceId === service.id);
    expect(queue).toBeDefined();
    expect(queue?.configuration).toBeDefined();
    expect(queue?.configuration?.maxWaitingCapacity).toBe(100);
    testQueueId = queue!.id;
  });

  test('4. Creates service counter and binds supported services', async () => {
    const counter = await CounterService.create(testBranchId, metroOrgId, {
      name: 'Counter A',
      number: '1',
      serviceIds: [testServiceId],
    });

    expect(counter).toBeDefined();
    expect(counter.number).toBe('1');
    testCounterId = counter.id;

    const list = await CounterService.listByBranch(testBranchId);
    const found = list.find((c) => c.id === counter.id);
    expect(found?.supportedServices.length).toBe(1);
    expect(found?.supportedServices[0].serviceId).toBe(testServiceId);
  });

  test('5. Invites staff and assigns to branch & counter', async () => {
    const invited = await StaffService.inviteOrAdd(metroOrgId, {
      email: `clinician_${Date.now()}@metrohealth.com`,
      role: OrgRole.ORG_STAFF,
      fullName: 'Nurse Karen Davis',
      phone: '+15554443333',
    });

    expect(invited).toBeDefined();
    expect(invited.role).toBe(OrgRole.ORG_STAFF);
    testStaffUserId = invited.userId;

    const assignment = await StaffService.assignStaff(metroOrgId, {
      userId: testStaffUserId,
      branchId: testBranchId,
      counterId: testCounterId,
      isPrimary: true,
    });

    expect(assignment.userId).toBe(testStaffUserId);
    expect(assignment.counterId).toBe(testCounterId);
  });

  test('6. Updates queue configuration and queue status', async () => {
    const updatedConfig = await QueueService.updateConfig(testQueueId, metroOrgId, {
      maxWaitingCapacity: 50,
      bufferMinutes: 10,
    });
    expect(updatedConfig.maxWaitingCapacity).toBe(50);
    expect(updatedConfig.bufferMinutes).toBe(10);

    const updatedQueue = await QueueService.updateStatus(testQueueId, metroOrgId, QueueStatus.PAUSED);
    expect(updatedQueue.status).toBe(QueueStatus.PAUSED);
  });

  test('7. Public branch discovery returns active branches with operating hours & services', async () => {
    const discovered = await BranchService.discoverPublic({ search: 'Downtown Medical' });
    expect(discovered.length).toBeGreaterThan(0);
    const branch = discovered.find((b) => b.id === testBranchId);
    expect(branch).toBeDefined();
    expect(branch?.operatingHours.length).toBe(7);
    expect(branch?.services.length).toBeGreaterThan(0);
  });

  test('8. Enforces strict tenant isolation across organizations', async () => {
    // Attempting to create a service in Metro Health branch using City Bank orgId must be rejected
    await expect(
      ServiceService.create(testBranchId, cityBankOrgId, {
        name: 'Malicious Service',
        code: 'BAD',
      })
    ).rejects.toThrow('Branch not found in this organization');

    // Attempting to update Metro Health counter using City Bank orgId must be rejected
    await expect(
      CounterService.update(testCounterId, cityBankOrgId, { name: 'Hacked Counter' })
    ).rejects.toThrow('Counter not found in this organization');
  });
});
