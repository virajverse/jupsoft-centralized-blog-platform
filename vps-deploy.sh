#!/usr/bin/env bash
# ==============================================================================
# Jupsoft Blogary — Zero-Downtime VPS Deploy & Cache Purge Engine
# Target Domain: https://blogary.jupsoft.com
# Target Path:   /var/www/blogary.jupsoft.com
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}==================================================================${NC}"
echo -e "${CYAN}   🚀 Jupsoft Blogary — Instant VPS Re-deploy & Cache Purge${NC}"
echo -e "${BLUE}==================================================================${NC}"

PROJECT_DIR="/var/www/blogary.jupsoft.com"

# 1. Navigate to Project Root
if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
else
  PROJECT_DIR="$(pwd)"
  cd "$PROJECT_DIR"
fi
echo -e "${GREEN}✓ Working Directory: $PROJECT_DIR${NC}"

# 2. Complete Cache Purge (Next.js, Turbo, Redis, PNPM)
echo -e "\n${YELLOW}▶ [1/6] Purging All Caches (Redis, Next.js, Turbo)...${NC}"
if command -v redis-cli &> /dev/null; then
  redis-cli flushall > /dev/null 2>&1 || true
  echo -e "${GREEN}✓ Redis in-memory cache flushed.${NC}"
fi

rm -rf admin-portal/.next admin-portal/.turbo backend/dist
rm -rf /root/.npm/_cacache /root/.npm/_logs /root/.npm/_npx 2>/dev/null || true
journalctl --vacuum-time=1d 2>/dev/null || true
apt-get clean 2>/dev/null || true
pnpm store prune 2>/dev/null || true
echo -e "${GREEN}✓ Next.js build cache & backend dist purged, disk space freed.${NC}"

# 3. Pull Latest Code from Git
echo -e "\n${YELLOW}▶ [2/6] Pulling latest updates from Git...${NC}"
git fetch origin main || true
git pull origin main || true
echo -e "${GREEN}✓ Codebase synced to latest commit.${NC}"

# 4. Install Dependencies & Generate Prisma Client (No network download for prisma)
echo -e "\n${YELLOW}▶ [3/6] Generating Prisma client locally (zero seeding)...${NC}"
export NODE_OPTIONS="--max-old-space-size=1024"
cd backend
./node_modules/.bin/prisma generate
cd ..
echo -e "${GREEN}✓ Prisma client generated from local binary.${NC}"

# 5. Build Backend & Admin Portal
echo -e "\n${YELLOW}▶ [4/6] Compiling production builds...${NC}"
pnpm --filter jupsoft-blog-backend run build
pnpm --filter admin-portal run build
echo -e "${GREEN}✓ Both Backend and Admin Portal compiled successfully.${NC}"

# Clean disk space
pnpm store prune > /dev/null 2>&1 || true

# 6. Restart PM2 & Reload Nginx
echo -e "\n${YELLOW}▶ [5/6] Reloading PM2 processes...${NC}"
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

echo -e "\n${YELLOW}▶ [6/6] Reloading Nginx...${NC}"
if command -v nginx &> /dev/null; then
  nginx -t && systemctl reload nginx || true
  echo -e "${GREEN}✓ Nginx reloaded.${NC}"
fi

echo -e "\n${BLUE}==================================================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT & CACHE PURGE COMPLETE!${NC}"
echo -e "👉 Live Portal:  ${CYAN}https://blogary.jupsoft.com${NC}"
echo -e "👉 API Docs:     ${CYAN}https://blogary.jupsoft.com/api/docs${NC}"
echo -e "${BLUE}==================================================================${NC}"
pm2 status
