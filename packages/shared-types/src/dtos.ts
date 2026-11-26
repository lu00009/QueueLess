import { UserRole, OrgRole, TicketStatus, CounterStatus, QueueStatus } from './enums';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  address?: string | null;
  timezone: string;
  status: string;
}

export interface BranchDto {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
}

export interface ServiceDto {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  description?: string | null;
  estimatedDurationMinutes: number;
  priorityLevel: number;
  isActive: boolean;
}

export interface CounterDto {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  number: string;
  status: CounterStatus;
  currentStaffId?: string | null;
}

export interface QueueTicketDto {
  id: string;
  organizationId: string;
  branchId: string;
  serviceId: string;
  queueId: string;
  counterId?: string | null;
  userId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  ticketNumber: string;
  sequenceNumber: number;
  priorityScore: number;
  status: TicketStatus;
  estimatedServiceTime?: string | null;
  calledAt?: string | null;
  servingStartedAt?: string | null;
  completedAt?: string | null;
  skippedAt?: string | null;
  cancelledAt?: string | null;
  skipReason?: string | null;
  verificationCode: string;
  currentPosition?: number;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    role: OrgRole;
  }>;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'disconnected';
  version: string;
}
