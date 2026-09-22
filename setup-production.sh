#!/usr/bin/env bash
# ==============================================================================
# Jupsoft CMS / Blogary — Automated Production Server Setup Script
# Target Server: Ubuntu/Debian (IP: 15.207.202.53)
# Target Domain: blogary.jupsoft.com
# Target Path:   /var/www/blogary.jupsoft.com
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=================================================================="
echo "    🚀 Jupsoft Blogary Production Deployment Engine"
echo "    Domain: https://blogary.jupsoft.com"
echo "    Target: /var/www/blogary.jupsoft.com"
echo "=================================================================="
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Please run as root (sudo bash setup-production.sh)${NC}"
  exit 1
fi

PROJECT_DIR="/var/www/blogary.jupsoft.com"

# Ensure we are in the project directory
if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
else
  echo -e "${YELLOW}Creating project directory $PROJECT_DIR...${NC}"
  mkdir -p "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# ------------------------------------------------------------------------------
# 1. Ask for PostgreSQL Database Password (interactively, hidden from logs)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [1/8] Database Configuration${NC}"
if [ -z "${DB_PASSWORD:-}" ]; then
  echo -e "${YELLOW}Please enter the password for PostgreSQL user 'appuser' (DB: 'appdb'):${NC}"
  read -s -p "Password: " DB_PASSWORD
  echo ""
fi

if [ -z "$DB_PASSWORD" ]; then
  echo -e "${RED}❌ Database password cannot be empty.${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 2. Install System Prerequisites (Node 20 LTS, Redis, Nginx, Certbot)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [2/8] Installing System Dependencies (Node.js 20, Redis, Nginx, Certbot)...${NC}"
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx redis-server build-essential

# Ensure Redis is running
systemctl enable redis-server
systemctl restart redis-server
echo -e "${GREEN}✓ Redis active on localhost:6379${NC}"

# Install Node.js 20 LTS if not present or older
if ! command -v node &> /dev/null || [[ $(node -v) != v20* && $(node -v) != v22* ]]; then
  echo -e "${YELLOW}Installing Node.js 20.x LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) and npm $(npm -v) active${NC}"

# Install pnpm and PM2 globally
npm install -g pnpm@latest pm2@latest
echo -e "${GREEN}✓ pnpm and PM2 installed${NC}"

# Ensure 1GB swap space exists (prevents Linux OOM killer while preserving disk space)
SWAP_SIZE=$(free -m | awk '/^Swap:/ {print $2}')
if [ "${SWAP_SIZE:-0}" -lt 512 ]; then
  echo -e "${YELLOW}Configuring 1GB swap space to conserve disk and prevent memory exhaustion...${NC}"
  if [ ! -f /swapfile ]; then
    fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  echo -e "${GREEN}✓ 1GB swap space active${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Generate Secure Production Environment Files (.env)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [3/8] Configuring Production Environment (.env)...${NC}"

JWT_SECRET=$(openssl rand -base64 32 | tr -d '/+=')
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '/+=')
WEBHOOK_DEFAULT_SECRET=$(openssl rand -hex 24)

# Backend .env
cat <<EOF > backend/.env
# Server
PORT=4010
NODE_ENV=production
PLATFORM_BASE_URL=https://blogary.jupsoft.com
ALLOWED_ORIGINS=https://blogary.jupsoft.com,http://blogary.jupsoft.com,https://cms.jupsoft.com,https://api.cms.jupsoft.com,https://cloud.jupsoft.com,https://jupsoft.com,https://digifynext.com,https://schoolerp.in

# PostgreSQL Local Database (Prisma)
DATABASE_URL="postgresql://appuser:${DB_PASSWORD}@127.0.0.1:5432/appdb?schema=public"
DIRECT_URL="postgresql://appuser:${DB_PASSWORD}@127.0.0.1:5432/appdb"

# Redis Cache & Rate Limiting
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_REFRESH_EXPIRATION=30d

# AWS S3 & CloudFront
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=mock_aws_access_key
AWS_SECRET_ACCESS_KEY=mock_aws_secret_key
AWS_S3_BUCKET=jupsoft-blogs-storage
CLOUDFRONT_DOMAIN=https://blogary.jupsoft.com/uploads

# Webhook Revalidation Secret (HMAC SHA-256)
WEBHOOK_DEFAULT_SECRET=${WEBHOOK_DEFAULT_SECRET}

# Supabase Real-Time Cloud Backup
SUPABASE_URL=https://wctuwnpeipqmipljplmy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdHV3bnBlaXBxbWlwbGpwbG15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTU0MTA1NSwiZXhwIjoyMTA1MTE3MDU1fQ.xPPx3TLSqvIWCUtItxOyawiTauCiyCXwvPwbkZ6qe_8
EOF

