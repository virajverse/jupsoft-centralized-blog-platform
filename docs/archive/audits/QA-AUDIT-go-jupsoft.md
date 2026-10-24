# Full QA Audit — https://go.jupsoft.com (Jupsoft Shortly / JLMP)

Date: 2026-10-17 · Method: SpectraBrowser MCP (live Chrome, logged-in session) + source-code verification
Session user: **Viraj** (super_admin) · Tenant: Jupsoft Systems (`11111111-...-1111`)
Scope: every route, every nav/button, static vs live data, Redis/Fastify backend verification.

---

## 1. Stack verification (Redis + Fastify)

| Layer | Finding | Proof |
|---|---|---|
| Frontend | Next.js (App Router) | HTML served `/dashboard` → 200 text/html |
| Web server | nginx/1.24.0 (Ubuntu) | `server: nginx/1.24.0 (Ubuntu)` on `/api/proxy/*` |
| Backend | **NestJS on Fastify adapter** ✅ | `backend-nestjs/src/main.ts:119-124` → `new FastifyAdapter({ trustProxy })` |
| **Redis** | **LIVE ✅** | health body: `{"services":{"database":"ok","redis":"ok"}}` |
| Database | LIVE ✅ | health body: `database: "ok"` |
| CDN | Akamai edge cache | `x-cache: TCP_REFRESH_MISS → TCP_MEM_HIT`, `cache-control: public, max-age=900` |

**Redis is not a label — it is in the hot path.** Verified in code:
- `controllers/redirect.controller.ts` → `redis.getCachedLink()` / `setCachedLink()`, `redis.client.incr(clickCounter)`, tenant status cache
- `workers/click.processor.ts` → daily salt + visitor dedupe (`sadd`/`expire`)
- `common/interceptors/idempotency.interceptor.ts` → `get` / `setex`
- `workers/bulk.processor.ts`, `workers/screening.processor.ts`, `controllers/users.controller.ts`

Short-link cache test (server-side, warm): first hit **1311 ms** (MISS) → second hit **93 ms** (MEM_HIT). Caching works.

---

## 2. Page-by-page status (hard-load / refresh test)

Every route was loaded directly (not just SPA click). HTTP status from the live server.

| Route | Page | HTTP | Live data shown | Verdict |
|---|---|---|---|---|
| `/dashboard` | Dashboard | 200 | 22 links, 55 clicks, 5 recent | ✅ OK |
| `/links` | All Links | 200 | 22 links, 3 pages | ✅ OK |
| `/bulk` | Bulk CSV Studio | 200 | staging UI | ✅ OK |
| `/outcomes` | Outcomes & Revenue | 200 | 0 outcomes (empty state) | ✅ OK |
| `/qr` | QR Studio | 200 | link list | ✅ OK |
| `/reports` | Traffic Reports | 200 | 45 clicks / 40 unique / 7 bots | ✅ OK |
| `/tenants` | Tenants & Workspaces | 200 | 1 tenant | ✅ OK |
| `/users` | Users & Roles | 200 | 4 operators | ✅ OK |
| `/domains` | Custom Domains | 200 | 1 domain, live DNS 15.207.202.53 | ✅ OK |
| `/abuse` | Abuse & Security | 200 | 0 reports (empty state) | ✅ OK |
| `/apikeys` | API Keys | 200 | 9 keys | ✅ OK |
| **`/docs`** | **API Docs** | **404** | **`{"error":"Not found"}` — blank page** | ❌ **BROKEN** |
| `/profile` | My Account | 200 | Viraj, 24 scopes | ✅ OK |
| `/help` | Help & Knowledge Base | 200 | 6 guides | ✅ OK |
| `/` or `/landing` | Marketing landing | 200 | hero + nav | ✅ OK |
| `/login` | Login | 200 | form | ✅ OK |

**Result: 1 broken page out of all tested — `/docs` (API Docs).**

---

