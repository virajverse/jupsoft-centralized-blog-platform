#!/usr/bin/env bash
# Forwarder script to deploy/deploy.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/deploy/deploy.sh" "$@"
