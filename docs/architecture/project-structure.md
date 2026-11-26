# QueueLess: Project Directory Structure

```text
QueueLess/
├── apps/
│   ├── backend/                     # Node.js + Express + TypeScript API
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Complete relational schema
│   │   │   ├── migrations/          # Version-controlled migrations
│   │   │   └── seed.ts              # Multi-tenant demo seed data
│   │   ├── src/
│   │   │   ├── config/              # Environment, Neon DB, Redis, Firebase configs
│   │   │   ├── constants/           # Enums, error codes, HTTP statuses
│   │   │   ├── controllers/         # REST API route controllers
│   │   │   ├── middleware/          # Auth, Tenant isolation, Validation, Rate limit
│   │   │   ├── routes/              # Express API routers (/api/v1/*)
│   │   │   ├── services/            # Core business logic:
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── organization.service.ts
│   │   │   │   ├── branch.service.ts
│   │   │   │   ├── service.service.ts
│   │   │   │   ├── counter.service.ts
│   │   │   │   ├── queue.service.ts
│   │   │   │   ├── ticket.service.ts  # Concurrency-safe ticket operations
│   │   │   │   ├── notification.service.ts # Push & socket dispatch
│   │   │   │   └── audit.service.ts
│   │   │   ├── sockets/             # Socket.IO gateway, room handlers, auth
│   │   │   ├── types/               # Express request augmentations & types
│   │   │   ├── utils/               # Timezone, sequence formatters, crypto
│   │   │   ├── validators/          # Zod validation schemas
│   │   │   ├── app.ts               # Express application initialization
│   │   │   └── server.ts            # HTTP & Socket.IO server bootstrap
│   │   ├── tests/                   # Unit, integration, and concurrency tests
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                         # React + Vite + Tailwind CSS Frontends
│   │   ├── public/                  # Assets, favicons, logos
│   │   ├── src/
│   │   │   ├── api/                 # Axios / Fetch client with token interceptors
│   │   │   ├── components/          # Reusable UI component library:
│   │   │   │   ├── ui/              # Buttons, inputs, modals, cards, badges, skeletons
│   │   │   │   ├── layout/          # AdminLayout, StaffLayout, AuthLayout, Navbar, Sidebar
│   │   │   │   └── feedback/        # Toast alerts, empty states, error boundaries
│   │   │   ├── context/             # AuthContext, SocketContext, NotificationContext
│   │   │   ├── hooks/               # Custom hooks (useAuth, useSocket, useQueue)
│   │   │   ├── routes/              # AppRouter with role-based RouteGuards
│   │   │   ├── views/
│   │   │   │   ├── auth/            # Login, Register, Forgot Password
│   │   │   │   ├── staff/           # Staff Operational Dashboard:
│   │   │   │   │   ├── CounterConsole.tsx
│   │   │   │   │   ├── WaitingQueueView.tsx
│   │   │   │   │   ├── TicketActionModal.tsx
│   │   │   │   │   └── StaffOverview.tsx
│   │   │   │   └── admin/           # Admin Dashboard:
│   │   │   │       ├── AdminOverview.tsx
│   │   │   │       ├── OrganizationsView.tsx
│   │   │   │       ├── BranchesView.tsx
│   │   │   │       ├── ServicesView.tsx
│   │   │   │       ├── CountersView.tsx
│   │   │   │       ├── StaffManagementView.tsx
│   │   │   │       ├── QueueConfigView.tsx
│   │   │   │       ├── AnalyticsView.tsx
│   │   │   │       └── AuditLogsView.tsx
│   │   │   ├── types/               # Web client TypeScript definitions
│   │   │   ├── utils/               # Date formatters, time elapsed, ticket formatters
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                      # Flutter Customer Application
│       ├── android/                 # Native Android configuration
│       ├── ios/                     # Native iOS configuration
│       ├── lib/
│       │   ├── core/
│       │   │   ├── constants/       # App constants, API endpoints, colors, theme
│       │   │   ├── network/         # Dio HTTP client, interceptors, error handling
│       │   │   ├── storage/         # SQLite / Drift local database & secure storage
│       │   │   ├── theme/           # Material 3 typography, palette, styles
│       │   │   ├── utils/           # Formatters, date utils, QR generators
│       │   │   └── widgets/         # Shared widgets (buttons, badges, skeletons, cards)
│       │   ├── features/
│       │   │   ├── auth/            # Login, register, profile, auth state (Riverpod)
│       │   │   ├── discovery/       # Service center search, map, branch details
│       │   │   ├── queue/           # Service selection, join queue, ticket booking
│       │   │   ├── ticket/          # Digital ticket view, live tracking, QR display, cancellation
│       │   │   ├── history/         # Ticket history list & detail view
│       │   │   └── notifications/   # In-app notification center & FCM integration
│       │   ├── routing/             # GoRouter configuration & route guards
│       │   └── main.dart            # Flutter application entrypoint
│       ├── test/                    # Widget and unit tests
│       └── pubspec.yaml
│
├── packages/
│   └── shared-types/                # Shared TypeScript models and DTOs
│       ├── src/
│       │   ├── enums.ts             # Statuses, roles, event types
│       │   ├── dtos.ts              # API request / response contracts
│       │   └── sockets.ts           # Socket event payloads
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                            # Architecture and design documentation
│   └── architecture/
│       ├── system-architecture.md
│       ├── database-schema.md
│       ├── roles-and-permissions.md
│       ├── api-specification.md
│       ├── project-structure.md
│       └── implementation-plan.md
│
├── package.json                     # Monorepo root workspace configuration
└── README.md
```
