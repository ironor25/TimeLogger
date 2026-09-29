# Authentication & Security Architecture

PulseTime implements an enterprise-grade authentication system supporting both web dashboard administrators and future background desktop agents.

---

## 1. Authentication Flows

### A. Web / Admin Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Payload**: `{ email, password }`
- **Output**: Access token (15m expiration), refresh token (7d expiration), user profile, organization info, and granted permissions list.

### B. Desktop Agent Login & Device Registration
- **Endpoint**: `POST /api/v1/agent/auth/login`
- **Payload**: `{ email, password, deviceIdentifier, deviceName, platform, platformVersion, appVersion }`
- **Output**: Authoritative employee identity, active work schedule, registered device record, and any active resumeable work session.

---

## 2. JWT Strategy & Token Rotation

1. **Access Token**: Short-lived (15 minutes), signed with `JWT_ACCESS_SECRET`. Contains `userId`, `organizationId`, and `employeeId`.
2. **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`. Stored hashed in the database.
3. **Token Rotation**: Each call to `/api/v1/auth/refresh` invalidates the previous refresh token and issues a new cryptographic pair.
4. **Instant Revocation**: Calling `POST /api/v1/auth/logout` revokes all active session tokens immediately.

---

## 3. Password Security
- Passwords are encrypted using salted **bcryptjs** (cost factor: 10).
- Password hashes are strictly excluded from all API responses and JSON serializations.
