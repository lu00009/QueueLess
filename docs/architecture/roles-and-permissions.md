# QueueLess: Roles and Permissions Matrix

## 1. Role Definitions

| Role | Scope | Description |
| :--- | :--- | :--- |
| **SYSTEM_ADMIN** | Global / Platform | Platform maintainer. Can create organizations, view platform health, and manage root system configurations. |
| **ORG_OWNER** | Organization | Organization creator/owner. Has full control over organization profile, billing, all branches, staff, services, queues, and audit logs. |
| **ORG_ADMIN** | Organization / Branch | Branch or organization manager. Manages branches, counters, services, staff assignments, queue rules, and views analytics. |
| **ORG_STAFF** | Assigned Branch / Counter | Counter operator. Manages ticket transitions (call next, serve, complete, skip, recall), pauses/resumes assigned counter, and views waiting customers. |
| **CUSTOMER** | End User | Mobile app user. Can search services/branches, take remote tickets, track positions in real-time, cancel tickets, and view history. |

---

## 2. Granular Permissions Matrix

| Module & Action | SYSTEM_ADMIN | ORG_OWNER | ORG_ADMIN | ORG_STAFF | CUSTOMER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Organization Management** | | | | | |
| Create new Organization | ✅ | ❌ | ❌ | ❌ | ❌ |
| Update Organization profile / settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Suspend / Reactivate Organization | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Branch Management** | | | | | |
| Create / Edit / Delete Branch | ✅ | ✅ | ✅ | ❌ | ❌ |
| Set Branch Operating Hours | ✅ | ✅ | ✅ | ❌ | ❌ |
| List / View Branches (Public / Search) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Service Management** | | | | | |
| Create / Edit / Delete Services | ✅ | ✅ | ✅ | ❌ | ❌ |
| Configure Service priority & duration | ✅ | ✅ | ✅ | ❌ | ❌ |
| List / View Services | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Service Counter Management** | | | | | |
| Create / Edit / Delete Service Counters | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign Services to Counter | ✅ | ✅ | ✅ | ❌ | ❌ |
| Pause / Resume Assigned Counter | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| **Staff & Membership** | | | | | |
| Invite Staff to Organization | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change Member Role (Owner / Admin / Staff)| ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign Staff to Branch / Counter | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remove Staff from Organization | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Queue Operations** | | | | | |
| Open / Pause / Close Queue | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Configure Queue Rules (Capacities, Geofence)| ✅ | ✅ | ✅ | ❌ | ❌ |
| View Queue Waiting List (with Customer info)| ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ticket Lifecycle (Customer)** | | | | | |
| Join Queue / Generate Digital Ticket | ❌ | ❌ | ❌ | ❌ | ✅ |
| Track Active Ticket Position & ETA | ❌ | ❌ | ❌ | ❌ | ✅ (own ticket) |
| Cancel Active Ticket | ❌ | ❌ | ❌ | ❌ | ✅ (own ticket) |
| View Ticket History | ❌ | ❌ | ❌ | ❌ | ✅ (own ticket) |
| **Ticket Lifecycle (Staff / Counter)** | | | | | |
| Call Next Customer (FIFO / Priority) | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Call Specific Eligible Ticket | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Mark Ticket as Serving | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Mark Ticket as Completed / Served | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Skip Ticket (with Reason) | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Recall Skipped Ticket | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| Transfer Ticket to Another Counter/Service | ✅ | ✅ | ✅ | ✅ (assigned) | ❌ |
| **Analytics & Compliance** | | | | | |
| View Real-Time Queue Metrics | ✅ | ✅ | ✅ | ✅ (branch) | ❌ |
| View Historical Reports & Staff Performance | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export Analytics (CSV/PDF) | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Security Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 3. Enforcement Architecture

1. **Authentication Layer (`authenticateToken`)**:
   - Parses JWT `Bearer <token>` from `Authorization` header.
   - Decodes `userId`, `globalRole`, and active `orgId`.
2. **Tenant Membership Layer (`requireOrgAccess`)**:
   - Verifies user has active membership in target `orgId`.
   - Attaches `req.membership = { role, organizationId, status }` to the request context.
3. **Role Checker Layer (`requireRoles(['ORG_OWNER', 'ORG_ADMIN'])`)**:
   - Short-circuits with `403 Forbidden` if caller lacks required role level.
4. **Counter Scope Enforcement (`requireCounterAssignment`)**:
   - For staff actions (`callNext`, `serve`, `complete`), verifies the staff member is actively clocked in or assigned to the specific counter.
