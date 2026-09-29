#!/bin/sh
set -e

echo "================================================="
echo "  PulseTime Backend Starting (Render / Docker)   "
echo "================================================="

# Run Prisma Database Migrations
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Applying database migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️ Migration command finished with warning."

  # Optional auto-seed if SEED_DATABASE is true
  if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Checking and seeding database with initial accounts..."
    npx ts-node ./prisma/seed.ts || echo "⚠️ Seed script completed or skipped."
  fi
else
  echo "⚠️ DATABASE_URL environment variable is not set!"
fi

echo "🚀 Starting PulseTime API Server on port ${PORT:-10000}..."
exec node apps/api/dist/main.js
