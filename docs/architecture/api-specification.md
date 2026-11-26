# QueueLess: API & Real-Time Socket Specification

## 1. REST API Endpoints

All endpoints are prefixed with `/api/v1`.

### 1.1 Authentication & Profile (`/api/v1/auth`)

| Method | Path | Auth | Roles | Description | Request Body | Response Codes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | None | Public | Register customer or user | `{ email, password, fullName, phone, role? }` | 201, 400, 409 |
| `POST` | `/auth/login` | None | Public | Log in with credentials | `{ email, password }` | 200, 401 |
| `POST` | `/auth/refresh-token` | None | Public | Rotate access token | `{ refreshToken }` | 200, 401 |
| `POST` | `/auth/logout` | JWT | All | Invalidate session & tokens | `{ refreshToken }` | 200, 401 |
| `GET` | `/auth/me` | JWT | All | Get current user profile & orgs | - | 200, 401 |
| `PATCH`| `/auth/me` | JWT | All | Update profile | `{ fullName, phone, avatarUrl }` | 200, 400 |

---

### 1.2 Organizations & Branches (`/api/v1/organizations`, `/api/v1/branches`)

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/organizations` | JWT | SYSTEM_ADMIN | Create organization |
| `GET` | `/organizations/:id` | JWT | Member / SYSTEM_ADMIN | Get organization details |
| `PATCH`| `/organizations/:id` | JWT | ORG_OWNER | Update organization settings |
| `POST` | `/organizations/:id/branches` | JWT | ORG_OWNER, ORG_ADMIN | Create branch |
| `GET` | `/organizations/:id/branches` | JWT | Member / Public (Active) | List branches for organization |
| `GET` | `/branches` | None | Public | Discover branches (search, filter, lat/lng radius) |
| `GET` | `/branches/:id` | None | Public | Get branch details, operating hours, active queues |
| `PATCH`| `/branches/:id` | JWT | ORG_OWNER, ORG_ADMIN | Update branch details |
| `PUT` | `/branches/:id/operating-hours` | JWT | ORG_OWNER, ORG_ADMIN | Update 7-day operating hours |

---

### 1.3 Services & Service Counters (`/api/v1/services`, `/api/v1/counters`)

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/branches/:branchId/services` | JWT | ORG_OWNER, ORG_ADMIN | Create service under branch |
| `GET` | `/branches/:branchId/services` | None | Public | List active services for branch |
| `PATCH`| `/services/:id` | JWT | ORG_OWNER, ORG_ADMIN | Update service (duration, priority, status) |
| `DELETE`| `/services/:id` | JWT | ORG_OWNER, ORG_ADMIN | Deactivate service |
| `POST` | `/branches/:branchId/counters` | JWT | ORG_OWNER, ORG_ADMIN | Create counter |
| `GET` | `/branches/:branchId/counters` | JWT | Member | List counters and statuses |
| `PATCH`| `/counters/:id` | JWT | ORG_OWNER, ORG_ADMIN | Update counter (name, number) |
| `PUT` | `/counters/:id/services` | JWT | ORG_OWNER, ORG_ADMIN | Bind services to counter |
| `POST` | `/counters/:id/status` | JWT | ORG_STAFF | Update counter status (`IDLE`, `PAUSED`, `OFFLINE`) |

---

### 1.4 Staff Management (`/api/v1/organizations/:id/staff`)

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/organizations/:id/staff` | JWT | ORG_OWNER, ORG_ADMIN | List staff members and assignments |
| `POST` | `/organizations/:id/staff/invite` | JWT | ORG_OWNER, ORG_ADMIN | Invite staff by email & role |
| `PATCH`| `/organizations/:id/staff/:userId/role` | JWT | ORG_OWNER | Update staff role |
| `POST` | `/organizations/:id/staff/assign` | JWT | ORG_OWNER, ORG_ADMIN | Assign staff to branch & counter |
| `DELETE`| `/organizations/:id/staff/:userId` | JWT | ORG_OWNER | Remove staff membership |

---

### 1.5 Queue Management & Customer Tickets (`/api/v1/queues`, `/api/v1/tickets`)

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/branches/:branchId/queues` | JWT | Member | List queues and live statistics |
| `POST` | `/queues/:id/status` | JWT | ORG_OWNER, ORG_ADMIN | Update queue status (`OPEN`, `PAUSED`, `CLOSED`) |
| `PUT` | `/queues/:id/config` | JWT | ORG_OWNER, ORG_ADMIN | Update queue configuration & limits |
| `POST` | `/tickets/join` | JWT | CUSTOMER | Join queue and generate ticket |
| `GET` | `/tickets/active` | JWT | CUSTOMER | Get user's active tickets with positions |
| `GET` | `/tickets/history` | JWT | CUSTOMER | Get past ticket history |
| `GET` | `/tickets/:id` | JWT | All authorized | Get full ticket details & timeline events |
| `POST` | `/tickets/:id/cancel` | JWT | CUSTOMER, Staff | Cancel ticket with reason |
| `POST` | `/tickets/:id/sync` | JWT | CUSTOMER | Sync offline ticket state reconciliation |