## 3. BUG-1 (P0) — API Docs page is dead on direct load

**What happens**
- Rail link **"API Docs"** points to `/docs` (verified: `API Docs -> /docs`).
- Clicking it *inside the app* works (SPA client-side navigation, 42 elements render).
- But **loading/refreshing/bookmarking/sharing `/docs` returns HTTP 404** with body `{"error":"Not found"}` and a blank page.
- Same happens from the in-app **"API Reference"** sub-tab → URL becomes `/docs` → hard refresh → 404.

**Proof**
- HTTP: `GET https://go.jupsoft.com/docs` → **404**, `content-type: application/json`, body `{"error":"Not found"}`
- Browser: `title=""`, `interactive elements = 0`
- Screenshot: raw `{"error":"Not found"}` page (`screenshots/qa/scr_ext_qa_1792223616.png`)

**Root cause (found in config)**
`nginx/host-go.jupsoft.com.conf`, line 65 — the frontend-route regex **does not include `docs`**:

```nginx
location ~ ^/(dashboard|overview|links|bulk|outcomes|qr|reports|analytics|tenants|users|domains|abuse|apikeys|profile|help|login|landing)/?$ {
    proxy_pass http://shortly_frontend;
}
```

Because `docs` is missing, `/docs` falls through to the catch-all:
```nginx
location / { proxy_pass http://shortly_backend; }   # line 99-101
```
→ Fastify backend answers `{"error":"Not found"}`.

**Fix (one line)**
```nginx
location ~ ^/(dashboard|overview|links|bulk|outcomes|qr|reports|analytics|tenants|users|domains|abuse|apikeys|docs|apidocs|profile|help|login|landing)/?$ {
    proxy_pass http://shortly_frontend;
}
```
Then `sudo nginx -t && sudo systemctl reload nginx`.

> Note: `src/main.ts` local dev gateway *does* include `/docs` and `/apidocs` (lines 34-35) — so this bug exists only in production nginx.

**Business impact:** every shared/bookmarked API Docs URL, every "open in new tab", and every refresh on that page shows a raw error. The developer-facing page (used to hand API keys to integrators) is unreachable by URL.

---

## 4. BUG-2 (P2) — Unknown URLs show raw JSON, no branded 404

Any non-route slug (`/randomxyz123`, `/settings`…) is caught by the short-link resolver and returns:
```json
{"success":false,"error":{"code":"NOT_FOUND","message":"Short link does not exist"}}
```
No styled 404 page, no "back to dashboard" link. A user who mistypes a URL sees developer JSON.
**Fix:** add a frontend `not-found` fallback for app-prefixed paths, or a friendly 404 in the backend catch-all.

---

## 5. Static / hardcoded elements (not wired to any API)

| # | Element | Location | Source | Impact |
|---|---|---|---|---|
| 1 | **"Avg Routing < 2ms"** | Dashboard KPI card | hardcoded literal `< 2ms` — `DashboardView.tsx:224` | Metric looks real but never changes; misleading KPI |
| 2 | **"P95 Redirect Latency: < 2ms"** | Reports CSV export row | hardcoded literal — `AnalyticsView.tsx:375` | Exported report contains a constant, not measured latency |
| 3 | **"5 Tiers"** | Users → Role Hierarchy badge | hardcoded literal — `UsersView.tsx:364` | Accurate today (5 roles) but won't follow role changes |
| 4 | Server IP fallback **`122.176.33.17`** | Custom Domains | fallback — `DomainsView.tsx:42` | Only shows if API returns no `server_ip` (live shows correct 15.207.202.53) |

**Pages that are static by design (correct, no action):** `/help` (knowledge base), `/docs` API reference content, `/` & `/landing` marketing.

**Everything else is live** — proved by switching filters and watching values change:
- Dashboard range: **Today = 11 clicks, 7D = 37, 30D = 55** → real, dynamic.
- Links search: typing `vjps` → **22 links → 1 row** → real filtering.
- Pagination: page 2 first row changes (`qmsmtiosstd_app`) → real.

