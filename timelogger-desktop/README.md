# PulseTime Desktop Time Tracker

> PulseTime Desktop is a standalone, lightweight, cross-platform workforce time-tracking client built with Electron, React 18, TypeScript, Vite, and Tailwind CSS.

---

## 🌟 Key Features

- **Authoritative Time Tracking**: Server-synchronized punch-in / punch-out with millisecond accuracy.
- **Smart Idle Detection**: Real-time OS mouse & keyboard inactivity monitoring via `powerMonitor`.
- **Periodic Telemetry Ingestion**: Background heartbeats streaming active seconds, idle intervals, and active applications.
- **Automated Screenshot Pipeline**: Periodic high-resolution screen captures uploaded directly to presigned S3 / Local storage.
- **Shift & Break Management**: Instant break pause/resume with preset categories (Coffee, Lunch, Meeting, Rest).
- **Projects & Tasks Integration**: Real-time project & task assignment switching.
- **Offline Resilient Queue**: Automatically caches telemetry events during network interruptions and syncs when reconnected.
- **System Tray & Window Controls**: Minimize to system tray, custom frameless window, always-on-top pinning, live tray status tooltips.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 20.0.0`
- `pnpm` `>= 9.0.0`

### 1. Install Dependencies
```bash
cd timelogger-desktop
pnpm install
```

### 2. Run in Development Mode (Live Electron + React HMR)
```bash
pnpm dev
```

### 3. Build & Package Standalone Application
```bash
# Production bundle
pnpm build

# Distributable installer (.exe for Windows / .dmg for macOS / AppImage for Linux)
pnpm package
```

---

## 🔑 Default Connection & Demo Account

- **Default API Endpoint**: `http://localhost:4000/api/v1`
- **Employee Email**: `employee@demo.local`
- **Password**: `Password123!`
