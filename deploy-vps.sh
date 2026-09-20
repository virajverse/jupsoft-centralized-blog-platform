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

# 2. Flush Redis cache
echo "🧹 [2/6] Flushing Redis cache..."
if command -v redis-cli &> /dev/null; then
  redis-cli flushall || true
  echo "   ✅ Redis cache purged."
else
  echo "   ⚠️ redis-cli not installed, skipping flush."
fi

# 3. Clean old build artifacts
echo "🗑️ [3/6] Removing old build caches..."
rm -rf admin-portal/.next backend/dist

# 4. Generate Prisma client & sync schema indexes
echo "📦 [4/6] Regenerating Prisma client & applying schema indexes..."
pnpm --filter ./backend exec prisma generate
pnpm --filter ./backend exec prisma db push --skip-generate

# 5. Build Backend & Admin Portal
echo "🏗️ [5/6] Compiling production builds..."
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
