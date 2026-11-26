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
