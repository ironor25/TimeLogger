# Desktop Agent API Contract

The `/api/v1/agent` namespace provides the authoritative contract for future desktop applications (built on Electron, Tauri, .NET, or Swift). The desktop client is treated as an untrusted telemetry producer.

---

## 1. Authentication & Device Registration

### `POST /api/v1/agent/auth/login`
**Request:**
```json
{
  "email": "employee@demo.local",
  "password": "Password123!",
  "deviceIdentifier": "MAC-ADDR-OR-UUID-12345",
  "deviceName": "MacBook Pro 16",
  "platform": "MACOS",
  "platformVersion": "Sonoma 14.5",
  "appVersion": "1.0.0"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    },
    "employee": {
      "id": "emp_uuid_123",
      "displayName": "John Doe",
      "employeeCode": "EMP-004"
    },
    "organization": {
      "id": "org_uuid_123",
      "name": "Acme Technologies",
      "timezone": "Asia/Kolkata",
      "screenshotIntervalMinutes": 5,
      "idleThresholdMinutes": 5
    },
    "device": {
      "id": "dev_uuid_123"
    },
    "currentSession": null
  }
}
```

---

## 2. Work Session Operations

### Start Session (Punch In)
`POST /api/v1/agent/work-sessions/start`
```json
{
  "deviceId": "dev_uuid_123",
  "projectId": "proj_uuid_456",
  "taskId": "task_uuid_789",
  "notes": "Working on frontend components"
}
```

### Stop Session (Punch Out)
`POST /api/v1/agent/work-sessions/stop`
```json
{
  "sessionId": "session_uuid_123",
  "notes": "Finished daily tasks"
}
```

### Break Operations
- Start Break: `POST /api/v1/agent/work-sessions/break/start` -> `{ sessionId, reason }`
- End Break: `POST /api/v1/agent/work-sessions/break/end` -> `{ sessionId }`

---

## 3. Activity Heartbeat Ingestion

`POST /api/v1/agent/activity/heartbeat`
```json
{
  "sessionId": "session_uuid_123",
  "deviceId": "dev_uuid_123",
  "capturedAt": "2026-09-27T10:30:00.000Z",
  "activeSeconds": 270,
  "idleSeconds": 30,
  "activeApplication": "Visual Studio Code",
  "windowTitle": "work-sessions.service.ts - PulseTime",
  "keysPressed": 140,
  "mouseClicks": 45
}
```

---

## 4. Screenshot Pipeline

1. **Request Presigned Upload URL**:
   `POST /api/v1/agent/screenshots/upload-url` -> `{ sessionId, mimeType: "image/jpeg", fileSize: 184500 }`
   Response provides `uploadUrl` and `storageKey`.
2. **Direct Upload**:
   Desktop uploads binary JPEG directly to `uploadUrl` via HTTP PUT.
3. **Complete Metadata**:
   `POST /api/v1/agent/screenshots/complete` -> `{ sessionId, storageKey, capturedAt, width: 1920, height: 1080, activityPercentage: 88 }`
