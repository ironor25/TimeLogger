# Database Schema & Indexing Guide

PulseTime utilizes PostgreSQL 16 managed through Prisma ORM. The schema enforces strict multi-tenant isolation and includes intentional composite indexes for high-throughput activity ingestion and fast aggregated reporting.

---

## 1. Core Data Models

### Organization (`organizations`)
Represents the SaaS tenant root. Contains global configuration parameters including timezones, day reset hour, screenshot capture intervals, and idle timeout thresholds.

### User & UserOrganizationRole (`users`, `user_organization_roles`)
Decouples authentication identity (`User`) from tenant authorization. A single user identity can belong to an organization with a specific `Role`.

### Employee (`employees`)
Contains the workforce profile (display name, code, designation, department, manager reference, timezone). Tied to `User` via foreign key `userId`.

### WorkSchedule & ScheduleAssignment (`work_schedules`, `schedule_assignments`)
Defines shifts (e.g. General 09:00 - 18:30, Night Shift, Flexible). Assigned to employees with effective date ranges.

### WorkSession (`work_sessions`)
Authoritative record of work intervals. Tracks start/end timestamps, server-computed duration, source (`DESKTOP`, `WEB`, `MANUAL`), status (`ACTIVE`, `PAUSED`, `COMPLETED`), and active project/task association.

### WorkSessionBreak (`work_session_breaks`)
Captures pause/break intervals within a session with duration computed from UTC timestamps.

### ActivityRecord (`activity_records`)
Ingestion table for periodic client telemetry (active seconds, idle seconds, active application name, window title, keyboard/mouse intensity).

### Screenshot (`screenshots`)
Metadata for periodic desktop screen captures (presigned S3/local storage key, dimensions, file size, activity score).

---

## 2. Strategic Composite Indexes

To eliminate full table scans across millions of telemetry rows:

```prisma
// Work Sessions
@@index([organizationId, employeeId, startedAt])
@@index([organizationId, startedAt])
@@index([employeeId, status])

// Activity Records (High Volume)
@@index([organizationId, employeeId, capturedAt])
@@index([organizationId, capturedAt])
@@index([workSessionId])

// Screenshots
@@index([organizationId, employeeId, capturedAt])
@@index([organizationId, projectId])

// Attendance Records
@@index([organizationId, date])
@@index([employeeId, date])

// Audit Logs
@@index([organizationId, createdAt])
@@index([entityType, entityId])
```

---

## 3. Migrations & Maintenance

- **Generate Client**: `pnpm prisma:generate`
- **Apply Migrations**: `pnpm prisma:migrate`
- **Visual DB Studio**: `pnpm prisma:studio`