---

### 1.6 Operational Ticket Actions (Staff Console)

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/counters/:counterId/call-next` | JWT | ORG_STAFF, Admin | Call next waiting ticket for counter's services |
| `POST` | `/counters/:counterId/call-ticket/:ticketId`| JWT | ORG_STAFF, Admin | Call specific eligible ticket |
| `POST` | `/tickets/:id/start-serving` | JWT | ORG_STAFF, Admin | Mark ticket status as `SERVING` |
| `POST` | `/tickets/:id/complete` | JWT | ORG_STAFF, Admin | Complete service on ticket (`COMPLETED`) |
| `POST` | `/tickets/:id/skip` | JWT | ORG_STAFF, Admin | Mark ticket as skipped (`SKIPPED`) with reason |
| `POST` | `/tickets/:id/recall` | JWT | ORG_STAFF, Admin | Recall a skipped ticket back to `CALLED` |

---

### 1.7 Analytics, Audit Logs & Devices

| Method | Path | Auth | Roles | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/organizations/:id/analytics/overview` | JWT | ORG_OWNER, ORG_ADMIN | Queue throughput, wait times, peak hours |
| `GET` | `/organizations/:id/analytics/staff` | JWT | ORG_OWNER, ORG_ADMIN | Staff performance metrics & service times |
| `GET` | `/organizations/:id/audit-logs` | JWT | ORG_OWNER | Paginated audit trail of changes |
| `POST` | `/devices/token` | JWT | All | Register / refresh FCM device token |

---

## 2. Real-Time Socket.IO Specification

### 2.1 Connection & Handshake
- **Endpoint**: `/socket.io/`
- **Auth Handshake**:
  ```json
  {
    "auth": {
      "token": "Bearer <JWT_ACCESS_TOKEN>"
    }
  }
  ```
- **Error Handling**: Emits `connect_error` with `{ message: 'Unauthorized' }` if token is invalid or expired.

---

### 2.2 Client-to-Server Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `room:join` | `{ room: "branch:123" }` | Client joins authorized branch/queue/org room |
| `room:leave` | `{ room: "branch:123" }` | Client leaves room |
| `counter:heartbeat` | `{ counterId: "c1", status: "SERVING" }` | Counter active ping |

---

### 2.3 Server-to-Client Events

| Event | Room | Payload Schema | Description |
| :--- | :--- | :--- | :--- |
| `queue:ticket:created` | `queue:{queueId}`, `branch:{branchId}` | `{ ticketId, ticketNumber, sequenceNumber, serviceId, queueId, position, estimatedWaitMinutes }` | New customer joined queue |
| `queue:ticket:called` | `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, counterNumber, counterName, calledAt }` | Ticket called to a counter |
| `queue:ticket:serving` | `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, counterNumber, servingStartedAt }` | Ticket service started |
| `queue:ticket:completed`| `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, completedAt, durationSeconds }` | Ticket completed |
| `queue:ticket:skipped` | `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, reason, skippedAt }` | Ticket skipped |
| `queue:ticket:recalled`| `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, counterNumber, recalledAt }` | Skipped ticket recalled |
| `queue:ticket:cancelled`| `queue:{queueId}`, `branch:{branchId}`, `ticket:{ticketId}` | `{ ticketId, ticketNumber, reason, cancelledAt }` | Ticket cancelled |
| `queue:position:updated`| `ticket:{ticketId}` | `{ ticketId, currentPosition, estimatedWaitMinutes }` | Recalculated position for waiting customer |
| `counter:state:changed` | `branch:{branchId}` | `{ counterId, status, currentStaffId, activeTicketId }` | Counter opened/paused/closed |
