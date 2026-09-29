# Activity Ingestion & Idle Detection Engine

PulseTime treats activity telemetry as a continuous time-series stream distinct from screenshot capture.

---

## 1. Ingestion Pipeline

The desktop client sends periodic heartbeats (e.g. every 60–300 seconds) via `POST /api/v1/agent/activity/heartbeat`:
- `activeSeconds`: Authoritative active seconds during the window.
- `idleSeconds`: Period where no keyboard or mouse events occurred exceeding `idleThresholdMinutes`.
- `activeApplication`: Executable process or application name.
- `windowTitle`: Foreground window title.
- `keysPressed`, `mouseClicks`: Raw physical engagement telemetry.

---

## 2. Server-Side Classification

Every activity chunk is classified into distinct state buckets:
- `ACTIVE`: Normal user keyboard/mouse activity.
- `IDLE`: Prolonged inactivity exceeding the organization idle threshold.
- `BREAK`: Explicit break paused by employee.
- `MANUAL`: Time added via manual correction workflow.

---

## 3. High-Volume Scalability

To support high-concurrency ingestion across thousands of simultaneous agents:
1. `activity_records` is indexed on `[organizationId, employeeId, capturedAt]` for fast queries.
2. Reporting queries aggregate metrics directly in PostgreSQL using `SUM(activeSeconds)`, `SUM(idleSeconds)`, avoiding loading raw time-series rows into application memory.
3. The schema is architected to facilitate plug-and-play migration to ClickHouse or TimescaleDB for enterprise tiers.
