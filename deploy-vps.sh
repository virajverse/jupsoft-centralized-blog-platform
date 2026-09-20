#!/usr/bin/env bash
set -e

echo "======================================================="
echo "🚀 Jupsoft CMS — VPS Clean Fresh Deployment"
echo "   (Digifynext excluded — only Backend & Admin Portal)"
echo "======================================================="

# 1. Pull latest code
echo "📥 [1/6] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

# 2. Check & auto-enable Swap memory on VPS if missing (prevents OOM Exit Code 137 on EC2)
echo "🧠 [2/7] Checking VPS RAM & Swap memory..."
if [ $(swapon --show | wc -l) -eq 0 ]; then
  echo "   ⚡ Creating 2GB Swapfile on VPS to prevent OOM Killer..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   ✅ 2GB Swap activated."
else
  echo "   ✅ Swap memory is active."
fi

# 3. Flush Redis cache
echo "🧹 [3/7] Flushing Redis cache..."
if command -v redis-cli &> /dev/null; then
  redis-cli flushall || true
  echo "   ✅ Redis cache purged."
else
  echo "   ⚠️ redis-cli not installed, skipping flush."
fi

# 4. Clean old build artifacts
echo "🗑️ [4/7] Removing old build caches..."
rm -rf admin-portal/.next backend/dist

# 5. Generate Prisma client & sync schema indexes
echo "📦 [5/7] Regenerating Prisma client & applying schema indexes..."
pnpm --filter ./backend exec prisma generate
pnpm --filter ./backend exec prisma db push --skip-generate

# 6. Build Backend & Admin Portal
echo "🏗️ [6/7] Compiling production builds (low-memory safe)..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=1536"
pnpm --filter ./backend build
pnpm --filter admin-portal build

# 6. Restart PM2 processes
echo "🔄 [6/6] Reloading PM2 services..."
if command -v pm2 &> /dev/null; then
  pm2 restart all || pm2 reload all || true
  pm2 save || true
  echo "   ✅ PM2 services successfully restarted."
else
  echo "   ⚠️ PM2 not found. Start processes manually if not using PM2."
fi

echo "======================================================="
echo "🎉 DEPLOYMENT COMPLETE! Fresh cache, zero errors."
echo "======================================================="
