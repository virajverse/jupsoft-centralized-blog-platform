# ROOT-CAUSE Analysis — admin-portal + backend (17-Oct-2026)
Focus: common error nahi, har bug KI JAD. Har RC ke saath 5-Why chain + class-fix.

## RC-1: Query-string double-`?` (Full Settings / tabs)
Symptom: `/settings?tab=general?site=X` (JupsoftDashboardView.tsx:530, JupsoftNavbar.tsx:635).
Why1: `siteQuery = ?site=X` me leading `?` hai (DashboardView:74).
Why2: usko `?tab=general` ke baad seedha concat kiya — `?...+?` = do `?`.
Why3: har file me apna local `const siteQuery` hai (9 definitions, 40+ usages grep me) — koi shared builder nahi.
Why4: Sidebar me ek jagah hack-fix hai (`&`+slice(1), Sidebar:319) lekin wo helper nahi bana, isliye doosri files me copy nahi hua.
Why5: URL-building ka koi unit test / lint rule nahi.
ROOT CAUSE: centralized `buildTenantUrl()` helper missing + copy-paste concat + partial hack-fix.
CLASS-FIX: `utils/tenantUrl.ts` me `buildUrl(path, {tab, site})` banao (URLSearchParams), siteQuery string banana ban karo, 1 test: `?tab + ?site => ?tab&site`.

## RC-2: POST /v1/revalidate bina auth (CRITICAL)
Symptom: controller 69-97 par ApiKeyGuard nahi, body me website/slug dekar cache flush.
Why1: class par sirf ApiKeyThrottlerGuard hai — ye rate-limit guard hai, auth guard nahi.
Why2: naam milte-julte hain (ApiKeyGuard vs ApiKeyThrottlerGuard) — likhne wale ne samjha throttler hi auth hai.
Why3: handleRequest override kuch select nahi karta (api-key-throttler.guard.ts:63-65 sirf super call) — false confidence.
Why4: `/v1` par "auth guard mandatory" ka koi lint/contract test nahi (health+revalidate exception list nahi bani).
Why5: x-signature header allowlist me hai (main.ts:284) lekin verify karne wala code revalidate me hai hi nahi — dead allowlist.
ROOT CAUSE: auth vs throttling guard ka naming-collision + missing route-contract test.
CLASS-FIX: `/v1/*` par default-deny: sab par ApiKeyGuard, sirf health open; revalidate par HMAC(timestamp<=5min) mandatory; `__tests__/route-guards.spec.ts` banao jo har /v1 route ka guard assert kare.


## RC-3: 10-saal session (3650d) — fail-open default chain
Symptom: JWT fallback 3650d (auth.service.ts:60-66) + cookie maxAge 3650d (auth.controller.ts:54,64) + frontend setCookie 3650 (apiClient.ts:100,154,167) + login max-age=315360000 (:89).
Why1: har layer ne apna magic number hardcode kiya — koi single SESSION_TTL source nahi.
Why2: env missing par fail-open fallback (|| 3650d) — secure default nahi, insecure default hai.
Why3: access-token cookie httpOnly:false rakha taaki proxy/document.cookie padh sake — Edge convenience ke liye security di.
Why4: proxy sirf presence check karta hai (proxy.ts:24), expiry/rotation verify nahi — lambi expiry pakdi nahi gayi.
Why5: startup env-validation nahi (JWT_SECRET check hai, expiry check nahi) — galat TTL prod tak slip hua.
ROOT CAUSE: distributed magic TTL + fail-open env fallback + convenience-over-security cookie + no startup TTL assertion.
CLASS-FIX: SESSION_ACCESS_TTL=15m / REFRESH_TTL=30d single source; missing par boot fail; cookie maxAge refresh se bind; access httpOnly:true + memory copy; startup assert access<=30m.

## RC-4: CORS over-permissive — dev-convenience prod me leak
Symptom: null/file:/c:/ allow (main.ts:170-180) + vercel/netlify allow (234-235) + DB tenant auto-allow (240-243) + credentials:true.
Why1: local HTML double-click + preview deploys ko unblock karne ke liye jaldi me allow kiya.
Why2: env-wise split nahi — ek hi CORS function dev+prod serve karta hai.
Why3: tenant-domain auto-trust: DB me domain aate hi origin trust — domain-ownership verify nahi.
Why4: ApiKeyGuard me bhi same allowlist copy (331-351) — fix ek jagah hoga, doosri chutegi.
Why5: CORS ka koi negative test nahi (evil origin expect-false).
ROOT CAUSE: single-env CORS + duplicated allowlist + auto-trust without verification.
CLASS-FIX: cors.config.ts banao (dev vs prod profile), prod me null/file/wildcard-preview off, tenant allow sirf GET public reads tak, cors.spec.ts me evil-origin test.

## RC-5: Prod CSP off (main.ts:105-111 contentSecurityPolicy undefined)
Symptom: prod me explicit CSP nahi.
Why1: Helmet default par bharosa — undefined pass karke default assume kiya.
Why2: CSP report-only mode kabhi try nahi hua — breakage ke dar se off rakha.
Why3: inline scripts hain (layout theme script) + Google GIS — nonce/hash planning nahi hui.
Why4: CSP header ka koi e2e assertion nahi.
ROOT CAUSE: implicit-security reliance + no CSP rollout plan.

