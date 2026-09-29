# Admin REST API Reference

All endpoints are versioned under `/api/v1` and return uniform JSON payloads.

---

## 1. Response Envelopes

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Employee record does not exist in this organization",
    "details": {}
  }
}
```

---

## 2. Interactive Swagger / OpenAPI 3.0 Documentation

Interactive API documentation and schema explorers are served live:
- URL: `http://localhost:4000/api/docs`

---

## 3. Core Admin Endpoints Summary

| Method | Endpoint | Description | Required Permission |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Administrator & user login | Public |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated profile | Authenticated |
| `GET` | `/api/v1/organizations/settings` | Get organization configuration | `settings.view` |
| `PUT` | `/api/v1/organizations/settings` | Update configuration & thresholds | `settings.update` |
| `GET` | `/api/v1/employees` | List organization employees | `employees.view` |
| `POST` | `/api/v1/employees` | Create a new employee profile | `employees.create` |
| `GET` | `/api/v1/departments` | List company departments | `employees.view` |
| `GET` | `/api/v1/schedules` | List configured work schedules | `settings.view` |
| `POST` | `/api/v1/schedules` | Create new work schedule / shift | `settings.update` |
| `GET` | `/api/v1/work-sessions` | Query session history | `attendance.view` |
| `GET` | `/api/v1/screenshots` | Browse filtered user screenshots | `screenshots.view` |
| `DELETE` | `/api/v1/screenshots/:id` | Delete screenshot metadata | `screenshots.delete` |
| `GET` | `/api/v1/projects` | List projects & assignees | `projects.view` |
| `GET` | `/api/v1/tasks` | List project tasks | `tasks.view` |
| `GET` | `/api/v1/leaves/requests` | List leave requests | `leaves.view` |
| `POST` | `/api/v1/leaves/requests/:id/approve` | Approve leave request | `leaves.approve` |
| `GET` | `/api/v1/time-entries` | List manual time entry requests | `attendance.view` |
| `POST` | `/api/v1/time-entries/:id/approve` | Approve manual time entry | `attendance.approve` |
| `GET` | `/api/v1/reports/employee-summary` | Aggregated productivity matrix | `reports.view` |
| `GET` | `/api/v1/reports/timeline` | Visual daily timeline segments | `reports.view` |
| `GET` | `/api/v1/reports/export` | Export CSV report | `reports.export` |
