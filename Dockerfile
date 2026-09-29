# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

# Install build essentials & OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Install stable PNPM v9 to avoid PNPM v10 ignored builds error
RUN npm install -g pnpm@9.15.5

WORKDIR /app

# Copy monorepo workspace configuration & package manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy Prisma schema & generate client for multiple targets
COPY prisma ./prisma
RUN pnpm prisma:generate

# Copy source code for packages and backend
COPY packages ./packages
COPY apps/api ./apps/api

# Build types package and api application
RUN pnpm --filter @pulsetime/types build
RUN pnpm --filter @pulsetime/api build

# ==========================================
# Stage 2: Production Runner Stage
# ==========================================
FROM node:20-alpine AS runner

# Install OpenSSL and dumb-init for signal handling on Alpine
RUN apk add --no-cache openssl ca-certificates dumb-init bash

# Install stable PNPM v9 for runtime migrations/seeds
RUN npm install -g pnpm@9.15.5

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Copy all node_modules and built packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Create uploads folder for storage
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Expose Render default port
EXPOSE 10000

# Run entrypoint via dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/docker-entrypoint.sh"]
