# QueueLess: Database Design & ERD

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ OrganizationMembership : "has memberships"
    User ||--o{ QueueTicket : "books"
    User ||--o{ StaffAssignment : "assigned to"
    User ||--o{ DeviceToken : "registers"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ Notification : "receives"

    Organization ||--o{ OrganizationMembership : "members"
    Organization ||--o{ Branch : "operates"
    Organization ||--o{ Service : "offers"
    Organization ||--o{ ServiceCounter : "maintains"
    Organization ||--o{ Queue : "hosts"
    Organization ||--o{ QueueTicket : "contains"
    Organization ||--o{ AuditLog : "records"

    Branch ||--o{ OperatingHour : "has"
    Branch ||--o{ Service : "provides"
    Branch ||--o{ ServiceCounter : "contains"
    Branch ||--o{ Queue : "manages"
    Branch ||--o{ QueueTicket : "processes"
    Branch ||--o{ StaffAssignment : "hosts"

    Service ||--o{ Queue : "mapped to"
    Service ||--o{ CounterServiceAssignment : "handled by"
    Service ||--o{ QueueTicket : "serviced in"

    ServiceCounter ||--o{ CounterServiceAssignment : "supports"
    ServiceCounter ||--o{ StaffAssignment : "operated by"
    ServiceCounter ||--o{ QueueTicket : "calls and serves"

    Queue ||--|| QueueConfiguration : "configured by"
    Queue ||--o{ QueueTicket : "enqueues"

    QueueTicket ||--o{ TicketEvent : "tracks lifecycle"
    QueueTicket ||--o{ Notification : "generates"

    User {
        string id PK
        string email UK
        string phone
        string passwordHash
        string fullName
        string role "SYSTEM_ADMIN, CUSTOMER"
        string avatarUrl
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Organization {
        string id PK
        string name
        string slug UK
        string logoUrl
        string address
        string timezone
        string status "ACTIVE, SUSPENDED"
        datetime createdAt
        datetime updatedAt
    }

    OrganizationMembership {
        string id PK
        string userId FK
        string organizationId FK
        string role "ORG_OWNER, ORG_ADMIN, ORG_STAFF"
        string status "INVITED, ACTIVE, SUSPENDED"
        datetime createdAt
        datetime updatedAt
    }

    Branch {
        string id PK
        string organizationId FK
        string name
        string code
        string address
        string phone
        float latitude
        float longitude
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    OperatingHour {
        string id PK
        string branchId FK
        int dayOfWeek "0=Sunday..6=Saturday"
        string openTime "HH:MM"
        string closeTime "HH:MM"
        boolean isClosed
    }

    Service {
        string id PK
        string organizationId FK
        string branchId FK
        string name
        string code
        string description
        int estimatedDurationMinutes
        int maxDailyTickets
        int priorityLevel "1=Low, 2=Normal, 3=High"
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    ServiceCounter {
        string id PK
        string organizationId FK
        string branchId FK
        string name
        string number
        string status "IDLE, SERVING, PAUSED, OFFLINE"
        string currentStaffId FK
        datetime createdAt
        datetime updatedAt
    }

    CounterServiceAssignment {
        string id PK
        string counterId FK
        string serviceId FK
    }

    StaffAssignment {
        string id PK
        string userId FK
        string organizationId FK
        string branchId FK
        string counterId FK
        boolean isPrimary
        datetime createdAt
    }

    Queue {
        string id PK
        string organizationId FK
        string branchId FK
        string serviceId FK
        string name
        string prefix
        int currentSequence
        string status "OPEN, PAUSED, CLOSED"
        string currentServingTicketId
        datetime createdAt
        datetime updatedAt
    }

    QueueConfiguration {
        string id PK
        string queueId FK,UK
        int maxWaitingCapacity
        boolean autoCallNext
        boolean allowRemoteJoin
        int geofenceRadiusMeters
        int notificationThresholdAhead
        int bufferMinutes
        boolean resetDaily
    }

    QueueTicket {
        string id PK
        string organizationId FK
        string branchId FK
        string serviceId FK
        string queueId FK
        string counterId FK
        string userId FK
        string customerName
        string customerPhone
        string ticketNumber
        int sequenceNumber
        int priorityScore
        string status "WAITING, CALLED, SERVING, COMPLETED, SKIPPED, CANCELLED"
        datetime estimatedServiceTime
        datetime calledAt
        datetime servingStartedAt
        datetime completedAt
        datetime skippedAt
        datetime cancelledAt
        string skipReason
        string cancelReason
        string verificationCode
        datetime createdAt
        datetime updatedAt
    }

    TicketEvent {
        string id PK
        string ticketId FK
        string eventType "ISSUED, POSITION_CHANGED, CALLED, SERVING, COMPLETED, SKIPPED, RECALLED, CANCELLED"
        string performedByUserId FK
        string counterId FK
        string previousStatus
        string newStatus
        jsonb metadata
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK
        string organizationId FK
        string ticketId FK
        string title
        string message
        string type "TICKET_ISSUED, TURN_APPROACHING, CALLED, CANCELLED, SYSTEM"
        string status "PENDING, SENT, FAILED, READ"
        datetime sentAt
        datetime readAt
        datetime createdAt
    }

    DeviceToken {
        string id PK
        string userId FK
        string token UK
        string platform "ANDROID, IOS, WEB"
        datetime lastUsedAt
        datetime createdAt
    }

    AuditLog {
        string id PK
        string organizationId FK
        string userId FK
        string action
        string entityType
        string entityId
        jsonb oldValue
        jsonb newValue
        string ipAddress
        string userAgent
        datetime createdAt
    }
```

---

## 2. Table Specifications, Constraints, and Indexes

### 2.1 `User`
- **Primary Key**: `id` (UUID / CUID)
- **Unique**: `email`
- **Indexes**:
  - `idx_user_email` on (`email`)
  - `idx_user_phone` on (`phone`)
  - `idx_user_role` on (`role`)

### 2.2 `Organization`
- **Primary Key**: `id`
- **Unique**: `slug`
- **Indexes**:
  - `idx_org_slug` on (`slug`)
  - `idx_org_status` on (`status`)

### 2.3 `OrganizationMembership`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `userId` REFERENCES `User(id)` ON DELETE CASCADE
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
- **Unique**: (`userId`, `organizationId`)
- **Indexes**:
  - `idx_membership_user` on (`userId`)
  - `idx_membership_org` on (`organizationId`)
  - `idx_membership_role` on (`organizationId`, `role`)

### 2.4 `Branch`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
- **Unique**: (`organizationId`, `code`)
- **Indexes**:
  - `idx_branch_org` on (`organizationId`)
  - `idx_branch_active` on (`organizationId`, `isActive`)
  - `idx_branch_coords` on (`latitude`, `longitude`)

### 2.5 `OperatingHour`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `branchId` REFERENCES `Branch(id)` ON DELETE CASCADE
- **Unique**: (`branchId`, `dayOfWeek`)

### 2.6 `Service`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
  - `branchId` REFERENCES `Branch(id)` ON DELETE CASCADE
- **Unique**: (`branchId`, `code`)
- **Indexes**:
  - `idx_service_branch` on (`branchId`, `isActive`)
  - `idx_service_org` on (`organizationId`)

### 2.7 `ServiceCounter`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
  - `branchId` REFERENCES `Branch(id)` ON DELETE CASCADE
  - `currentStaffId` REFERENCES `User(id)` ON DELETE SET NULL
- **Unique**: (`branchId`, `number`)
- **Indexes**:
  - `idx_counter_branch` on (`branchId`, `status`)

### 2.8 `CounterServiceAssignment`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `counterId` REFERENCES `ServiceCounter(id)` ON DELETE CASCADE
  - `serviceId` REFERENCES `Service(id)` ON DELETE CASCADE
- **Unique**: (`counterId`, `serviceId`)

### 2.9 `StaffAssignment`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `userId` REFERENCES `User(id)` ON DELETE CASCADE
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
  - `branchId` REFERENCES `Branch(id)` ON DELETE CASCADE
  - `counterId` REFERENCES `ServiceCounter(id)` ON DELETE SET NULL
- **Unique**: (`userId`, `branchId`)

### 2.10 `Queue`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
  - `branchId` REFERENCES `Branch(id)` ON DELETE CASCADE
  - `serviceId` REFERENCES `Service(id)` ON DELETE CASCADE
- **Unique**: (`branchId`, `serviceId`)
- **Indexes**:
  - `idx_queue_branch` on (`branchId`, `status`)

### 2.11 `QueueConfiguration`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `queueId` REFERENCES `Queue(id)` ON DELETE CASCADE
- **Unique**: (`queueId`)

### 2.12 `QueueTicket`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE RESTRICT
  - `branchId` REFERENCES `Branch(id)` ON DELETE RESTRICT
  - `serviceId` REFERENCES `Service(id)` ON DELETE RESTRICT
  - `queueId` REFERENCES `Queue(id)` ON DELETE RESTRICT
  - `counterId` REFERENCES `ServiceCounter(id)` ON DELETE SET NULL
  - `userId` REFERENCES `User(id)` ON DELETE SET NULL
- **Unique**: (`queueId`, `sequenceNumber`)
- **Indexes**:
  - `idx_ticket_active_user` on (`userId`, `status`) WHERE status IN ('WAITING', 'CALLED', 'SERVING')
  - `idx_ticket_queue_status_prio` on (`queueId`, `status`, `priorityScore` DESC, `sequenceNumber` ASC)
  - `idx_ticket_branch_date` on (`branchId`, `createdAt`)
  - `idx_ticket_counter` on (`counterId`, `status`)

### 2.13 `TicketEvent`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `ticketId` REFERENCES `QueueTicket(id)` ON DELETE CASCADE
  - `performedByUserId` REFERENCES `User(id)` ON DELETE SET NULL
- **Indexes**:
  - `idx_ticket_event_ticket` on (`ticketId`, `createdAt` ASC)

### 2.14 `Notification`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `userId` REFERENCES `User(id)` ON DELETE CASCADE
  - `ticketId` REFERENCES `QueueTicket(id)` ON DELETE SET NULL
- **Indexes**:
  - `idx_notification_user_unread` on (`userId`, `status`)

### 2.15 `DeviceToken`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `userId` REFERENCES `User(id)` ON DELETE CASCADE
- **Unique**: (`token`)
- **Indexes**:
  - `idx_devicetoken_user` on (`userId`)

### 2.16 `AuditLog`
- **Primary Key**: `id`
- **Foreign Keys**:
  - `organizationId` REFERENCES `Organization(id)` ON DELETE CASCADE
  - `userId` REFERENCES `User(id)` ON DELETE SET NULL
- **Indexes**:
  - `idx_audit_org_created` on (`organizationId`, `createdAt` DESC)
  - `idx_audit_entity` on (`entityType`, `entityId`)
