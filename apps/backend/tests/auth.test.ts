import { AuthService } from '../src/services/auth.service';
import { prisma } from '../src/config/database';
import { UserRole, OrgRole } from '@queueless/shared-types';

describe('Auth & Multi-Tenant Authorization Tests', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  afterAll(async () => {
    // Cleanup created test user
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  test('1. Registers new customer account with hashed password', async () => {
    const res = await AuthService.register({
      email: testEmail,
      password: 'SecurePassword123!',
      fullName: 'Test Customer',
      phone: '+15551234567',
      role: UserRole.CUSTOMER,
    });

    expect(res).toBeDefined();
    expect(res.user.email).toBe(testEmail);
    expect(res.accessToken).toBeDefined();
    expect(res.refreshToken).toBeDefined();

    userId = res.user.id;
    accessToken = res.accessToken;
    refreshToken = res.refreshToken;

    // Verify password is not saved as plaintext in DB
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.passwordHash).not.toBe('SecurePassword123!');
    expect(dbUser?.passwordHash.startsWith('$2b$') || dbUser?.passwordHash.startsWith('$2a$')).toBe(true);
  });

  test('2. Prevents duplicate email registration', async () => {
    await expect(
      AuthService.register({
        email: testEmail,
        password: 'AnotherPassword123!',
        fullName: 'Duplicate User',
      })
    ).rejects.toThrow('An account with this email already exists');
  });

  test('3. Successfully logs in with correct credentials', async () => {
    const loginRes = await AuthService.login({
      email: testEmail,
      password: 'SecurePassword123!',
    });

    expect(loginRes.user.id).toBe(userId);
    expect(loginRes.accessToken).toBeDefined();
  });

  test('4. Rejects login with incorrect password', async () => {
    await expect(
      AuthService.login({
        email: testEmail,
        password: 'WrongPassword!',
      })
    ).rejects.toThrow('Invalid email or password');
  });

  test('5. Refreshes token with valid refresh token', async () => {
    const refreshRes = await AuthService.refreshToken(refreshToken);
    expect(refreshRes.accessToken).toBeDefined();
    expect(refreshRes.refreshToken).toBeDefined();
  });

  test('6. Seed verification: System admin, Org owners, and Staff memberships exist', async () => {
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@queueless.com' },
    });
    expect(admin).toBeDefined();
    expect(admin?.role).toBe(UserRole.SYSTEM_ADMIN);

    const metroStaff = await prisma.user.findUnique({
      where: { email: 'staff@metrohealth.com' },
      include: { memberships: true },
    });
    expect(metroStaff).toBeDefined();
    expect(metroStaff?.memberships.length).toBeGreaterThan(0);
    expect(metroStaff?.memberships[0].role).toBe(OrgRole.ORG_STAFF);
  });
});
