export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export enum OrgRole {
  ORG_OWNER = 'ORG_OWNER',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_STAFF = 'ORG_STAFF',
}

export enum MembershipStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum OrgStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum CounterStatus {
  IDLE = 'IDLE',
  SERVING = 'SERVING',
  PAUSED = 'PAUSED',
  OFFLINE = 'OFFLINE',
}

export enum QueueStatus {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum TicketStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum TicketEventType {
  ISSUED = 'ISSUED',
  POSITION_CHANGED = 'POSITION_CHANGED',
  CALLED = 'CALLED',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  RECALLED = 'RECALLED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  TICKET_ISSUED = 'TICKET_ISSUED',
  TURN_APPROACHING = 'TURN_APPROACHING',
  CALLED = 'CALLED',
  CANCELLED = 'CANCELLED',
  SYSTEM = 'SYSTEM',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}