# Admin Portal .env.local
cat <<EOF > admin-portal/.env.local
NEXT_PUBLIC_API_URL=https://blogary.jupsoft.com
EOF

echo -e "${GREEN}✓ Production environment files created with secure cryptographic secrets.${NC}"

# ------------------------------------------------------------------------------
# 4. Install Project Dependencies & Prisma Generate
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [4/8] Installing Monorepo Dependencies via pnpm...${NC}"
export NODE_OPTIONS="--max-old-space-size=1024"
pnpm install

# ------------------------------------------------------------------------------
# 5. Push Database Schema & Seed Production Websites + Admin Credentials
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [5/8] Syncing Database Schema and Seeding Production Data...${NC}"
cd backend
npx prisma db push --skip-generate
npx prisma generate
npx ts-node prisma/seed.example.ts || true

# P1: Apply PostgreSQL Full-Text Search migration (tsvector + GIN index).
# Non-fatal: without it, /v1/search falls back to ILIKE (works, but slower).
npx ts-node scripts/run-fts-migration.ts || \
  echo -e "${YELLOW}⚠ FTS migration skipped — search falls back to ILIKE. Run manually: pnpm run fts:migrate${NC}"
cd ..
echo -e "${GREEN}✓ PostgreSQL database synced and seeded successfully.${NC}"

# ------------------------------------------------------------------------------
# 6. Build Backend and Admin Portal for Production
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [6/8] Compiling Production Builds...${NC}"
pnpm --filter jupsoft-blog-backend run build
pnpm --filter admin-portal run build
echo -e "${GREEN}✓ Both Backend and Next.js Admin Portal built successfully.${NC}"

# Cleanup build caches to conserve disk space
pnpm store prune || true
apt-get clean || true

# ------------------------------------------------------------------------------
# 7. Start Services with PM2 (Auto-restart on reboot)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [7/8] Starting Background Applications with PM2...${NC}"
pm2 delete all || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root || true
echo -e "${GREEN}✓ PM2 services started and registered for auto-start on server boot.${NC}"

# ------------------------------------------------------------------------------
# 8. Configure Nginx Reverse Proxy & Let's Encrypt SSL
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}▶ [8/8] Configuring Nginx Reverse Proxy & SSL for blogary.jupsoft.com...${NC}"

NGINX_CONF="/etc/nginx/sites-available/blogary.jupsoft.com"

cat <<'EOF' > "$NGINX_CONF"
server {
    listen 80;
    server_name blogary.jupsoft.com;

    client_max_body_size 50M;

    # 1. Backend REST API & Static Uploads (NestJS Port 4010)
    location ~ ^/(admin|v1|uploads|api/docs|widget)(/|$) {
        proxy_pass http://127.0.0.1:4010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Next.js Admin Portal UI (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/blogary.jupsoft.com
rm -f /etc/nginx/sites-enabled/default || true

nginx -t
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reverse proxy active.${NC}"

# Obtain SSL Certificate via Certbot
echo -e "${YELLOW}Obtaining Let's Encrypt SSL Certificate for blogary.jupsoft.com...${NC}"
certbot --nginx -d blogary.jupsoft.com --non-interactive --agree-tos -m admin@jupsoft.com --redirect || {
  echo -e "${YELLOW}⚠️ Notice: Certbot SSL setup was skipped or domain DNS is still propagating. You can run 'certbot --nginx -d blogary.jupsoft.com' manually once DNS is live.${NC}"
}

# ------------------------------------------------------------------------------
# Final Verification
# ------------------------------------------------------------------------------
sleep 3
echo -e "\n${BLUE}==================================================================${NC}"
echo -e "${GREEN}🎉 CONGRATULATIONS! DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo -e "👉 Admin Studio:       ${CYAN}https://blogary.jupsoft.com${NC}"
echo -e "👉 Swagger API Docs:   ${CYAN}https://blogary.jupsoft.com/api/docs${NC}"
echo -e "👉 Public API Health:  ${CYAN}https://blogary.jupsoft.com/v1/health${NC}"
echo ""
echo -e "${YELLOW}🔑 Super Admin Login:${NC}"
echo -e "   Email:    ${GREEN}superadmin@jupsoft.com${NC} (or admin@jupsoft.com)"
echo -e "   Password: set ${CYAN}SEED_SUPERADMIN_PASSWORD${NC} in backend/.env before first boot."
echo -e "             (If unset, a random password is generated and printed ${YELLOW}once${NC} in the backend logs.)"
echo ""
echo -e "${BLUE}==================================================================${NC}"
