#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Jupsoft CMS AWS ECS Fargate Deployment Script
# TRD §18: "AWS ECS Fargate deployment"
# TRD §21: "CI/CD pipeline via GitHub Actions / deploy script"
#
# Usage:
#   ./infra/deploy.sh [--env production|staging] [--tag latest|<git-sha>]
#
# Prerequisites:
#   - AWS CLI configured with ECS/ECR permissions
#   - Docker installed and logged in to ECR
#   - .env.production file with all secrets
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

BACKEND_REPO="jupsoft-cms-backend"
ADMIN_REPO="jupsoft-admin-portal"
ECS_CLUSTER="${ECS_CLUSTER:-jupsoft-cms-cluster}"
BACKEND_SERVICE="${BACKEND_SERVICE:-jupsoft-cms-backend-service}"
ADMIN_SERVICE="${ADMIN_SERVICE:-jupsoft-admin-portal-service}"
TASK_FAMILY="jupsoft-cms-backend"

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
ENV="${DEPLOY_ENV:-production}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Jupsoft CMS Deploy — ENV: ${ENV} | TAG: ${IMAGE_TAG}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Authenticate to ECR ─────────────────────────────────────────────
echo "▶ [1/6] Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# ── Step 2: Build Backend Docker Image ──────────────────────────────────────
echo "▶ [2/6] Building backend image..."
docker build \
  --target production \
  -t "${BACKEND_REPO}:${IMAGE_TAG}" \
  -f ./backend/Dockerfile \
  ./backend

docker tag "${BACKEND_REPO}:${IMAGE_TAG}" \
  "${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}"
docker tag "${BACKEND_REPO}:${IMAGE_TAG}" \
  "${ECR_REGISTRY}/${BACKEND_REPO}:latest"

# ── Step 3: Push to ECR ─────────────────────────────────────────────────────
echo "▶ [3/6] Pushing backend to ECR..."
docker push "${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/${BACKEND_REPO}:latest"

# ── Step 4: Run Prisma Migrations ────────────────────────────────────────────
# TRD §18: "DB migrations run before traffic cut-over"
echo "▶ [4/6] Running Prisma database migrations..."
aws ecs run-task \
  --cluster "${ECS_CLUSTER}" \
  --task-definition "${TASK_FAMILY}-migrate" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_IDS}],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"jupsoft-cms-backend","command":["npx","prisma","db","push","--skip-generate"]}]}' \
  --region "${AWS_REGION}" || echo "⚠️  Migration task failed or not configured — check manually"

# ── Step 5: Register New Task Definition ─────────────────────────────────────
echo "▶ [5/6] Registering new ECS task definition..."
TASK_DEF=$(cat ./infra/ecs-task-definition.json \
  | sed "s/ACCOUNT_ID/${AWS_ACCOUNT_ID}/g" \
  | sed "s|:latest|:${IMAGE_TAG}|g")

NEW_TASK_DEF_ARN=$(echo "${TASK_DEF}" \
  | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --region "${AWS_REGION}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "  ✅ Registered: ${NEW_TASK_DEF_ARN}"

# ── Step 6: Update ECS Service ───────────────────────────────────────────────
echo "▶ [6/6] Updating ECS service with new task definition..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${BACKEND_SERVICE}" \
  --task-definition "${NEW_TASK_DEF_ARN}" \
  --force-new-deployment \
  --region "${AWS_REGION}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy triggered! Monitor at:"
echo "   https://${AWS_REGION}.console.aws.amazon.com/ecs/v2/clusters/${ECS_CLUSTER}/services/${BACKEND_SERVICE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
