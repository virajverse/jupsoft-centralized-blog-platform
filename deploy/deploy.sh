#!/usr/bin/env bash
# ==============================================================================
# Jupsoft Centralized Blog Platform — Enterprise Zero-Conflict Deploy Engine
# Target: https://blogary.jupsoft.com
#
# Usage on VPS (run after every git push):
#   bash deploy/deploy.sh              -> Smart zero-conflict update & reload
#   bash deploy/deploy.sh --clean      -> Clean rebuild with full cache flush
#   bash deploy/deploy.sh --force      -> Force reinstall all dependencies
# ==============================================================================

set -eo pipefail

# ------------------------------------------------------------------------------
# 0. Concurrency Lock & Workspace Directory Resolution
# ------------------------------------------------------------------------------
LOCK_FILE="/tmp/jupsoft_blogary_deploy.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  echo "⚠️ Another deployment is currently in progress. Exiting to avoid conflicts."
  exit 1
fi

# Resolve root workspace directory whether called from root or deploy/ folder
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" == */deploy ]]; then
  WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  WORKSPACE_ROOT="$SCRIPT_DIR"
fi
cd "$WORKSPACE_ROOT"

MODE="update"
if [[ "${1:-}" == "--clean" ]] || [[ "${1:-}" == "--force" ]]; then
  MODE="clean"
fi

echo "===================================================================="
echo "🚀 Jupsoft Enterprise Deploy Engine (Zero-Conflict Post-Push Sync)"
echo "   Target   : https://blogary.jupsoft.com"
echo "   Mode     : $MODE"
echo "   Directory: $WORKSPACE_ROOT"
echo "   Time     : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "===================================================================="

# ------------------------------------------------------------------------------
# 1. Environment Backup (Defense-in-Depth against accidental wipes)
# ------------------------------------------------------------------------------
echo "🔒 [1/7] Snapshotting production environment configurations..."
BACKUP_DIR="/tmp/jupsoft_env_backup_$(date +%s)"
mkdir -p "$BACKUP_DIR"

[ -f .env ] && cp .env "$BACKUP_DIR/root.env" 2>/dev/null || true
[ -f backend/.env ] && cp backend/.env "$BACKUP_DIR/backend.env" 2>/dev/null || true
[ -f admin-portal/.env ] && cp admin-portal/.env "$BACKUP_DIR/admin.env" 2>/dev/null || true
[ -f admin-portal/.env.local ] && cp admin-portal/.env.local "$BACKUP_DIR/admin.local.env" 2>/dev/null || true

restore_env_if_missing() {
  if [ -d "$BACKUP_DIR" ]; then
    [ ! -f .env ] && [ -f "$BACKUP_DIR/root.env" ] && cp "$BACKUP_DIR/root.env" .env || true
    [ ! -f backend/.env ] && [ -f "$BACKUP_DIR/backend.env" ] && cp "$BACKUP_DIR/backend.env" backend/.env || true
    [ ! -f admin-portal/.env ] && [ -f "$BACKUP_DIR/admin.env" ] && cp "$BACKUP_DIR/admin.env" admin-portal/.env || true
    [ ! -f admin-portal/.env.local ] && [ -f "$BACKUP_DIR/admin.local.env" ] && cp "$BACKUP_DIR/admin.local.env" admin-portal/.env.local || true
  fi
}
trap restore_env_if_missing EXIT

# ------------------------------------------------------------------------------
# 2. Zero-Conflict Git Synchronization
# ------------------------------------------------------------------------------
echo "📥 [2/7] Fetching and syncing with GitHub origin/main..."

OLD_REV=$(git rev-parse HEAD 2>/dev/null || echo "INIT")

# Auto-stash any accidental dirty untracked files so pull never blocks
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  echo "   ⚠️ Local uncommitted modifications detected on VPS. Stashing..."
  git stash push -m "autostash-before-deploy-$(date +%s)" 2>/dev/null || true
fi

# Ensure remote origin is configured
git fetch origin main --prune || {
  echo "❌ Git fetch failed. Check network or GitHub credentials."
  exit 1
}

# Ensure checkout is on branch main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "   🔄 Switching branch from '$CURRENT_BRANCH' to 'main'..."
  git checkout -B main origin/main
fi

# Fast-forward / Hard sync to origin/main
git reset --hard origin/main

# Clean untracked build artifacts, keeping .env files safe
git clean -fd -e ".env" -e "backend/.env" -e "admin-portal/.env" -e "admin-portal/.env.local"

NEW_REV=$(git rev-parse HEAD 2>/dev/null || echo "$OLD_REV")
echo "   ✅ Synced cleanly: $(echo "$OLD_REV" | cut -c1-7) -> $(echo "$NEW_REV" | cut -c1-7)"

# Restore backed-up env files immediately
restore_env_if_missing

# Cross-heal: if backend/.env is present, propagate to root and admin if needed
ENV_SOURCE=""
if [ -f backend/.env ]; then
  ENV_SOURCE="backend/.env"
elif [ -f .env ]; then
  ENV_SOURCE=".env"
fi

if [ -n "$ENV_SOURCE" ]; then
  [ ! -f .env ] && cp "$ENV_SOURCE" .env
  [ ! -f backend/.env ] && cp "$ENV_SOURCE" backend/.env
  [ ! -f admin-portal/.env ] && cp "$ENV_SOURCE" admin-portal/.env
