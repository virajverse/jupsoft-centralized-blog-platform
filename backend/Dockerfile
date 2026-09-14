# ─────────────────────────────────────────────────────────────────────────────
# Jupsoft CMS Backend — Dockerfile (TRD §18 + §21)
#
# TRD §18: "Containerized on AWS ECS Fargate"
# TRD §21: "Node.js 20 LTS, pnpm, multi-stage build for minimal image size"
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy lockfile + manifests first (cache layer)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install all deps (including devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build NestJS app
RUN pnpm build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Only copy production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled dist and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

# TRD §18: Non-root user for security
RUN addgroup -S jupsoft && adduser -S cms -G jupsoft
USER cms

# TRD §21: Port 4000
EXPOSE 4000

# Health check (TRD §21: ECS health check)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/v1/health || exit 1

CMD ["node", "dist/src/main.js"]
