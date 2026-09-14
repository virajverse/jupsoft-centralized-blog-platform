# Infrastructure — TRD §18 + §21

## Architecture (TRD §18)

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Cloud (ap-south-1)                   │
│                                                                 │
│  Route 53 → ALB → ECS Fargate (NestJS Backend :4000)          │
│                         ↕ RDS PostgreSQL 16                    │
│                         ↕ ElastiCache Redis 7                  │
│                         ↕ S3 + CloudFront (media)             │
│                         ↕ SSM Parameter Store (secrets)       │
│                         ↕ CloudWatch Logs                      │
└─────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Local staging validation (mirrors AWS stack) |
| `ecs-task-definition.json` | ECS Fargate task definition (512 CPU / 1024MB) |
| `deploy.sh` | CI/CD deploy script — build, push ECR, update ECS service |

## Quick Deploy

```bash
# Set required env vars
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=<your-account-id>
export ECS_CLUSTER=jupsoft-cms-cluster
export SUBNET_IDS=subnet-xxx,subnet-yyy
export SECURITY_GROUP_IDS=sg-xxx

# Deploy
chmod +x infra/deploy.sh
./infra/deploy.sh
```

## SSM Parameters Required (TRD §18: secrets management)

```
/jupsoft/DATABASE_URL           → RDS PostgreSQL connection string
/jupsoft/REDIS_HOST             → ElastiCache endpoint
/jupsoft/REDIS_PORT             → 6379
/jupsoft/JWT_SECRET             → ≥64 char random string
/jupsoft/JWT_REFRESH_SECRET     → ≥64 char random string
/jupsoft/AWS_REGION             → ap-south-1
/jupsoft/AWS_S3_BUCKET          → jupsoft-blogs-storage
/jupsoft/CLOUDFRONT_DOMAIN      → https://cdn.jupsoft.com
/jupsoft/WEBHOOK_DEFAULT_SECRET → HMAC signing secret (TRD §15)
```

## Local Staging Validation

```bash
# Start full production stack locally
docker compose -f infra/docker-compose.prod.yml up --build -d

# Run migrations
docker compose -f infra/docker-compose.prod.yml exec backend \
  npx prisma db push

# Verify health
curl http://localhost:4000/v1/health
```
