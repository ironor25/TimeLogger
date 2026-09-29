# Architecture & System Design

## 1. High-Level Architecture Overview

PulseTime is architected as a high-performance **Modular Monolith** designed for multi-tenant SaaS operations. The platform separates web administration from desktop telemetry ingestion while maintaining a single authoritative backend truth.

```
+-------------------------------------------------------------------------+
|                                Clients                                  |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |   Next.js 14 Web App  |              | Future Desktop Agent /   |   |
|   |  (Admins / Managers)  |              | Mock CLI Simulator       |   |
|   +-----------+-----------+              +------------+-------------+   |
+---------------|---------------------------------------|-----------------+
                | HTTPS (REST / JSON)                   | HTTPS (REST / JSON)
                v                                       v
+-------------------------------------------------------------------------+
|                           NestJS API Gateway                            |
|                                                                         |
|  [ TenantContext Middleware ] -> [ JWT Auth Guard ] -> [ RBAC Guard ]   |
|                                                                         |
|   +------------------------------------------------------------------+  |
|   |                        Core Domain Modules                       |  |
|   |  - Auth & Identity         - Work Sessions & Breaks              |  |
|   |  - Organization & Settings - Activity & Heartbeat Ingestion      |  |
|   |  - Employees & Roles       - Screenshot Pipeline & Metadata      |  |
|   |  - Schedules & Assignments - Attendance & Leave Management       |  |
|   |  - Projects & Tasks        - Approvals & Audit Logging           |  |
|   |  - Reporting Engine        - Object Storage Abstraction          |  |
|   +------------------------------------------------------------------+  |
+-------------------+--------------------+--------------------+-----------+
                    |                    |                    |
                    v                    v                    v
         +--------------------+  +---------------+  +---------------------+
         |   PostgreSQL 16    |  |    Redis 7    |  | S3-Compatible / Disk|
         |    Prisma ORM      |  | Caching / Jobs|  |   Object Storage    |
         +--------------------+  +---------------+  +---------------------+
```

---

## 2. Monorepo Organization

```
/
├── apps/
│   ├── web/                     # Next.js 14 App Router administration frontend
│   │   ├── src/app/             # Clean protected pages & routes
│   │   ├── src/components/      # UI components & layouts
│   │   └── src/lib/             # API client & auth state context
│   │
│   └── api/                     # NestJS Modular Monolith API server
│       ├── src/auth/            # User authentication & token rotation
│       ├── src/organizations/   # Tenant management & settings
│       ├── src/employees/       # Employee profile records
│       ├── src/work-sessions/   # Punch in/out & state machine
│       ├── src/activity/        # Activity heartbeat ingestion
│       ├── src/screenshots/     # Presigned URL upload & metadata
│       ├── src/schedules/       # Shift & schedule enforcement
│       ├── src/projects/        # Projects & task management
│       ├── src/leaves/          # Leave balances & approval flow
│       ├── src/attendance/      # Derived attendance summaries
│       ├── src/reports/         # Aggregated productivity metrics
│       ├── src/storage/         # S3 / Local filesystem adapter
│       └── src/audit/           # Audit trail logging
│
├── packages/
│   ├── types/                   # Shared TypeScript interfaces & enums
│   ├── config/                  # Shared linting & build configs
│   └── eslint-config/           # Monorepo ESLint presets
│
├── prisma/
│   ├── schema.prisma            # Master database schema
│   ├── seed.ts                  # Comprehensive demo seed generator
│   └── migrations/              # Automated SQL migration history
│
├── tools/
│   └── mock-agent/              # Developer CLI desktop agent simulation
│
├── docker-compose.yml           # Local dev infrastructure (Postgres, Redis, MinIO)
└── docs/                        # Complete technical documentation
```

---

## 3. Server-Authoritative Principle

Desktop clients and browser clients are treated as untrusted endpoints:
- **Timestamps & Durations**: The client never provides authoritative work session elapsed duration. The server calculates duration using UTC timestamps and validated break intervals.
- **Identity & Organization**: `organizationId` and `employeeId` are resolved strictly from verified server-side JWT session tokens.
- **Schedule Enforcement**: Punch-in permission, shift start windows, and day reset calculations are strictly evaluated by the backend.
