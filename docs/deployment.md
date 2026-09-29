# Production Deployment Guide: Render & Docker

PulseTime backend is fully optimized for **Render** using Docker, automated Prisma database migrations, seed data provisioning, JWT auth rotation, and health monitoring.

---

## 🚀 Option 1: 1-Click Render Blueprint Deployment (Recommended)

Render Blueprints allow you to deploy the PostgreSQL Database and NestJS API Docker web service simultaneously using the included [`render.yaml`](../render.yaml).

### Steps:
1. Push your repository to **GitHub** or **GitLab**:
   ```bash
   git add .
   git commit -m "feat: complete Docker & Render deployment setup"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your repository. Render will automatically detect [`render.yaml`](../render.yaml).
5. Click **Apply**.
   - Render will create the managed **PostgreSQL database** (`pulsetime-db`).
   - Render will build the **Docker image** using the multi-stage `Dockerfile`.
   - On startup, `docker-entrypoint.sh` automatically runs database migrations (`prisma migrate deploy`) and seeds the demo organization and users (`owner@demo.local`, `employee@demo.local`).
   - Your API will be live at: `https://pulsetime-api.onrender.com`.

---

## 🛠️ Option 2: Manual Setup on Render

If you prefer configuring services manually in the Render dashboard:

### Step 1: Create a PostgreSQL Database on Render
1. Click **New +** → **PostgreSQL**.
2. Name: `pulsetime-db`
3. Database: `pulsetime`
4. User: `pulsetime`
5. Plan: **Free** (or Starter)
6. Click **Create Database**.
7. Once created, copy the **Internal Database URL** (e.g. `postgresql://pulsetime:***@dpg-xxxx/pulsetime`).

### Step 2: Create a Web Service (Docker)
1. Click **New +** → **Web Service**.
2. Connect your Git repository.
3. Configuration:
   - **Language / Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Context Directory**: `.`
   - **Region**: Same as your database (e.g. `Oregon`)
   - **Plan**: **Free** (or Starter)
   - **Health Check Path**: `/api/v1/health`

### Step 3: Configure Environment Variables
In the **Environment** tab of your Web Service, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Render default port |
| `API_PREFIX` | `api/v1` | Global API route prefix |
| `DATABASE_URL` | `<Your Render Internal Database URL>` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | `<Click 'Generate' or enter 64-char key>` | Secret for Access Tokens |
| `JWT_REFRESH_SECRET` | `<Click 'Generate' or enter 64-char key>` | Secret for Refresh Tokens |
| `ACCESS_TOKEN_EXPIRES` | `15m` | Access token lifespan |
| `REFRESH_TOKEN_EXPIRES` | `7d` | Refresh token lifespan |
| `STORAGE_PROVIDER` | `local` | `local` disk storage or `s3` |
| `STORAGE_LOCAL_DIR` | `./uploads` | Local directory for screenshots |
| `SEED_DATABASE` | `true` | Auto-seed demo accounts on 1st run |

Click **Save Changes** and deploy.

---

## 🔍 Verification & Health Check

Once deployed, verify your backend:

- **Health Check**: `https://<your-render-app>.onrender.com/api/v1/health`
  - Returns `{ "status": "ok", "services": { "database": "healthy", "api": "healthy" } }`
- **Swagger Documentation**: `https://<your-render-app>.onrender.com/api/docs`
- **Authentication**: `POST https://<your-render-app>.onrender.com/api/v1/auth/login`

---

## 💻 Connecting Desktop App & Frontend to Render

1. **Desktop App**:
   - In `PulseTime.exe` settings/login screen, enter your Render URL:
     `https://<your-render-app>.onrender.com/api/v1`
2. **Web Frontend (Vercel / Render / Netlify)**:
   - Set environment variable:
     `NEXT_PUBLIC_API_URL="https://<your-render-app>.onrender.com"`
