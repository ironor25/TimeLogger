#!/bin/sh
set -e

echo "================================================="
echo "  PulseTime Backend Starting (Render / Docker)   "
echo "================================================="

# Run Prisma Database Migrations
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Applying database migrations..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma || echo "⚠️ Migration command finished with warning."

  # Automatically ensure demo accounts & roles are seeded
  echo "🌱 Ensuring database has initial demo accounts and permissions..."
  node ./prisma/seed.js || echo "⚠️ Seed script completed with notices."
else
  echo "⚠️ DATABASE_URL environment variable is not set!"
fi

echo "🚀 Starting PulseTime API Server on port ${PORT:-10000}..."
exec node apps/api/dist/main.js
