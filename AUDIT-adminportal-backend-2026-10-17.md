# Admin-Portal + Backend — Deep Audit Report
Date: 17-Oct-2026 | Scope: admin-portal/ + backend/ | Branch: main clean (71df75c)

## 1. Executive Summary (seedha jawab)
- Backend architecture strong hai: NestJS 11 modules, Prisma, Redis L1+L2, dual rate-limit, audit logs.
- Auth flow strong hai (JWT+refresh rotation, lockout 5/15min, Google SSO gate) lekin session 10 saal ka hai = HIGH.
- RBAC backend authoritative (JwtAuthGuard+RolesGuard) + frontend UX gate (AuthGuard+proxy) = sahi design.
- Public API me 1 CRITICAL: POST /v1/revalidate bina auth ke cache flush karta hai.
- CORS over-permissive + prod CSP off = HIGH.
- Admin Docker standalone mismatch se Docker build tutega = MEDIUM.
- Admin indexable (robots/noindex missing) + Full Settings double-? bug abhi bhi hai = MEDIUM.
- Secrets hygiene clean: koi .env git me tracked nahi.

TOP 5 FIX:
1. POST /v1/revalidate par ApiKeyGuard+HMAC lagao (public-v1.controller.ts:69).
2. Prod CSP on karo (backend/src/main.ts:109).
3. Session 3650d fallback hatao, 15m/30d + httpOnly (auth.service.ts:60-66, auth.controller.ts:42-67, apiClient.ts:100).
4. Login redirect allowlist + reset-token rate-limit (login/page.tsx:74, proxy.ts:26, auth.controller.ts:228).
5. next.config.ts me output:standalone add karo (admin Dockerfile mismatch).

## 2. Backend findings (evidence ke saath)

### CRITICAL
C1 - POST /v1/revalidate unauthenticated:
- File: backend/src/modules/public-v1/public-v1.controller.ts:69-97
- Class par ApiKeyThrottlerGuard hai, lekin revalidateCache() par ApiKeyGuard nahi.
- Body me website/slug lekar invalidateBlogCache() call ho jata hai = anonymous cache flush / DoS assist.
- Fix: ApiKeyGuard + x-signature HMAC + timestamp<=5min mandatory karo.

### HIGH
H1 - 10 saal session fallback:
- backend/src/modules/auth/auth.service.ts:60-66 (JWT_EXPIRATION || 3650d)
- backend/src/modules/auth/auth.controller.ts:49-65 (cookie maxAge 3650d, auth cookie httpOnly:false)
- admin-portal/src/services/apiClient.ts:100,154,167,230 (setCookie 3650)
- admin-portal/src/app/login/page.tsx:89 (max-age=315360000)
- Fix: fallback hatao, 15m/30d enforce, access cookie httpOnly:true.

H2 - Token JS-readable:
- auth.controller.ts:49 httpOnly:false + apiClient localStorage mirror (143,156,227) + AuthGuard 31-40 + proxy.ts 24-28.
- proxy sirf presence check karta hai (Edge UX gate, theek hai), lekin XSS blast radius bada hai.
- Fix: access token memory-only, refresh httpOnly cookie, localStorage mirror hatao.

H3 - CORS over-permissive (credentials:true ke saath risky):
- backend/src/main.ts:114-273
- null/file:/c:/ allow (171-180), *.vercel/netlify allow (234-235,350-351), DB tenant domains allow (240-243).
- ApiKeyGuard me bhi same (331-351).
- Fix: prod me null/file hatao, preview explicit allowlist, tenant-origin sirf public reads tak.

H4 - Prod Helmet CSP off:
- backend/src/main.ts:105-111 (contentSecurityPolicy undefined/false).
- Fix: explicit CSP (script-src, connect-src, frame-ancestors) set karo.

### MEDIUM (backend)
M1 - validate-reset-token GET + enumeration check: auth.controller.ts:228-233. Response oracle mat do, auth_limit rate-limit me dalo.
M2 - Redis-down par login lockout bypass check: auth.service.ts:29-30. Negative test add karo.
M3 - SVG upload: media.controller.ts:58 svg+xml allowed, sharp WebP good, lekin XML-bomb guard lagao ya SVG hatao.
M4 - presigned/confirm tenant-scope assert: media.controller.ts:83-97. websiteId ko roleAssignments se match karo.
M5 - Swagger ?api_key= URL leak: main.ts:319-328. Header-only + IP allowlist karo.
M6 - Rate-limit mismatch doc: app.module 300/600 vs controller 120 vs nginx 30r/s. Matrix document karo.

### LOW (backend)
- 25MB JSON limit public /v1 par 1MB karo (main.ts:101).
- /uploads local serve prod me off karo (main.ts:75).
- tenantCache multi-instance strategy doc karo (api-key.guard.ts:44).
- Custom isValidAdminJwt ki jagah jsonwebtoken.verify.
- Logs me PII mask karo. /v1/health me version/commit mat do.

## 3. Admin-portal findings
H5 - Google CID hardcoded fallback: login/page.tsx:69-70. Env mandatory karo.
M7 - Docker standalone mismatch: Dockerfile .next/standalone copy vs next.config.ts me output missing = Docker crash. output:standalone add karo.
M8 - Indexable admin: robots.ts/sitemap missing, layout.tsx me robots noindex nahi. robots Disallow:/ + noindex + Nginx X-Robots-Tag.
M9 - ignoreBuildErrors:true (next.config.ts:8). CI me tsc --noEmit gate rakho.
M10 - Full Settings double-?: JupsoftDashboardView.tsx:74+530 (/settings?tab=general?site=). Sidebar:319 wala & pattern reuse karo.
L1 - Open-redirect ?redirect=: login/page.tsx:74-83 + proxy.ts:26. Same-origin allowlist.
L2 - proxy matcher includes('.') bypass note + AuthGuard second layer rakho.
L3 - Zustand persist me token/currentUser/tempPassword mat rakho.
L4 - Avatar allowlist wide: data:image ko png|jpeg|webp tak restrict karo.

## 4. RBAC verify
- Backend authoritative: JwtStrategy inactive reject + 60s cache. RolesGuard isGlobal+websiteId scope. PermissionsGuard granular. Controllers par @Roles present (blogs/users/websites/webhooks/support). GET blogs list/detail service-level scope par depend = tests green rakho.
- Frontend UX only: proxy cookie-presence gate + AuthGuard module gate + heartbeat. Backend mismatch par backend jeetega = sahi.

## 5. Deploy/config
- Git me koi .env tracked nahi (sirf .env.example). .gitignore OK.
- ecosystem.config.js + deploy.sh (lock/env-backup/diff-build/PM2 reload/health probe) OK.
- Fix: probe /api/health -> /v1/health karo. nginx me /v1/* + missing admin/auth/* patterns add karo. admin Dockerfile pnpm pin karo (11.24.0).

## 6. Priority table
P0: /v1/revalidate auth+HMAC | prod CSP | 3650d session fix.
P1: CORS tight | Docker standalone | admin noindex | redirect allowlist | Full Settings URL.
P2: SVG guard | Swagger header-only | nginx routes | probe path | Google CID env | tsc gate.

## 7. Kya sahi hai (retain)
Throttling layers, whitelist pipe, sanitize-html, sharp WebP, HMAC webhooks+SSRF guard+retry, Redis L1+L2, Prisma audit logs, PM2 zero-downtime, live QA 0 console errors + branded 404.

Note: is report me koi live secret expose nahi kiya gaya.
