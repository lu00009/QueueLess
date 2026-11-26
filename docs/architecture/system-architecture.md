# QueueLess: System Architecture

## 1. High-Level Architecture Overview

QueueLess is a real-time, multi-tenant digital queue management platform designed to eliminate physical waiting lines across hospitals, banks, universities, government offices, and service centers.

```mermaid
flowchart TB
    subgraph MobileApp["Customer Mobile Application (Flutter)"]
        MobileUI["Flutter UI (Riverpod + GoRouter)"]
        MobileStorage["Local Storage (SQLite / Drift)"]
        MobileNetwork["Dio HTTP Client + Socket.IO Client"]
        FCMClient["FCM Push Receiver"]
    end

    subgraph WebApp["Frontends: Staff & Admin Dashboards (React + Vite)"]
        AdminUI["Admin Dashboard (Routes & Views)"]
        StaffUI["Staff Operational Dashboard (Routes & Views)"]
        TanStack["TanStack Query (Cache & State)"]
        WebSockets["Socket.IO Client"]
    end

    subgraph BackendAPI["Backend API & Real-Time Engine (Node.js + Express + TypeScript)"]
        AuthMiddleware["JWT & RBAC Middleware"]
        TenancyMiddleware["Organization Tenant Resolver"]
        RESTControllers["REST API Controllers (Zod Validated)"]
        QueueEngine["Queue Engine (Atomic Concurrency Control)"]
        SocketIOServer["Socket.IO Gateway (Room Topology)"]
        PushService["FCM Admin Push Notification Service"]
        AuditService["Audit Logging Service"]
    end

    subgraph StorageLayer["Data & Cache Layer"]
        PostgreSQL[("Neon PostgreSQL (Prisma ORM)")]
        RedisCache[("Redis (Pub/Sub & Distributed Cache)")]
    end

    MobileNetwork --> RESTControllers
    MobileNetwork --> SocketIOServer
    FCMClient <.. PushService

    WebSockets --> SocketIOServer
    TanStack --> RESTControllers

    RESTControllers --> AuthMiddleware
    AuthMiddleware --> TenancyMiddleware
    TenancyMiddleware --> QueueEngine
    QueueEngine --> PostgreSQL
    QueueEngine --> RedisCache
    QueueEngine --> SocketIOServer
    QueueEngine --> PushService
    QueueEngine --> AuditService
```

---

## 2. Application Boundaries & Responsibilities

| Subsystem | Technology | Primary Responsibilities | Deployment Model |
| :--- | :--- | :--- | :--- |
| **Backend API** | Node.js, Express, TypeScript, Prisma, Socket.IO | • Multi-tenant data isolation<br>• Core Queue Engine with concurrency guarantees<br>• Authentication (JWT access & refresh tokens) and RBAC<br>• Real-time WebSocket broadcasting<br>• FCM Push notifications dispatch<br>• Audit trail logging | Docker container / Node runtime on cloud host (e.g. Render, Railway, Fly.io, or AWS ECS) |
| **Web Dashboards** | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Socket.IO Client, Recharts | • **Admin Dashboard**: Multi-branch management, services, counters, staff allocation, operating hours, queue rules, analytics<br>• **Staff Dashboard**: High-speed counter console, call next, serving status, skip, recall, queue monitoring<br>• Single codebase with route-level and component-level RBAC | Static Single-Page App (SPA) deployed to CDN (Vercel, Cloudflare Pages, Netlify) |
| **Mobile App** | Flutter 3.x, Dart, Riverpod, GoRouter, Dio, SQLite/Drift | • Service center & branch discovery (GPS/Search)<br>• Remote queue ticket booking & digital ticket generation<br>• Real-time position and wait-time tracking<br>• Offline ticket access and QR code rendering for counter check-in<br>• In-app notifications & push alerts | Native Android APK / App Bundle and iOS build |
| **Database** | Neon Serverless PostgreSQL | • Relational normalized persistence<br>• Row-level transactional integrity (`SELECT FOR UPDATE`)<br>• Connection pooling and branching | Serverless PostgreSQL on Neon |

---

