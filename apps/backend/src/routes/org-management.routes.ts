import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { BranchController } from '../controllers/branch.controller';
import { ServiceController } from '../controllers/service.controller';
import { CounterController } from '../controllers/counter.controller';
import { StaffController } from '../controllers/staff.controller';
import { QueueController } from '../controllers/queue.controller';
import { authenticateToken, requireRoles, requireOrgAccess } from '../middleware/auth.middleware';
import { UserRole, OrgRole } from '@queueless/shared-types';

export const orgManagementRouter = Router();

// ==========================================
// 1. PUBLIC DISCOVERY ROUTES (Mobile App)
// ==========================================
orgManagementRouter.get('/branches', BranchController.discoverPublic);
orgManagementRouter.get('/branches/:id', BranchController.getById);
orgManagementRouter.get('/branches/:branchId/services', ServiceController.listByBranch);

// ==========================================
// 2. ORGANIZATIONS (Super Admin & Owners)
// ==========================================
orgManagementRouter.post(
  '/organizations',
  authenticateToken,
  requireRoles(UserRole.SYSTEM_ADMIN),
  OrganizationController.create
);
orgManagementRouter.get(
  '/organizations',
  authenticateToken,
  OrganizationController.listAll
);
orgManagementRouter.get(
  '/organizations/:id',
  authenticateToken,
  OrganizationController.getById
);
orgManagementRouter.patch(
  '/organizations/:id',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER]),
  OrganizationController.update
);

// ==========================================
// 3. BRANCHES & OPERATING HOURS
// ==========================================
orgManagementRouter.post(
  '/organizations/:organizationId/branches',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  BranchController.create
);
orgManagementRouter.get(
  '/organizations/:organizationId/branches',
  authenticateToken,
  requireOrgAccess(),
  BranchController.listByOrg
);
orgManagementRouter.patch(
  '/branches/:id',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  BranchController.update
);
orgManagementRouter.put(
  '/branches/:id/operating-hours',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  BranchController.setOperatingHours
);

// ==========================================
// 4. SERVICES
// ==========================================
orgManagementRouter.post(
  '/branches/:branchId/services',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  ServiceController.create
);
orgManagementRouter.patch(
  '/services/:id',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  ServiceController.update
);
orgManagementRouter.delete(
  '/services/:id',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  ServiceController.delete
);

// ==========================================
// 5. SERVICE COUNTERS
// ==========================================
orgManagementRouter.post(
  '/branches/:branchId/counters',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  CounterController.create
);
orgManagementRouter.get(
  '/branches/:branchId/counters',
  authenticateToken,
  requireOrgAccess(),
  CounterController.listByBranch
);
orgManagementRouter.patch(
  '/counters/:id',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  CounterController.update
);
orgManagementRouter.put(
  '/counters/:id/services',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  CounterController.setSupportedServices
);
orgManagementRouter.post(
  '/counters/:id/status',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN, OrgRole.ORG_STAFF]),
  CounterController.updateStatus
);

// ==========================================
// 6. STAFF & ASSIGNMENTS
// ==========================================
orgManagementRouter.get(
  '/organizations/:id/staff',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.listByOrg
);
orgManagementRouter.post(
  '/organizations/:id/staff/invite',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.invite
);
orgManagementRouter.patch(
  '/organizations/:id/staff/:userId/role',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.updateRole
);
orgManagementRouter.post(
  '/organizations/:id/staff/assign',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.assignStaff
);
orgManagementRouter.delete(
  '/organizations/:id/staff/:userId',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.remove
);
orgManagementRouter.post(
  '/organizations/:id/staff/:userId/activate',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  StaffController.activate
);

// ==========================================
// 7. QUEUES & CONFIGURATION
// ==========================================
orgManagementRouter.get(
  '/branches/:branchId/queues',
  authenticateToken,
  requireOrgAccess(),
  QueueController.listByBranch
);
orgManagementRouter.put(
  '/queues/:id/config',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  QueueController.updateConfig
);
orgManagementRouter.patch(
  '/queues/:id/status',
  authenticateToken,
  requireOrgAccess([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]),
  QueueController.updateStatus
);