fi

# ------------------------------------------------------------------------------
# 3. Detect Changed Packages & Dependencies
# ------------------------------------------------------------------------------
echo "🔍 [3/7] Analyzing changed components..."
CHANGED_FILES="ALL"
if [[ "$OLD_REV" != "INIT" && "$OLD_REV" != "$NEW_REV" && "$MODE" != "clean" ]]; then
  CHANGED_FILES=$(git diff --name-only "$OLD_REV" "$NEW_REV" 2>/dev/null || echo "ALL")
fi

PKG_LOCK_CHANGED=false
PRISMA_CHANGED=false
BACKEND_CHANGED=false
FRONTEND_CHANGED=false

if [[ "$CHANGED_FILES" == "ALL" ]] || [[ "$MODE" == "clean" ]]; then
  PKG_LOCK_CHANGED=true
  PRISMA_CHANGED=true
  BACKEND_CHANGED=true
  FRONTEND_CHANGED=true
else
  echo "$CHANGED_FILES" | grep -q "pnpm-lock.yaml" && PKG_LOCK_CHANGED=true || true
  echo "$CHANGED_FILES" | grep -q "backend/prisma/schema.prisma" && PRISMA_CHANGED=true || true
  echo "$CHANGED_FILES" | grep -E -q "^backend/|^packages/" && BACKEND_CHANGED=true || true
  echo "$CHANGED_FILES" | grep -E -q "^admin-portal/|^packages/" && FRONTEND_CHANGED=true || true
fi

# ------------------------------------------------------------------------------
# 4. Dependency Installation
# ------------------------------------------------------------------------------
echo "📦 [4/7] Verifying monorepo dependencies..."
if [ "$PKG_LOCK_CHANGED" = true ] || [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ]; then
  echo "   ⚡ Dependencies or lockfile modified -> Running pnpm install..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
  echo "   ⏩ Dependencies up to date -> Skipping install."
fi

# ------------------------------------------------------------------------------
# 5. Database Schema & Prisma Client Generation
# ------------------------------------------------------------------------------
echo "🗄️ [5/7] Verifying database schema & Prisma client..."
if [ "$PRISMA_CHANGED" = true ] || [ ! -d "backend/node_modules/.prisma" ]; then
  echo "   ⚡ Generating Prisma client..."
  pnpm db:generate
else
  echo "   ⏩ Prisma schema unchanged -> Skipping client generate."
fi

# ------------------------------------------------------------------------------
# 6. Optimized Build
# ------------------------------------------------------------------------------
echo "🏗️ [6/7] Building modified applications..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=1536"

if [ "$BACKEND_CHANGED" = true ] || [ ! -d "backend/dist" ]; then
  echo "   ⚙️ Compiling NestJS Backend..."
  pnpm --filter ./backend build
else
  echo "   ⏩ Backend unchanged -> Skipping build."
fi

if [ "$FRONTEND_CHANGED" = true ] || [ ! -d "admin-portal/.next" ]; then
  echo "   🎨 Compiling Next.js Admin Portal..."
  pnpm --filter admin-portal build
else
  echo "   ⏩ Admin Portal unchanged -> Skipping build."
fi

# ------------------------------------------------------------------------------
# 7. Zero-Downtime Service Reload & Health Verification
# ------------------------------------------------------------------------------
echo "🔄 [7/7] Reloading production services with zero downtime..."

if command -v pm2 >/dev/null 2>&1; then
  # Gracefully reload PM2 processes with updated environment
  pm2 reload ecosystem.config.js --update-env 2>/dev/null \
    || pm2 restart ecosystem.config.js --update-env 2>/dev/null \
    || pm2 start ecosystem.config.js --update-env
  pm2 save 2>/dev/null || true
  echo "   ✅ PM2 processes gracefully reloaded."
else
  echo "   ⚠️ PM2 not found on host. Ensure services are running."
fi

if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
    echo "   ✅ Nginx configuration validated and reloaded."
  else
    echo "   ⚠️ Nginx test failed! Check /etc/nginx configuration."
  fi
fi

# Cleanup old backups older than 24h
rm -rf "$BACKUP_DIR" 2>/dev/null || true

# Post-flight Health Check (Probe port 4010 and 3000)
echo "🩺 Running post-deployment health check..."
HEALTH_OK=false
for i in {1..10}; do
  BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4010/v1/health 2>/dev/null || echo "000")
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 2>/dev/null || echo "000")
  
  if [[ "$BACKEND_STATUS" =~ ^(200)$ ]] && [[ "$FRONTEND_STATUS" =~ ^(200|307|308|401)$ ]]; then
    HEALTH_OK=true
    break
  fi
  sleep 1
done

echo "===================================================================="
if [ "$HEALTH_OK" = true ]; then
  echo "🎉 DEPLOYMENT SUCCESSFUL!"
  echo "   Backend HTTP : $BACKEND_STATUS"
  echo "   Frontend HTTP: $FRONTEND_STATUS"
  echo "   Live Portal  : https://blogary.jupsoft.com"
else
  echo "⚠️ Deployment completed, but health probe returned Backend: $BACKEND_STATUS, Frontend: $FRONTEND_STATUS."
  echo "   Check logs with: pm2 logs"
fi
echo "===================================================================="
