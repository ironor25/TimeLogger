# Developer Setup & Contributing Guide

## 1. Local Environment Setup

### Step 1: Clone Repository & Install Dependencies
```bash
git clone <repository-url> pulsetime
cd pulsetime
pnpm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Launch Local Docker Infrastructure
```bash
docker compose up -d
```
Starts PostgreSQL on port `5434` and Redis on port `6380`.

### Step 4: Run Migrations & Seed Data
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### Step 5: Start Development Servers
```bash
pnpm dev
```
- API: `http://localhost:4000`
- Swagger Docs: `http://localhost:4000/api/docs`
- Web Dashboard: `http://localhost:3000`

---

## 2. Running the Desktop Mock Simulator

Test the entire telemetry and punch-in flow without a desktop application:
```bash
pnpm mock-agent
```

---

## 3. Running Automated Tests

```bash
# Unit & integration tests
pnpm test

# Multi-tenant data isolation security test
pnpm --filter @pulsetime/api test:e2e
```
