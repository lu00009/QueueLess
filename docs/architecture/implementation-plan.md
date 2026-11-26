# QueueLess: Implementation Plan & Milestone Roadmap

## 1. Roadmap Overview (Milestones 1 – 12)

| Milestone | Title | Focus & Core Deliverables |
| :---: | :--- | :--- |
| **M1** | **Product Planning & Architecture** | Complete requirements analysis, system architecture, database ERD, API specs, role permissions, project folder layout, approval. |
| **M2** | **Project Foundation** | Scaffold backend (Express + TS + Prisma), web (React + Vite + Tailwind), and mobile (Flutter + Riverpod). Connect Neon DB, run baseline migrations, set up environment, dev scripts, health check endpoints. |
| **M3** | **Authentication & Authorization** | User registration, password hashing (bcrypt/argon2), JWT access/refresh tokens, role-based middleware, tenant isolation, protected React routes, Flutter auth state. |
| **M4** | **Organization & Service Management** | Org creation, branch management, service configurations, counters, staff invitations and assignments, operating hours, public discovery APIs. |
| **M5** | **Customer Mobile Application** | Complete customer experience in Flutter: onboarding, authentication, branch/service discovery, join queue flow, digital ticket, ticket history, profile. |
| **M6** | **Queue Engine** | Concurrency-safe queue core: atomic ticket sequences, priority queues, state transitions (WAITING, CALLED, SERVING, COMPLETED, SKIPPED, RECALLED, CANCELLED), ETA algorithm, concurrency unit tests. |
| **M7** | **Staff Dashboard** | React staff operational console: counter assignment, live waiting list, call next, call specific, mark serving, complete, skip with reason, recall, pause counter, customer details. |
| **M8** | **Admin Dashboard** | React administrative console: overview metrics, branch manager, service manager, counter manager, staff manager, queue configuration, reports, audit logs. |
| **M9** | **Real-Time Features & Notifications** | Socket.IO rooms, live ticket progress, counter state broadcasts, FCM push notifications, sound/visual call alerts. |
| **M10** | **Offline Support & Mobile Integration** | SQLite local persistence in Flutter, offline ticket viewing, QR code generation and counter scanning, network reconnection reconciliation. |
| **M11** | **Testing & Quality Assurance** | Backend integration & concurrency tests, React component tests, Flutter widget tests, end-to-end user journeys verification, bug fixing. |
| **M12** | **Deployment & Documentation** | Production build setups, database migration scripts, API docs, seed data, setup guide, and final system verification. |

---

## 2. Key Technical Decisions & Rationales

1. **Database: Neon PostgreSQL with Prisma ORM**
   - *Rationale*: Queue systems demand ACID transactions, row-level locking (`FOR UPDATE SKIP LOCKED`), and relational integrity across organizations, branches, and tickets. Neon provides instant branching, high availability, and connection pooling. Prisma provides type-safe schema modeling, migrations, and developer velocity.

2. **Unified React Web App for Staff and Admin**
   - *Rationale*: Building a single React codebase with Vite and TypeScript avoids code duplication for shared components (tables, badges, modal dialogs, TanStack query hooks, Socket.IO connections) while maintaining strict route-level (`/admin/*` vs `/staff/*`) and API-level RBAC.

3. **Concurrency Control Strategy**
   - *Rationale*: A simple `ticketCount++` will fail under high load. We utilize database-level transactions with atomic sequence increments on the `Queue` record and `FOR UPDATE SKIP LOCKED` when staff members call the next customer, preventing duplicate ticket assignments across multiple counter staff.

4. **Real-Time Communication via Socket.IO**
   - *Rationale*: Socket.IO provides battle-tested room topology (`org:*`, `branch:*`, `queue:*`, `ticket:*`), automatic reconnection, fallback mechanisms, and lightweight client libraries for React and Flutter.

5. **Flutter for Customer Mobile**
   - *Rationale*: Flutter delivers a 60fps native experience across Android and iOS with a single codebase. Riverpod provides clean, testable dependency injection and state management. Offline caching in SQLite/Drift ensures customers never lose access to their digital ticket in low-signal service centers.

---

## 3. Milestone 1 Verification Checklist

- [x] Architecture documentation prepared and documented
- [x] Database ERD and normalized relational model completed
- [x] API endpoint and Socket.IO event specifications completed
- [x] Role and permission matrix completed
- [x] Monorepo directory structure designed
- [x] 12-milestone phased plan established
- [x] Stopped and requesting user approval before proceeding to Milestone 2
