# Stage 1: Base with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Install all dependencies
FROM base AS deps
COPY turbo.json pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages/
COPY apps/ws-server/package.json ./apps/ws-server/
RUN pnpm install --frozen-lockfile

# Stage 3: Build the app
FROM deps AS builder
COPY apps/ws-server ./apps/ws-server/
# Generate Prisma Client (req for @repo/db)
RUN cd packages/db && npx prisma generate
# Build all dependencies and the app
RUN pnpm run build --filter=ws-server...

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# Copy only what's needed for production
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/turbo.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/ws-server/ ./apps/ws-server/

# Install all dependencies (ws is a runtime dependency)
RUN pnpm install --frozen-lockfile
# Regenerate Prisma client in runner
RUN cd packages/db && npx prisma generate

CMD ["node", "apps/ws-server/dist/index.js"]