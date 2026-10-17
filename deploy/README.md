# Jupsoft Blogary — Enterprise Deployment Guide

This directory contains the production deployment automation for **https://blogary.jupsoft.com**.

---

## ⚡ Quick Deployment (Post-Push)

Run this single command on your VPS whenever you push changes to GitHub:

```bash
bash deploy/deploy.sh
```
*(Alternatively, you can run `bash deploy.sh` from the repository root).*

---

## 🛡️ How "Zero Conflict" is Guaranteed

| Problem on VPS | How `deploy.sh` Solves It |
| :--- | :--- |
| **Local untracked changes / edits on VPS** | Automatically stashes dirty state (`git stash push -m autostash`) so `git pull` never fails. |
| **Tracked `.env` overwrite risk** | `.env` files are untracked and gitignored. `deploy.sh` makes an automatic backup before git sync and restores it immediately. |
| **Concurrent script executions** | Uses an exclusive flock lockfile (`/tmp/jupsoft_blogary_deploy.lock`). If run twice simultaneously, the second run waits or exits cleanly. |
| **Orphaned processes / ports locked** | Uses PM2 graceful reload (`pm2 reload ecosystem.config.js --update-env`) for 0-second downtime. |
| **Build failures leaving broken app** | Compiles only changed components. Runs a post-deployment health check against ports `4010` and `3000` to verify response before finishing. |

---

## ⚙️ Advanced Flags

```bash
# Standard fast update (diff-based build, zero downtime)
bash deploy/deploy.sh

# Full clean rebuild (wipes build caches and recompiles everything)
bash deploy/deploy.sh --clean

# Force reinstall all monorepo dependencies
bash deploy/deploy.sh --force
```

---

## 📋 Useful Server Commands

```bash
# Monitor live PM2 logs
pm2 logs

# Check application status & memory usage
pm2 status

# Restart individual services
pm2 restart blogary-backend
pm2 restart blogary-admin

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```
