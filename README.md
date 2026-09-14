# 🚀 Jupsoft Centralized Multi-Site Blog Management Platform

[![Architecture](https://img.shields.io/badge/Architecture-Decoupled%20Next.js%20%2B%20NestJS-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20Redis%207-336791.svg)](#)
[![TRD](https://img.shields.io/badge/TRD-Version%201.0-orange.svg)](./blog-platform-trd.pdf)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)

Enterprise multi-tenant content management hub designed to power all Jupsoft domains and client properties from a single high-velocity administrative studio.

> 📖 **Full System Architecture & Fresh Machine Setup Guide:**  
> See [**`CONTEXT.md`**](./CONTEXT.md) for the complete operational blueprint, fresh laptop setup instructions, database models, and TRD compliance breakdown.

---

## 📦 Monorepo Structure

```
company-work/
├── 🌐 admin-portal/        ➔ Next.js 16.3.5 (App Router, Tailwind v4, Zustand, Tiptap Studio)
├── ⚙️ backend/             ➔ NestJS 11 (Modular REST API, JWT RBAC, Prisma, Redis Caching)
├── 📚 docs/                ➔ Full TRD Delivery Documentation & Architecture Diagrams
├── 🐳 infra/               ➔ Production AWS ECS Task Definitions & Docker Compose scripts
├── 📄 CONTEXT.md           ➔ Complete Developer Onboarding, Architecture & Fresh PC Setup Guide
├── 📄 blog-platform-trd.pdf➔ Official Jupsoft Technical Requirement Document (TRD v1.0)
├── 📄 package.json         ➔ Monorepo workspace configuration (pnpm)
└── 📄 pnpm-workspace.yaml  ➔ Monorepo package linking
```

---

## ⚡ Quick Start on a Fresh Laptop

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start PostgreSQL 16 & Redis 7 Docker containers
cd backend
docker compose up -d

# 3. Sync database models & seed initial tenant websites + admin credentials
pnpm exec prisma db push
pnpm run prisma:seed

# 4. Start development servers concurrently
cd ..
pnpm run dev
```

- **Admin Studio:** [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Database Studio (Visual UI):** `cd backend && pnpm exec prisma studio` (Opens [http://localhost:5555](http://localhost:5555))

---

## 📋 Technology Matrix

| Layer | Selected Technology | Purpose |
| :--- | :--- | :--- |
| **Admin Frontend** | Next.js 16.3.5 (App Router, TypeScript) | Linear-grade editorial studio, SSR/ISR, zero-CLS |
| **Styling & UI** | Tailwind CSS v4 + Lucide Icons | Obsidian deep-space design system |
| **Editor** | Tiptap WYSIWYG Editor | Structured JSON content, rich formatting |
| **Backend API** | NestJS (Node.js, TypeScript) | Modular architecture, dependency injection, guards |
| **ORM & Database** | Prisma ORM + PostgreSQL 16 Alpine | 11 strictly mapped multi-tenant tables |
| **Caching & Queue**| Redis 7 Alpine (AWS ElastiCache) | Sub-300ms public reads, session tokens, rate limits |
| **Object Storage** | AWS S3 + CloudFront CDN | Automated WebP compression pipeline & CDN delivery |
| **Deployment** | Docker + AWS ECS Fargate | Decoupled, containerized autoscaling architecture |

---

*Architected & Maintained by Viraj Srivastav (`virajverse`) for Jupsoft Systems Pvt. Ltd.*