## 3. Multi-Tenancy & Data Isolation Model

QueueLess enforces strict multi-tenancy at every tier:
1. **Tenant Identification**: Every organization has a unique `organizationId`. Staff and Admin requests include JWT claims specifying `organizationId` and assigned role (`ORG_ADMIN`, `ORG_STAFF`, `ORG_OWNER`).
2. **Tenant Scoping in Service Layer**: All queries to tenant-owned models (`Branch`, `Service`, `ServiceCounter`, `Queue`, `QueueTicket`, `AuditLog`) mandate `where: { organizationId }` filtering.
3. **Cross-Tenant Prevention**: Users can belong to multiple organizations via `OrganizationMembership`. When interacting with organization endpoints, the active membership is validated by `requireOrgAccess()` middleware.
4. **Customer Data Segregation**: Customers are global identities but their tickets and queue history are scoped per organization and branch.

---

## 4. Queue Engine & Concurrency Control

Queue ticket assignment and ticket calling are critical race condition zones:
- Multiple customers attempting to take the next ticket simultaneously.
- Multiple staff counters calling the next waiting customer at the same millisecond.

### Ticket Generation Concurrency
```sql
-- Atomic sequence generation per queue within a transaction
BEGIN;
  SELECT currentSequence 
  FROM "Queue" 
  WHERE id = $queueId 
  FOR UPDATE;

  -- Compute next sequence and formatted ticket number (e.g., A-101)
  UPDATE "Queue"
  SET currentSequence = currentSequence + 1
  WHERE id = $queueId
  RETURNING currentSequence;

  INSERT INTO "QueueTicket" (
    id, "organizationId", "branchId", "serviceId", "queueId", 
    "ticketNumber", "sequenceNumber", "priorityScore", status, "userId", ...
  ) VALUES (...);
COMMIT;
```

### Ticket Calling Concurrency
```sql
-- Staff counter calling the next eligible ticket
BEGIN;
  -- Select next waiting ticket ordered by priorityScore DESC, sequenceNumber ASC
  SELECT id FROM "QueueTicket"
  WHERE "queueId" = $queueId 
    AND status = 'WAITING'
  ORDER BY "priorityScore" DESC, "sequenceNumber" ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Transition ticket to CALLED and assign counter
  UPDATE "QueueTicket"
  SET status = 'CALLED', "counterId" = $counterId, "calledAt" = NOW()
  WHERE id = $ticketId;
COMMIT;
```
`FOR UPDATE SKIP LOCKED` ensures zero collision between concurrent staff calls without blocking workers.

---

## 5. Real-Time Socket.IO Topology

Socket.IO connections are authenticated via JWT during handshake and joined to authorized rooms:

| Room Pattern | Purpose | Authorized Audiences |
| :--- | :--- | :--- |
| `org:{orgId}` | Organization-wide events (admin alerts, global metrics) | Org Owners, Org Admins |
| `branch:{branchId}` | Branch-level queue monitoring & counter status changes | Branch Staff & Admins |
| `queue:{queueId}` | Queue state updates (new ticket, queue paused/resumed) | Branch Staff, Admins, Public Display Screens |
| `ticket:{ticketId}` | Real-time position changes, call alert for specific ticket | Ticket owner (Customer) |
| `user:{userId}` | Direct user notifications, account updates | Targeted User |

---

## 6. Offline Support & Sync Strategy

1. **Local Persistence (Mobile)**:
   - When a ticket is issued, the full ticket metadata (number, service name, branch, QR code verification token, estimated time) is cached locally in SQLite/Drift.
   - If connectivity drops, the customer can open the app and present the digital ticket / QR code to counter staff.
2. **Read-Only Offline Ticket Presentation**:
   - The offline ticket includes an encrypted HMAC/SHA256 verification payload that the staff counter scanner can verify even if the customer's phone is completely offline.
3. **Safe Synchronization**:
   - Offline cancellation or modification actions are queued locally with idempotency keys. Upon reconnection, actions are sent to `/api/v1/tickets/:id/sync`. If the ticket status has already progressed (e.g. called or served), the backend rejects stale client modifications without corrupting the live queue sequence.
