# Stage 1: Base with pnpm
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Stage 2: Install all dependencies
FROM base AS deps
COPY turbo.json pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages ./packages/
COPY apps/http-server/package.json ./apps/http-server/
RUN pnpm install --frozen-lockfile

# Stage 3: Build the app
FROM deps AS builder
COPY apps/http-server ./apps/http-server/
# Generate Prisma Client (req for @repo/db)
RUN cd packages/db && npx prisma generate
# Build all dependencies and the app
RUN pnpm run build --filter=http-server...

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# Copy only what's needed for production
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/turbo.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/http-server/ ./apps/http-server/

# Install all dependencies (runtime deps needed)
RUN pnpm install --frozen-lockfile
# Regenerate Prisma client in runner
RUN cd packages/db && npx prisma generate

CMD ["node", "apps/http-server/dist/index.js"]