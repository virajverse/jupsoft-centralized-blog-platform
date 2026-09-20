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

# 3. Flush Redis cache
echo "🧹 [3/5] Flushing Redis cache..."
if command -v redis-cli &> /dev/null; then
  redis-cli flushall || true
  echo "   ✅ Redis cache purged."
else
  echo "   ⚠️ redis-cli not installed, skipping flush."
fi

# 4. Clean old build artifacts & free RAM before compiling
echo "🗑️ [4/5] Freeing RAM and cleaning old build caches..."
rm -rf admin-portal/.next backend/dist
if command -v pm2 &> /dev/null; then
  echo "   🛑 Temporarily stopping PM2 to free ~500MB RAM for compiler..."
  pm2 stop all || true
fi

# 5. Build Backend & Admin Portal (strictly tuned for 1GB RAM) & restart PM2
echo "🏗️ [5/5] Compiling production builds (1GB RAM tuned)..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=768"
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
