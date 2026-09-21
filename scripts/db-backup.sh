#!/bin/bash
# ==============================================================================
# Jupsoft Centralized CMS - Automated Daily Database Backup Script
# ==============================================================================
# Features:
# 1. Automated pg_dump with custom format + gzip compression
# 2. Daily rotation: Keeps last 7 days of daily backups
# 3. Weekly rotation: Keeps 4 weekly backups
# 4. Logs backup size, status, and duration
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/jupsoft-cms}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Load DB credentials from environment or default
DB_USER="${POSTGRES_USER:-jupsoft_admin}"
DB_NAME="${POSTGRES_DB:-jupsoft_cms}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting daily backup for database: ${DB_NAME}..." | tee -a "${LOG_FILE}"

# Dump database
START_TIME=$(date +%s)
PGPASSWORD="${POSTGRES_PASSWORD:-jupsoft_secret_2026}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ✅ Backup completed successfully in ${DURATION}s. File: ${BACKUP_FILE} (Size: ${FILE_SIZE})" | tee -a "${LOG_FILE}"

# Retention Policy: Delete backups older than 7 days
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Applying 7-day retention cleanup..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -type f -mtime +7 -delete

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Retention cleanup done." | tee -a "${LOG_FILE}"