---

## 6. Functional / button QA (all clicked live)

| Action | Result |
|---|---|
| CREATE LINK (header) | ✅ Modal opens (Cancel / Create Link) |
| Refresh (header) | ✅ Re-fetches, no error |
| ALL TENANTS dropdown | ✅ Opens, lists "All Tenants" + "Jupsoft Systems", Add Tenant |
| Avatar "V" menu | ✅ Viraj / My Account / API Reference & Docs / Sign Out |
| System Notifications | ✅ Opens, no error |
| Settings sub-tabs | ✅ Tenants → Users → Domains → Abuse → API Keys → API Reference, URL updates each time |
| Links: status tabs | ✅ ACTIVE / EXPIRED / PERMANENT / ARCHIVE filter correctly |
| Links: pagination | ✅ "Showing 11-20 of 22 links", pages 1 2 3 |
| Links: search | ✅ filters (query `vjps` → 1 row) |
| Reports range buttons | ✅ 24H / 7D / 30D / 90D / All |
| Dashboard range buttons | ✅ values change per range |
| **Console errors** | **0 errors, 0 warnings** across all pages |

---

## 7. Performance snapshot

| Metric | Value |
|---|---|
| Dashboard load | 528 ms (TTFB 310 ms) |
| Dashboard transfer | 1014 kB / 20 resources |
| Short-link origin (cold) | 1311 ms |
| Short-link origin (Akamai MEM_HIT) | 93 ms |
| Health endpoint | 200, DB ok + Redis ok |

---

## 8. Priority fix list

| # | Sev | Issue | Fix | Where |
|---|---|---|---|---|
| 1 | **P0** | `/docs` (API Docs) 404 on direct load | add `docs|apidocs` to frontend-route regex | `nginx/host-go.jupsoft.com.conf:65` |
| 2 | P2 | Unknown URL → raw JSON, no 404 page | branded not-found fallback | frontend / backend catch-all |
| 3 | P2 | "Avg Routing < 2ms" hardcoded KPI | compute from real redirect timing, or label as "target" | `DashboardView.tsx:224` |
| 4 | P2 | "P95 Redirect Latency < 2ms" in CSV | wire to real telemetry or drop | `AnalyticsView.tsx:375` |
| 5 | P3 | "5 Tiers" hardcoded badge | derive from roles list | `UsersView.tsx:364` |

---

## 9. Seedha jawab (Hinglish)

- **Kaun sa page kaam nahi kar raha?** Sirf **API Docs (`/docs`)** — link app ke andar se click karo to khulta hai, par URL seedha kholo / refresh karo / share karo to **404 `{"error":"Not found"}`**. Baaki **saare pages theek chal rahe hai** (dashboard, links, bulk, outcomes, qr, reports, tenants, users, domains, abuse, apikeys, profile, help, login, landing).
- **Kaun static hai?** Help page, API Docs ka content, aur landing page by-design static hai (theek hai). Par **3 hardcoded numbers** mile jo API se nahi aate: Dashboard ka **"Avg Routing < 2ms"**, Reports CSV ka **"P95 Redirect Latency < 2ms"**, aur Users ka **"5 Tiers"** badge. Baaki sab data live hai (filter badalne par numbers badalte hai).
- **Redis + Fastify?** **Dono real hai.** Backend NestJS **Fastify adapter** par chalta hai, aur **Redis live hai** (`redis: "ok"`) — short-link redirect cache, click counting, idempotency sab Redis se chal raha hai. Cache test: pehla hit 1311ms → doosra 93ms (Akamai MEM_HIT).
- **Console:** 0 error, 0 warning. Buttons/modals/filters/pagination sab kaam kar rahe hai.

**Sabse pehle:** nginx conf line 65 me `docs` add karo — `/docs` turant theek ho jayega.
