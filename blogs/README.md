# 📝 Migrated Content & Media Assets Hub

This directory contains migrated blog articles, high-resolution original visual assets, optimized Next-Gen WebP formats, and the automated cloud ingestion pipeline.

---

## 🗂️ Directory Layout

```
blogs/
├── digifynext/         # Structured Markdown source files for tenant articles
├── images/             # Original high-resolution source images
├── images-webp/        # Next-Gen WebP optimized image deliverables
└── upload-pipeline.js  # Node.js batch uploader to Jupsoft CMS API & S3 Storage
```

---

## ⚡ Running the Upload Pipeline

To ingest or re-synchronize local articles to the live Jupsoft Centralized CMS API:

```bash
# Upload all pending articles and sync assets
node blogs/upload-pipeline.js
```
