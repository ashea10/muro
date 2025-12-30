# Stage 1: Base with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/muro-frontend/package.json ./apps/muro-frontend/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS builder
COPY apps/muro-frontend/ ./apps/muro-frontend/
RUN pnpm build --filter=muro-frontend...

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets - standalone output preserves monorepo structure
# The standalone folder contains the full monorepo path to server.js
COPY --from=builder /app/apps/muro-frontend/.next/standalone ./
COPY --from=builder /app/apps/muro-frontend/.next/static ./apps/muro-frontend/.next/static
COPY --from=builder /app/apps/muro-frontend/public ./apps/muro-frontend/public

USER nextjs
EXPOSE 3000

# In monorepo standalone output, server.js is at apps/muro-frontend/server.js
CMD ["node", "apps/muro-frontend/server.js"]