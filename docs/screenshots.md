# Screenshot Pipeline & Storage Abstraction

PulseTime prevents server bottlenecks by avoiding multi-megabyte binary screenshot uploads through the main API.

---

## 1. Presigned Upload Architecture

```
Desktop Agent                      PulseTime API                    Object Storage / Disk
     |                                   |                                   |
     |--- 1. Request Upload URL -------->|                                   |
     |    (session, mime, size)          |--- Generates Presigned URL ------>|
     |<-- 2. Returns {uploadUrl, key} ---|                                   |
     |                                                                       |
     |--- 3. Direct Binary PUT (Payload: JPEG/WebP) ------------------------>|
     |                                                                       |
     |--- 4. Register Metadata --------->|                                   |
     |    (activity %, dimensions)       |--- Persists Screenshot Record --->|
     |<-- 5. Confirmed Saved ------------|                                   |
```

---

## 2. Storage Adapters

The system provides a unified `StorageService` interface with hot-swappable providers:

1. **Local Filesystem Adapter (`LocalStorageService`)**:
   Used for local development without external dependencies. Serves uploads at `/api/v1/storage/upload` and stores files in `./uploads`.
2. **S3-Compatible Adapter (`S3StorageService`)**:
   Generates AWS S3, Cloudflare R2, or MinIO presigned `PutObject` and `GetObject` URLs with configurable expiration.

Configuration via `.env`:
```env
STORAGE_PROVIDER="local" # or "s3"
S3_BUCKET="pulsetime-screenshots"
S3_REGION="us-east-1"
S3_ENDPOINT="http://localhost:9000"
```

---

## 3. Privacy & Permission Controls
- Screenshot deletion is strictly restricted by `screenshots.delete` permission and organization settings (`allowScreenshotDelete`).
- Audit logs record all screenshot deletion requests including actor ID, client IP, and timestamp.
