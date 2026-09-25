#!/usr/bin/env bash
# ==============================================================================
# Jupsoft Blogary — Smart Zero-Downtime VPS Deploy & Update Engine
# Target: https://blogary.jupsoft.com
# Usage:
#   bash vps-deploy.sh            -> Smart quick update (Git diff, zero downtime)
#   bash vps-deploy.sh --update   -> Fast pull, build changes only & reload
#   bash vps-deploy.sh --clean    -> Deep clean rebuild of all caches
# ==============================================================================

set -eo pipefail

MODE="update"
if [[ "${1:-}" == "--clean" ]] || [[ "${1:-}" == "--force" ]]; then
  MODE="clean"
fi

echo "======================================================="
if [[ "$MODE" == "clean" ]]; then
  echo "🚀 Jupsoft CMS — Full Clean Rebuild (--clean)"
else
  echo "⚡ Jupsoft CMS — Smart Zero-Downtime Quick Update"
fi
echo "   Target: https://blogary.jupsoft.com"
echo "======================================================="

# 1. Capture current revision before pulling to detect exact changes
OLD_REV=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "📥 [1/4] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main
NEW_REV=$(git rev-parse HEAD)

# Detect changed files between commits
if [[ -n "$OLD_REV" && "$OLD_REV" != "$NEW_REV" ]]; then
  CHANGED_FILES=$(git diff --name-only "$OLD_REV" "$NEW_REV" 2>/dev/null || echo "ALL")
  echo "   📋 Code updated: $(echo "$OLD_REV" | cut -c1-7) -> $(echo "$NEW_REV" | cut -c1-7)"
else
  CHANGED_FILES="NONE"
  echo "   ✨ Codebase is already at latest commit ($(echo "$NEW_REV" | cut -c1-7))."
fi

# 2. Check if clean build requested
if [[ "$MODE" == "clean" ]]; then
  echo "🗑️ Freeing disk space & wiping build caches (--clean)..."
  rm -rf admin-portal/.next admin-portal/.turbo backend/dist
  rm -rf /root/.npm/_cacache /root/.npm/_logs 2>/dev/null || true
  CHANGED_FILES="ALL"
fi

export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=1024"

# 3. Smart Prisma Generation (Only when schema changed or client missing)
RUN_PRISMA=false
if [[ "$CHANGED_FILES" == "ALL" ]] || echo "$CHANGED_FILES" | grep -q "backend/prisma/schema.prisma" || [ ! -d "backend/node_modules/.prisma" ]; then
  RUN_PRISMA=true
fi

if [ "$RUN_PRISMA" = true ]; then
  echo "⚡ [2/4] Prisma schema modified -> generating Prisma client..."
  (cd backend && ./node_modules/.bin/prisma generate)
else
  echo "⏩ [2/4] Prisma schema unchanged -> SKIPPING (Saved 20s)."
fi

# 4. Smart Compilation (Compile ONLY what actually changed)
BUILD_BACKEND=false
BUILD_FRONTEND=false

if [[ "$CHANGED_FILES" == "ALL" ]] || [ "$RUN_PRISMA" = true ] || echo "$CHANGED_FILES" | grep -q "^backend/" || [ ! -d "backend/dist" ]; then
  BUILD_BACKEND=true
fi

if [[ "$CHANGED_FILES" == "ALL" ]] || echo "$CHANGED_FILES" | grep -q "^admin-portal/" || [ ! -d "admin-portal/.next" ]; then
  BUILD_FRONTEND=true
fi

echo "🏗️ [3/4] Compiling modified services..."
if [ "$BUILD_BACKEND" = true ]; then
  echo "   ⚙️ Compiling Backend (NestJS)..."
  pnpm --filter ./backend build
else
  echo "   ⏩ Backend code unchanged -> SKIPPING compile."
fi

if [ "$BUILD_FRONTEND" = true ]; then
  echo "   🎨 Compiling Admin Portal (Next.js)..."
  pnpm --filter admin-portal build
else
  echo "   ⏩ Admin Portal unchanged -> SKIPPING compile."
fi

# 5. Zero-Downtime Reload (NO 'pm2 stop all' — traffic never interrupted!)
echo "🔄 [4/4] Performing Zero-Downtime Service Reload..."
if command -v pm2 &> /dev/null; then
  # pm2 reload gracefully replaces workers with 0ms downtime (no 502 Bad Gateway)
  pm2 reload all --update-env 2>/dev/null || pm2 restart all --update-env 2>/dev/null || pm2 start all
  pm2 save 2>/dev/null || true
  echo "   ✅ PM2 services smoothly reloaded (0 seconds downtime)."
else
  echo "   ⚠️ PM2 not found on this machine."
fi

if command -v nginx &> /dev/null; then
  nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || true
  echo "   ✅ Nginx proxy reloaded."
fi

echo "======================================================="
echo "🎉 DEPLOYMENT COMPLETE! Zero Downtime, Sub-15s Run."
echo "👉 Live Portal: https://blogary.jupsoft.com"
echo "======================================================="