## RC-6: Media/support websiteId missing par pehla website pick (cross-tenant misplace)
Symptom: media.service.ts:121-126 + support.service.ts:53-62 (findFirst fallback, support me 'site-cloud' tak hardcoded).
Why1: frontend kabhi websiteId bhool sakta hai (query vs body, media controller 63-70 dono dekhta hai).
Why2: fail-open fallback dala taaki upload/ticket na tute — galat tenant par file/ticket gayi to bhi 200 mila.
Why3: presigned-url flow me websiteId required hai, server-upload/support me optional jaisa behave — flow contracts alag.
Why4: S3 key me tenantSlug hai lekin DB websiteId alag ho sakta hai — key vs row mismatch.
Why5: iska cross-tenant fallback-case test nahi.
ROOT CAUSE: fail-open tenant fallback + dual-flow contract mismatch.
CLASS-FIX: websiteId mandatory karo (400 agar missing/'all' unresolvable), fallback + 'site-cloud' string hatao, tenant-resolve ek helper me lao.

## RC-7: Webhook default secret hardcoded fallback (wh_sec_jupsoft_default...)
Symptom: dispatcher 175 + 293 — WEBHOOK_DEFAULT_SECRET missing par static string.
Why1: dev me secret set karna bhool jate the, isliye fallback dala taaki dispatch na ruke (3 jagah: dispatcher 175+293, retry 51).
Why2: per-endpoint secret optional hai (addEndpoint 435 secret||'') — empty secret normal ban gaya.
Why3: serialize me secret empty primary-isr ko legacy single-URL me convert (107-112) — secret gayab dikhta hi nahi.
Why4: receiver side timestamp<=5min verify karta hai ya nahi, iska contract test nahi.
Why5: testPing bhi same fallback use karta hai — prod me test se real secret leak nahi, lekin weak sign hota hai.
ROOT CAUSE: fail-open crypto default + optional-secret model.
CLASS-FIX: prod boot par WEBHOOK_DEFAULT_SECRET mandatory (missing=boot fail), endpoint secret empty par dispatch block + warn, receiver verify test add karo.

## RC-8: Login ?redirect= open-redirect (proxy.ts:26-27 + login 74-90)
Symptom: redirect param seedha new URL(redirect)/router.push me.
Why1: deep-link UX ke liye redirect rakha, validation bhool gaye.
Why2: proxy Edge me hai — wahan DB/session check nahi, isliye presence-check hi auth samjha.
Why3: pathname.includes('.') static bypass (proxy 42) + matcher me login exclude (77) — redirect validation edge-case me chut gaya.
Why4: AuthGuard bhi pathname redirect banata hai (51-53) bina allowlist — do jagah same pattern copy.
Why5: redirect-target ka koi test nahi (//evil, https:evil).
ROOT CAUSE: Edge-convenience redirect + no shared allowlist validator.
CLASS-FIX: `isSafeRedirect()` helper (sirf same-origin path, // aur scheme reject), proxy+login+AuthGuard teeno me use, test me evil cases.

## RC-9: Docker standalone crash (admin Dockerfile vs next.config.ts)
Symptom: Dockerfile .next/standalone copy karta hai, config me output:'standalone' nahi.
Why1: PM2 `next start` se prod chal gaya — Docker path kabhi CI me build-test nahi hua.
Why2: Dockerfile backend se copy-paste hua (multi-stage), admin ke liye output flag bhool gaye.
Why3: pnpm@latest unpinned (Dockerfile) vs packageManager 11.24.0 — lockfile drift risk.
Why4: deploy.sh Docker use hi nahi karta (PM2 direct) — Dockerfile dead-code jaisa, audit me pakda.
Why5: docker build ka CI step nahi.
ROOT CAUSE: undead Dockerfile + no docker-build CI + copy-paste config drift.
CLASS-FIX: output:'standalone' add karo ya Dockerfile ko next-start pattern par lao, pnpm pin karo, CI me docker build --dry-run/test add karo. Tab tak Dockerfile par EXPERIMENTAL tag lagao taaki koi ise prod samajh ke na chalaye.

## RC-10: System-level pattern (sab bugs ki shared jad)
1. Fail-open defaults: 3650d, findFirst website, default webhook secret, CORS null/file allow — har jagah missing-config parAllow. FIX: fail-closed defaults + boot-time env assert.
2. No contract tests: /v1 guards, CORS evil-origin, redirect evil, URL builder, tenant-scope — FIX: 5 chhote spec files.
3. Copy-paste helpers: siteQuery 30+ jagah, CORS allowlist 2 jagah, TTL 4 jagah — FIX: 3 shared helpers (tenantUrl, cors.config, session.config).
4. Naming collision: ApiKeyGuard vs ApiKeyThrottlerGuard — FIX: ThrottlerGuard ka naam TenantRateLimitGuard karo.
5. Dead allowlists: x-signature header allow lekin verify nahi; SWAGGER_API_KEY gate lekin ?api_key= leak — FIX: allowlist ke saath verify-or-remove rule (lint me).

Ek-line me: bugs alag nahi hain — ek hi aadat (convenience fail-open + duplicate logic + no negative test) har jagah repeat hui hai. Upar ke 3 shared helper + 5 spec file + boot assert lagao to poori class khatm.

CLASS-FIX: report-only pehle, phir enforce; nonce for inline theme script; header assertion test.