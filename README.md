# QueueLess — Real-Time Smart Queue Management Platform

[![CI/CD Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/lelo/QueueLess)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20DB-336791?logo=postgresql)](https://neon.tech)
[![Node Express](https://img.shields.io/badge/Backend-Node%20%2B%20Express%20%2B%20Prisma-68a063?logo=nodedotjs)](https://nodejs.org)
[![React TypeScript](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61dafb?logo=react)](https://react.dev)
[![Flutter](https://img.shields.io/badge/Mobile-Flutter%20%2B%20Riverpod-02569B?logo=flutter)](https://flutter.dev)

QueueLess is a commercial-grade, multi-tenant digital queue management platform that eliminates physical queues across hospitals, banks, public services, and commercial service centers. Customers join queues remotely, monitor real-time positions, receive digital boarding passes with verification codes, while counter operators and facility administrators manage workflows through dedicated operational consoles.

---

## 🏛️ System Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │        Customer Mobile App (Flutter)    │
                      │  • Remote Queue Joining  • Live Boarding│
                      │  • Offline Pass Caching  • QR Scanning  │
                      └──────────────────┬──────────────────────┘
                                         │ HTTPS / Socket.IO
                                         ▼
┌─────────────────────────┐   ┌──────────────────────────────────┐   ┌─────────────────────────┐
│     Staff Dashboard     │   │      QueueLess API Engine        │   │     Admin Dashboard     │
│       (React/Vite)      │◄─►│ • Multi-Tenant RBAC & Isolation  │◄─►│       (React/Vite)      │
│ • Counter Station Ops   │   │ • Atomic Queue Sequence Engine   │   │ • Branch/Service Config │
│ • Atomic SKIP LOCKED    │   │ • PostgreSQL FOR UPDATE SKIP LOCK│   │ • Staff Roles & Audit   │
│ • Skip/Recall Workflows │   │ • Socket.IO Gateway & Push Alerts│   │ • Executive Analytics   │
└─────────────────────────┘   └──────────────────┬───────────────┘   └─────────────────────────┘
                                                 │
                                                 ▼
                              ┌──────────────────────────────────┐
                              │  PostgreSQL / Neon Hosted DB     │
                              │  • 16 Normalized Entities        │
                              │  • Row-Level Transaction Safety  │
                              │  • Prisma ORM Migrations         │
                              └──────────────────────────────────┘
```

---

## 🚀 Key Platform Features

1. **Strict Multi-Tenant Isolation**: Complete row-level boundary enforcement via `organizationId` and `X-Organization-Id` tenant middleware across all endpoints and socket rooms.
2. **Concurrency-Safe Sequence Generation**: Atomic sequence incrementation inside PostgreSQL transactions prevents duplicate tickets under heavy simultaneous load.
3. **Multi-Counter Dispatch with `SKIP LOCKED`**: Staff counter calls execute using PostgreSQL `SELECT ... FOR UPDATE SKIP LOCKED` inside isolated transactions, ensuring counters never receive duplicate tickets or block each other.
4. **Complete Ticket Lifecycle State Machine**:
   - `WAITING` $\rightarrow$ `CALLED` $\rightarrow$ `SERVING` $\rightarrow$ `COMPLETED`
   - `CALLED` $\rightarrow$ `SKIPPED` (requires mandatory audit reason)
   - `SKIPPED` $\rightarrow$ `RECALLED` (restores ticket to active service)
   - `WAITING` $\rightarrow$ `CANCELLED` (with reason)
5. **Real-Time WebSockets & Notifications**:
   - Dynamic Socket.IO rooms (`branch:{id}`, `queue:{id}`, `ticket:{id}`, `user:{id}`).
   - Instant staff queue synchronization and mobile push notifications.
6. **Mobile Offline Resilience**:
   - Customer tickets and boarding passes are cached in local client persistence.
   - Customers can inspect active tickets, view queue estimates, and present cryptographic pass codes without active cell service.

---

## 📁 Repository Structure

```
QueueLess/
├── apps/
│   ├── backend/             # Node.js + Express + Prisma + Socket.IO API
│   │   ├── prisma/          # 16-entity PostgreSQL Schema & Database Seeds
│   │   ├── src/             # Controllers, Services, Middleware, Routes, Sockets
│   │   ├── tests/           # 6 Jest automated test suites (33 tests)
│   │   └── Dockerfile       # Multi-stage production container
│   ├── web/                 # React + TypeScript + Vite + Tailwind CSS Dashboard
│   │   ├── src/views/admin/ # 8-tab Administration Portal & Analytics
│   │   ├── src/views/staff/ # Dedicated Counter Operator Console
│   │   └── Dockerfile       # Nginx production container
│   └── mobile/              # Flutter + Riverpod + GoRouter Customer App
│       ├── lib/             # Discovery, Boarding Pass, Scanner, Auth
│       └── test/            # 12 Automated Flutter & Widget tests
├── packages/
│   └── shared-types/        # Cross-platform TypeScript DTOs, Enums & Interfaces
├── docs/                    # Architecture, API Specifications, Database ERD
└── docker-compose.yml       # Production orchestration file
```

---

## 🛠️ Quick Start & Local Setup

### Prerequisites
- Node.js $\ge$ 20.x
- Docker & Docker Compose
- Flutter SDK $\ge$ 3.13.x (for mobile development)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/lelo/QueueLess.git
cd QueueLess
npm install
```

### 2. Start PostgreSQL Database
```bash
# Starts Postgres container on port 5433
docker run -d --name queueless-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=queueless_db \
  -p 5433:5432 \
  postgres:16-alpine
```

### 3. Initialize Database & Seed Demo Data
```bash
cd apps/backend
cp .env.example .env
npx prisma db push
npm run seed
```

#### Pre-Configured Demo Accounts:
| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@queueless.com` | `Admin@123456` | Platform Wide |
| **Org Owner** | `owner@metrohealth.org`| `Owner@123456` | Metro Health System |
| **Staff Operator** | `staff@metrohealth.org`| `Staff@123456` | Metro Health System |
| **Customer** | `customer@example.com` | `Customer@123456`| Mobile App User |

---

## 🧪 Running Automated Test Suites

### Run Backend API & Concurrency Tests (33 Tests)
```bash
npm --workspace=apps/backend test -- --runInBand
```

### Verify Web Production Bundle
```bash
npm --workspace=apps/web run build
```

### Run Flutter Customer Mobile Tests (12 Tests)
```bash
cd apps/mobile && flutter test
```

---

## 🐳 Production Deployment with Docker Compose

To deploy the entire production stack (PostgreSQL, Backend API, and Nginx Web Dashboard):

```bash
docker-compose up -d --build
```

- **Web Dashboard**: `http://localhost`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/v1/health`

---

## 📄 License
This project is licensed under the MIT License.
