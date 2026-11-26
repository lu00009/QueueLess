import { PrismaClient, UserRole, OrgRole, OrgStatus, MembershipStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting QueueLess database seed...');

  const passwordHash = await bcrypt.hash('Password@123456', 10);

  // 1. System Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@queueless.com' },
    update: {},
    create: {
      email: 'admin@queueless.com',
      passwordHash,
      fullName: 'System Administrator',
      role: UserRole.SYSTEM_ADMIN,
      phone: '+15550000001',
    },
  });

  // 2. Organization 1: Metro Health
  const orgMetro = await prisma.organization.upsert({
    where: { slug: 'metro-health' },
    update: {},
    create: {
      name: 'Metro Health Clinic',
      slug: 'metro-health',
      address: '100 Medical Center Way, Suite 100',
      timezone: 'America/New_York',
      status: OrgStatus.ACTIVE,
    },
  });

  // Branch 1: Main Campus
  const mainBranch = await prisma.branch.upsert({
    where: {
      organizationId_code: {
        organizationId: orgMetro.id,
        code: 'MAIN',
      },
    },
    update: {},
    create: {
      organizationId: orgMetro.id,
      name: 'Metro Health Main Campus',
      code: 'MAIN',
      address: '100 Medical Center Way, New York, NY 10001',
      phone: '+1 (555) 234-5678',
      latitude: 40.730610,
      longitude: -73.935242,
      isActive: true,
    },
  });

  // Operating Hours (Mon-Sat 8:00 - 18:00)
  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { branchId_dayOfWeek: { branchId: mainBranch.id, dayOfWeek: day } },
      update: {},
      create: {
        branchId: mainBranch.id,
        dayOfWeek: day,
        openTime: '08:00',
        closeTime: day === 0 ? '14:00' : '18:00',
        isClosed: day === 0,
      },
    });
  }

  // Services
  const genService = await prisma.service.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'GEN' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'General Consultation',
      code: 'GEN',
      description: 'Primary healthcare and outpatient check-ups',
      estimatedDurationMinutes: 15,
      priorityLevel: 2,
    },
  });

  const pharmService = await prisma.service.upsert({
    where: { branchId_code: { branchId: mainBranch.id, code: 'PHARM' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Pharmacy & Dispensing',
      code: 'PHARM',
      description: 'Prescription pickup and medication counsel',
      estimatedDurationMinutes: 5,
      priorityLevel: 1,
    },
  });

  // Queues & Configurations
  for (const s of [genService, pharmService]) {
    const q = await prisma.queue.upsert({
      where: { branchId_serviceId: { branchId: mainBranch.id, serviceId: s.id } },
      update: {},
      create: {
        organizationId: orgMetro.id,
        branchId: mainBranch.id,
        serviceId: s.id,
        name: `${s.name} Queue`,
        prefix: s.code.slice(0, 2),
      },
    });

    await prisma.queueConfiguration.upsert({
      where: { queueId: q.id },
      update: {},
      create: {
        queueId: q.id,
        maxWaitingCapacity: 100,
        autoCallNext: false,
        allowRemoteJoin: true,
        geofenceRadiusMeters: 5000,
        notificationThresholdAhead: 3,
        bufferMinutes: 5,
      },
    });
  }

  // Counters
  const counter1 = await prisma.serviceCounter.upsert({
    where: { branchId_number: { branchId: mainBranch.id, number: '1' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Counter 1 (General)',
      number: '1',
      status: 'IDLE',
    },
  });

  const counter2 = await prisma.serviceCounter.upsert({
    where: { branchId_number: { branchId: mainBranch.id, number: '2' } },
    update: {},
    create: {
      organizationId: orgMetro.id,
      branchId: mainBranch.id,
      name: 'Counter 2 (Pharmacy)',
      number: '2',
      status: 'IDLE',
    },
  });

  // Map services to counters
  await prisma.counterServiceAssignment.upsert({
    where: { counterId_serviceId: { counterId: counter1.id, serviceId: genService.id } },
    update: {},
    create: { counterId: counter1.id, serviceId: genService.id },
  });

  await prisma.counterServiceAssignment.upsert({
    where: { counterId_serviceId: { counterId: counter2.id, serviceId: pharmService.id } },
    update: {},
    create: { counterId: counter2.id, serviceId: pharmService.id },
  });

  // Metro Health Owner
  const metroOwner = await prisma.user.upsert({
    where: { email: 'owner@metrohealth.com' },
    update: {},
    create: {
      email: 'owner@metrohealth.com',
      passwordHash,
      fullName: 'Dr. Sarah Mitchell',
      role: UserRole.CUSTOMER,
      phone: '+15550001001',
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: metroOwner.id,
        organizationId: orgMetro.id,
      },
    },
    update: {},
    create: {
      userId: metroOwner.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_OWNER,
      status: MembershipStatus.ACTIVE,
    },
  });

  // Metro Health Staff
  const metroStaff = await prisma.user.upsert({
    where: { email: 'staff@metrohealth.com' },
    update: {},
    create: {
      email: 'staff@metrohealth.com',
      passwordHash,
      fullName: 'Nurse James Miller',
      role: UserRole.CUSTOMER,
      phone: '+15550001002',
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: metroStaff.id,
        organizationId: orgMetro.id,
      },
    },
    update: {},
    create: {
      userId: metroStaff.id,
      organizationId: orgMetro.id,
      role: OrgRole.ORG_STAFF,
      status: MembershipStatus.ACTIVE,
    },
  });

  // 3. Organization 2: City Bank & Trust (for Tenant Isolation Testing)
  const orgBank = await prisma.organization.upsert({
    where: { slug: 'city-bank' },
    update: {},
    create: {
      name: 'City Bank & Trust',
      slug: 'city-bank',
      address: '500 Financial Plaza',
      timezone: 'America/New_York',
      status: OrgStatus.ACTIVE,
    },
  });

  const bankStaff = await prisma.user.upsert({
    where: { email: 'bankstaff@citybank.com' },
    update: {},
    create: {
      email: 'bankstaff@citybank.com',
      passwordHash,
      fullName: 'Teller Alice Johnson',
      role: UserRole.CUSTOMER,
      phone: '+15550002001',
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: bankStaff.id,
        organizationId: orgBank.id,
      },
    },
    update: {},
    create: {
      userId: bankStaff.id,
      organizationId: orgBank.id,
      role: OrgRole.ORG_STAFF,
      status: MembershipStatus.ACTIVE,
    },
  });

  // 4. Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash,
      fullName: 'John Doe',
      role: UserRole.CUSTOMER,
      phone: '+15550009999',
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(`- System Admin: ${admin.email} (pwd: Password@123456)`);
  console.log(`- Org Metro Health: ${orgMetro.name} (id: ${orgMetro.id})`);
  console.log(`  * Owner: ${metroOwner.email}`);
  console.log(`  * Staff: ${metroStaff.email}`);
  console.log(`- Org City Bank: ${orgBank.name} (id: ${orgBank.id})`);
  console.log(`  * Staff: ${bankStaff.email}`);
  console.log(`- Customer: ${customer.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
