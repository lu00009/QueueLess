import { z } from 'zod';
import { CounterStatus, QueueStatus, OrgRole } from '@queueless/shared-types';

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  address: z.string().optional(),
  timezone: z.string().default('UTC'),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const createBranchSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10).toUpperCase(),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(1).max(10).toUpperCase().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const operatingHoursItemSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0=Sunday..6=Saturday
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:MM'),
  isClosed: z.boolean().default(false),
});

export const operatingHoursSchema = z.array(operatingHoursItemSchema);

export const createServiceSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().optional(),
  estimatedDurationMinutes: z.number().min(1).default(15),
  maxDailyTickets: z.number().min(1).default(500),
  priorityLevel: z.number().min(1).max(3).default(2),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(1).max(10).toUpperCase().optional(),
  description: z.string().optional(),
  estimatedDurationMinutes: z.number().min(1).optional(),
  maxDailyTickets: z.number().min(1).optional(),
  priorityLevel: z.number().min(1).max(3).optional(),
  isActive: z.boolean().optional(),
});

export const createCounterSchema = z.object({
  name: z.string().min(1),
  number: z.string().min(1),
  serviceIds: z.array(z.string()).optional(),
});

export const updateCounterSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().min(1).optional(),
  status: z.nativeEnum(CounterStatus).optional(),
  currentStaffId: z.string().nullable().optional(),
});

export const counterServicesSchema = z.object({
  serviceIds: z.array(z.string()),
});

export const updateCounterStatusSchema = z.object({
  status: z.nativeEnum(CounterStatus),
});

export const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole).default(OrgRole.ORG_STAFF),
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const updateStaffRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});

export const assignStaffSchema = z.object({
  userId: z.string(),
  branchId: z.string(),
  counterId: z.string().optional().nullable(),
  isPrimary: z.boolean().default(true),
});

export const updateQueueConfigSchema = z.object({
  maxWaitingCapacity: z.number().min(1).optional(),
  autoCallNext: z.boolean().optional(),
  allowRemoteJoin: z.boolean().optional(),
  geofenceRadiusMeters: z.number().min(100).optional(),
  notificationThresholdAhead: z.number().min(1).optional(),
  bufferMinutes: z.number().min(1).optional(),
  resetDaily: z.boolean().optional(),
});

export const updateQueueStatusSchema = z.object({
  status: z.nativeEnum(QueueStatus),
});
