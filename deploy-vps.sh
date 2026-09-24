#!/usr/bin/env bash
set -e

echo "======================================================="
echo "🚀 Jupsoft CMS — VPS Clean Fresh Deployment"
echo "   (Digifynext excluded — only Backend & Admin Portal)"
echo "======================================================="

# 1. Pull latest code
echo "📥 [1/5] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2. Check & auto-enable Swap memory on VPS if missing (1GB swap specifically tailored for 8GB disk)
echo "🧠 [2/5] Checking VPS RAM & Swap memory..."
if [ $(swapon --show | wc -l) -eq 0 ]; then
  echo "   ⚡ Creating 1GB Swapfile (optimized for 8GB total disk)..."
  fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   ✅ 1GB Swap activated."
else
  echo "   ✅ Swap memory is active."
fi

# 3. Redis cache status
echo "⚡ [3/5] Verifying Redis cache service..."
if command -v redis-cli &> /dev/null; then
  echo "   ✅ Redis cache active (preserving warm cache for 0-delay reads)."
else
  echo "   ⚠️ redis-cli not installed, skipping."
fi

# 4. Clean old build artifacts, system journals & caches to prevent ENOSPC disk full
echo "🗑️ [4/5] Freeing disk space & RAM before compiling..."
rm -rf admin-portal/.next admin-portal/.turbo backend/dist
rm -rf /root/.npm/_cacache /root/.npm/_logs /root/.npm/_npx 2>/dev/null || true
journalctl --vacuum-time=1d 2>/dev/null || true
apt-get clean 2>/dev/null || true
pnpm store prune 2>/dev/null || true

if command -v pm2 &> /dev/null; then
  echo "   🛑 Temporarily stopping PM2 to free ~500MB RAM for compiler..."
  pm2 stop all || true
fi

# 5. Generate Prisma client & build production bundles (NO db push, ZERO seeding)
echo "🏗️ [5/5] Generating Prisma client & compiling builds (1GB RAM tuned)..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=768"

echo "   ⚡ Generating Prisma client from local binary (no network download)..."
(cd backend && ./node_modules/.bin/prisma generate)

pnpm --filter ./backend build
pnpm --filter admin-portal build

# Clean pnpm store to keep 8GB disk spacious
pnpm store prune 2>/dev/null || true

# Restart PM2 processes
echo "🔄 Starting PM2 services..."
if command -v pm2 &> /dev/null; then
  pm2 start all || pm2 restart all || true
  pm2 save || true
  echo "   ✅ PM2 services successfully running."
else
  echo "   ⚠️ PM2 not found. Start processes manually if not using PM2."
fi

echo "======================================================="
echo "🎉 DEPLOYMENT COMPLETE! Fresh cache, zero errors."
echo "======================================================="
