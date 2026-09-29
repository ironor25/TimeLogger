# PulseTime — SaaS Workforce Time-Tracking & Employee Productivity Platform

> PulseTime is an enterprise-ready, multi-tenant SaaS workforce time-tracking, attendance, and employee productivity intelligence platform built with NestJS, Next.js 14, PostgreSQL, Prisma ORM, Redis, and an authoritative server-side time calculation engine.

---

## 🏗️ Architecture & Technology Stack

- **Monorepo Structure**: `pnpm` workspaces (`apps/web`, `apps/api`, `packages/types`, `packages/config`, `tools/mock-agent`)
- **Backend API (`apps/api`)**: NestJS (TypeScript), Prisma ORM, PostgreSQL, Redis BullMQ-ready, JWT Authentication with Token Rotation & Granular RBAC, Swagger OpenAPI 3.0.
- **Web Admin Frontend (`apps/web`)**: Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, Lucide Icons.
- **Database (`prisma/`)**: PostgreSQL 16 with composite indexes, tenant isolation (`organizationId`), audit logging, and automated Prisma migrations.
- **Object Storage (`apps/api/src/storage`)**: Extensible storage abstraction with local disk adapter and AWS S3 / Cloudflare R2 / MinIO presigned URL integration.
- **Desktop Agent Integration (`tools/mock-agent`)**: REST API contract with device registration, authoritative punch-in/out, activity heartbeats, break management, and presigned screenshot uploads.

---

## ⚡ Quick Start & Run Instructions

### Prerequisites
- Node.js `>= 20.0.0`
- `pnpm` `>= 9.0.0`
- Docker & Docker Compose

### 1. Start Database & Cache
```bash
docker compose up -d
```
*Starts PostgreSQL 16 on port `5434` and Redis 7 on port `6380`.*

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Generate Prisma Client & Migrate Database
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Seed Database with Realistic Demo Data
```bash
pnpm prisma:seed
```
*Seeds Acme Technologies Inc. with 24 employees across Engineering, Design, HR, and Sales, realistic shifts, attendance, work sessions, heartbeats, and screenshots.*

### 5. Start Backend API & Next.js Frontend
```bash
# Start both in parallel:
pnpm dev

# Or in separate terminal windows:
pnpm dev:api    # Runs on http://localhost:4000 (Swagger: http://localhost:4000/api/docs)
pnpm dev:web    # Runs on http://localhost:3000
```

---

## 🔑 Demo Accounts & Credentials

| Role | Email | Password | Scope & Permissions |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@demo.local` | `Password123!` | Full organization root access, billing, and settings |
| **Admin** | `admin@demo.local` | `Password123!` | Full company management, schedules, approvals, reports |
| **Manager** | `manager@demo.local` | `Password123!` | Department/team supervision, approvals, schedules |
| **Employee** | `employee@demo.local` | `Password123!` | Self work sessions, attendance, leave application |

> ⚠️ **Security Notice**: These credentials and passwords are strictly for development/demo environments and MUST NOT be used in production.

---

## 🤖 Running the Developer Mock Desktop Agent

To simulate a real desktop client interacting authoritatively with the backend:
```bash
pnpm mock-agent
```
The simulation executes:
1. Employee login & desktop device registration
2. Fetching assigned projects and tasks
3. Authoritative server punch-in (`/agent/work-sessions/start`)
4. Streaming 300s active/idle application heartbeats (`/agent/activity/heartbeat`)
5. Starting and ending a coffee break (`/agent/work-sessions/break/*`)
6. Requesting presigned screenshot upload URL & saving metadata (`/agent/screenshots/*`)
7. Stopping work session (`/agent/work-sessions/stop`) and verifying final server duration calculations.

---

## 🧪 Testing

```bash
# Run unit & integration tests
pnpm test

# Run multi-tenant data isolation security test
pnpm --filter @pulsetime/api test:e2e
```

---

## 📚 Technical Documentation

Complete architecture blueprints and specification guides are available in [`docs/`](./docs):

- [Architecture Overview](./docs/architecture.md)
- [Database Schema & Indexing](./docs/database.md)
- [Authentication & JWT Token Rotation](./docs/authentication.md)
- [Multi-Tenancy & Tenant Isolation](./docs/multi-tenancy.md)
- [Admin REST API Reference](./docs/api.md)
- [Desktop Agent API Contract](./docs/desktop-agent-api.md)
- [Screenshot Ingestion & Presigned Storage](./docs/screenshots.md)
- [Activity Ingestion & Idle Detection Engine](./docs/activity-tracking.md)
- [Authoritative Time Calculation & Day Resets](./docs/time-calculation.md)
- [Role-Based Access Control (RBAC) & Permissions](./docs/permissions.md)
- [Production Deployment & Infrastructure](./docs/deployment.md)
- [Developer Setup & Contributing Guidelines](./docs/development.md)
