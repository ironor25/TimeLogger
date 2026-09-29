# Role-Based Access Control (RBAC) & Permissions

PulseTime features a flexible, granular permission-based authorization architecture.

---

## 1. System Roles

| Role | Target Persona | Scope |
| :--- | :--- | :--- |
| `OWNER` | Company Founders / Organization Root | Full root capabilities, organization lifecycle, billing, system configuration |
| `ADMIN` | HR Directors / Operations Managers | Full workforce management, work schedules, role assignments, report exports |
| `MANAGER` | Team Leads / Project Managers | Supervised team visibility, leave approvals, manual time validations |
| `EMPLOYEE` | Individual Contributors | Personal timer sessions, self attendance view, personal leave requests |

---

## 2. Granular Permissions Registry

```
employees.view           employees.create         employees.update         employees.delete
attendance.view          attendance.edit          attendance.approve
screenshots.view         screenshots.delete
projects.view            projects.create          projects.update          projects.delete
tasks.view               tasks.create             tasks.update             tasks.delete
reports.view             reports.export
leaves.view              leaves.apply             leaves.approve
settings.view            settings.update
roles.view               roles.manage
audit.view
```

---

## 3. Implementation in Code

Endpoints are protected via the `@RequirePermissions(...)` decorator and executed against `PermissionsGuard`:

```typescript
@Get('employee-summary')
@RequirePermissions('reports.view')
async getSummary(...) { ... }
```
