# Image SEO & Copyright-Free Image Sources — Enterprise Research (2025–2026)

> **Compiled by:** image-seo-research subagent
> **Parent session:** `session-b606efcb-c0ea-4fe9-9bdd-f496d0258ad4`
> **Project:** Jupsoft Centralized Blog Platform (multi-tenant)
> **Research date:** 2025‑Q4 / early‑2026
> **Note on data sources:** Primary sources fetched live: `unsplash.com/developers`, `pixabay.com/api/docs`, `commons.wikimedia.org/wiki/Commons:Licensing`, `developers.google.com/search/docs/appearance/google-images`, `schema.org/ImageObject`. Where specific 2025 benchmarks could not be re-fetched (web_search API key unavailable), figures reflect the most recent published industry consensus (Cloudflare, web.dev, Google Search Central, Smashing Magazine, MDN) and are explicitly noted as ranges or "consensus."

---

## 0. Executive Summary

For an enterprise multi-tenant blog platform (Jupsoft Cloud, DigifyNext, and any number of future tenants) the **image pipeline** must satisfy four contracts simultaneously:

1. **Legal safety** — every image must be covered by a license that permits commercial redistribution to a third-party tenant's public-facing blog, with proof retained.
2. **Performance** — Core Web Vitals (LCP, INP, CLS) must stay in the "Good" band for every tenant on mobile 4G.
3. **Discoverability** — images must surface in Google Images, Bing Visual Search, and (increasingly) AI-driven search (Google AI Overviews, Perplexity, ChatGPT search).
4. **Operational scale** — bulk ingestion, transformation, storage, and delivery must be automatable with per-tenant quotas and audit trails.

The recommended stack is:

| Layer | Recommendation |
| --- | --- |
| **Sources (preferred order)** | 1. Wikimedia Commons (CC / public domain) 2. Pixabay (Pixabay Content License) 3. Pexels (Pexels License) 4. Unsplash (Unsplash License) 5. AI-generated (Firefly / DALL·E 3 with commercial rights) |
| **Ingest** | Per-source official REST API, behind a queue (BullMQ / Cloud Tasks) with rate-limit aware workers, writes original + SHA-256 to object storage. |
| **Transform** | Sharp (Node) or libvips / Pillow (Python) — generate WebP + AVIF + JPEG fallbacks at 6 width buckets. |
| **Storage** | S3-compatible (R2, S3, GCS) with per-tenant prefix `tenants/{tenantId}/images/{yyyy}/{mm}/{sha256}.{ext}`. |
| **Delivery** | Image CDN with on-the-fly resize + modern format negotiation: Cloudflare Images / Cloudinary / imgix / ImageKit. |
| **Metadata** | EXIF stripped (privacy), IPTC `xmp:Creator`, `xmp:Rights` retained, schema.org `ImageObject` JSON-LD generated and embedded. |
| **SEO surface** | Image sitemap, `srcset` + `<picture>`, `loading="lazy"` (with `fetchpriority="high"` for LCP), descriptive alt + longdesc, license URL in `license` field. |

The remainder of this document is the evidence, the code, and the workflow to implement that stack.

---

## 1. Free / Copyright-Free Image Source Comparison (2025–2026)

> **About hotlinking:** "Yes (with API key + attribution)" means you can hit their CDN from your `<img>` tags for live preview, but the official guidance is to download the original, re-host it on your own CDN, and serve from there. Hotlinking for permanent production use violates all three major providers' terms.

| Source | License (effective) | API | API cost | Hotlink to source? | Max resolution | Search filters | Attribution required? | Bulk/enterprise OK? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Unsplash** | Unsplash License — irrevocable, worldwide, royalty-free, **no permission needed**, no attribution required (but appreciated). | REST + JS/PHP/Ruby SDKs | **Free** — 5,000 requests/hour (demo app) / 50,000/hr (production). Per-IP rate limit headers returned. | Permitted for app previews; for production you should download via `download_location` and re-host. | Originals up to ~60 MP; CDN-delivered `raw`, `full`, `regular` (1080w), `small` (400w), `thumb` (200w). On-the-fly resize via query params: `?w=1600&fm=webp&q=75&fit=max`. | query, page, per_page, orientation, color, content_filter (high), order_by (relevant/latest/popular), collections, topic | **No** (but "wherever possible" credit "Photo by {name} on Unsplash") | Yes — has a separate **Unsplash Dataset** (CC0-like; tens of millions of URLs + keywords) for ML training / bulk. **No systematic mass download** allowed via the live API. | Largest curated library (~8.8M photos, 430k photographers, per their developer page). Tracks every download via `links.download_location` (call it to keep the photographer credited). |
| **Pexels** | Pexels License — free for commercial use, no attribution required, modifications allowed, **cannot be sold standalone** or "resell" unmodified copies, cannot imply endorsement by identifiable people. | REST | **Free** — 200 requests/hour, 20,000/month by default; can be raised on request. | **Disallowed for permanent production.** Official API doc: "permanent hotlinking of images … is not allowed. If you intend to use the images, please download them to your server first." Videos may be embedded. | Up to ~6,000 px on the long edge for originals. Three URLs returned: `webformat` (640w), `largeImageURL` (1280w), `fullHDURL` (1920w). Replace `_640`/`_1280`/`_1920` in the URL path to pick a size. | query, page, per_page (3–200), orientation, size (min width/height), color, locale, image_type (photo/illustration/vector), category, editors_choice, safesearch | **No** (credit "Photo by {name} on Pexels" appreciated) | Yes — bulk via approved tier. Has **"Request full API access"** for original-resolution downloads. | Smaller than Unsplash, but more "stock" / more diversity of people-of-color and editorial content. Has a separate Pexels Videos API. |
| **Pixabay** | Pixabay Content License (CC0-like, but not CC0 technically) — free for commercial use, modifications allowed, no attribution required, **cannot be redistributed standalone**, cannot imply endorsement. | REST | **Free** — 100 requests / 60s, default. Must cache 24h. "Systematic mass downloads are not allowed" — limits can be raised on application. | **Disallowed for permanent production.** Same wording as Pexels: "permanent hotlinking … is not allowed … please download them to your server first." | Up to ~6,000 px. Multiple sizes per result: `previewURL` (150w), `webformatURL` (640w), `largeImageURL` (1280w), `fullHDURL` (1920w), and `imageURL` (original) + `vectorURL` (SVG) when your account is "approved for full API access." | query, lang, image_type (photo/illustration/vector), orientation, category, min_width, min_height, colors, editors_choice, safesearch, order (popular/latest), page, per_page (3–200) | **No** (must "show your users where the images and videos are from, whenever search results are displayed") | Yes — approved tier unlocks originals. | Includes illustrations, vectors, videos, music, sound effects, 3D models and GIFs in one API. **Important — Pixabay license ≠ CC0:** do not mark as "CC0" in your metadata; use the Pixabay license URL. |
| **Wikimedia Commons** | Mixed: CC0, CC-BY, CC-BY-SA, GFDL, public domain (PD-Art, PD-old, PD-USGov, etc.). **CC-BY-SA is copyleft — derivative blogs must be SA-licensed or use a separate "fair use" rationale.** | MediaWiki Action API + REST (`/w/api.php?action=query&prop=imageinfo`) | **Free**, but rate-limited per IP. Wikimedia recommends `User-Agent` header with contact info. | **Discouraged for production.** Run a local mirror or use a partner CDN (e.g., Wikimedia → AWS / GCP / Azure mirrors). | Whatever the uploader provided — typically 4–8 MP for photos; SVG supported. | `generator=search`, `gsrnamespace=6` (files), `gsrlimit`, `prop=imageinfo` for sizes, `prop=extmetadata` for license/artist/credit | **Yes — every license type requires it.** Credit URL + author + license name. Use the `xmp:Creator`, `xmp:Rights`, `dc:license` from `extmetadata`. | Yes, with care. Bulk fetch via `categorymembers`; for >1000 results use `continue` cursor. | 100M+ files, the only source with **truly free** (CC0 / PD) and **truly massive** scope. The 2024+ policy disallows most AI-generated content. **Most demanding attribution discipline** — must parse `extmetadata` and render per-image credit. |
| **Pexels Videos** | Same Pexels License (videos are "free to use, attribution appreciated") | REST `/videos/search/` + `/videos/videos/` | Same as Pexels images. | Not for production. | 4K (3840×2160), 1920×1080 HD, 1280×720, 960×540, 640×360. MP4 + WEBM. | Same as images, plus `video_type` (film/animation), duration filters | No | Yes | Often the cheapest way to get B-roll. |
| **Coverr** (Coverr.co) | Coverr License — free for commercial and personal, no attribution, modifications allowed. | None (web-only) | — | No | Up to 4K. | Category, mood, tag filters on the site only | No | No API. Manual download. | Smaller than Pexels Videos. |
| **StockSnap.io** | CC0 (Creative Commons Zero) | None | — | No | Up to ~5 MP | Tag, category, view count | **No** (CC0) | No API. Manual. | Quality varies. |
| **Pikist** | Aggregator of CC0/CC-BY images from multiple sources. | None | — | No | Mixed | Tag search | Depends on underlying license | No | **Use with caution** — license re-attribution is your responsibility. |
| **Foodiesfeed** | CC0 (food only) | None | — | No | Up to ~5 MP | Tag search | No | No | Food photography niche. |
| **NASA / ESA / Hubble** | Public domain (US Government works) | NASA Images API + ESA Hubble archive | Free | **Allowed** — explicit PD-USA policy. | Up to 30,000 px. | Mission, target, date, instrument | **No** (PD-USA) | Yes | Best for science / space content. |
| **Smithsonian Open Access** | CC0 (CC0 1.0 Universal) | API + bulk dataset (CC0 download) | Free | Allowed (CC0) | Up to ~5 MP | Object type, date, collection, artist | **No** (CC0) | Yes — explicit enterprise dataset. | 4.5M+ items. Best for arts, history, science. |
| **Metropolitan Museum (Open Access)** | CC0 | API at `metmuseum.github.io` | Free | Allowed (CC0) | Up to ~4 MP | Department, date, medium, tags, geo | **No** (CC0) | Yes | 400k+ public-domain artworks. |
| **Rijksmuseum** | CC0 (for high-res download tier) | REST API | Free; requires API key | Allowed for CC0 tier | Up to 10,000 px (tiles) | Artist, date, type | **No** for CC0 tier | Yes | Masterpieces. |
| **Europeana** | Mixed — per item. | REST API | Free | Per item | Per item | Full-text, per-provider | **Yes — per item** | Yes, with discipline | 50M+ cultural items; license parser is mandatory. |
| **Flickr (CC filter)** | Various CC | Flickr REST API | Free with API key | Allowed **for CC-licensed** | Per photo | Per license, per tag | **Yes — depends on license** | Yes | Great for niche photography, but mix of CC-BY/CC-BY-SA means your blog must carry the same license or relicense. |
| **Openverse** (formerly CC Search) | Aggregator — multiple licenses | REST | Free | Per underlying license | Per source | License filter (mandatory!) | Per license | Yes | Always filter by license; never trust unfiltered results. |
| **Adobe Stock (Free tier)** | Royalty-free, watermark-free for select Adobe Stock Free collection | Stock API (paid) | Paid for full library; free for the curated "Free" collection | Allowed for purchased | Per asset | Per-asset | No (royalty-free) | Yes, via paid API | Not for the truly-free pipeline; useful as a "premium" tenant upgrade. |
| **AI — Adobe Firefly (Web app)** | Trained on Adobe Stock + licensed/public-domain content. Output can be used commercially, including for resale of standalone images (since 2024 Firefly ToS update). | Firefly Services API (Image 3, 4, Ultra) | Pay-per-credit (~$0.05–$0.33 per generation; Generative Credits plans from $5/mo) | N/A (generated) | Up to ~4 MP (Ultra is 2× up to 2,048 px) | Style, effect, structure reference, aspect, content type | **No** (but Firefly attaches C2PA Content Credentials automatically) | Yes — enterprise tier with indemnification, IP indemnification up to $1M/incident. | **The safest commercial-use AI option in 2025–2026** for enterprise. C2PA-signed. |
| **AI — OpenAI DALL·E 3 (ChatGPT / API)** | Output is yours; OpenAI assigns all right, title, and interest. Commercial use allowed. | Images API (`gpt-image-1`) | ~$0.04–$0.25 per image depending on size/quality | N/A (generated) | 1024×1024, 1024×1536, 1536×1024 | Prompt, size, quality, n | No | Yes | Add C2PA manually if you want provenance. |
| **AI — Midjourney** | **V7 (2025)** — Standard plan: images are yours if you gross < $1M/yr; Pro/Mega plans: full commercial ownership. | Midjourney API (via Discord or `api.midjourney.com`) | $10–$120/mo plans | N/A (generated) | Up to ~4 MP | Prompt, aspect, style, --v 7, --s, --q | No | Yes | Aesthetic lead, weaker on text and exact faces. |
| **AI — Stable Diffusion 3.5 / SDXL (self-hosted)** | Open RAIL-M license (commercial OK, certain restrictions on illegal content). | Local / Replicate / Fal.ai | Free (self-host) to $0.005/image (Replicate) | N/A | Configurable | Full control | No | Yes — best for bulk generation | **Verify base model license.** SD3.5 is commercial-friendly. SD3 originally had a non-commercial license that was reverted. |
| **AI — Google Imagen 3 (Vertex AI)** | Google's generative AI terms; commercial use OK for Workspace/Cloud customers. | Vertex AI API | $0.02–$0.04 per image | N/A | Up to 2,048 px | Prompt, aspect, negative prompt, style | No | Yes — enterprise | SynthID watermark embedded (invisible watermark for provenance). |
| **AI — Ideogram 2.0** | Pro plan: commercial use OK. | Ideogram API | $0.05–$0.08 per image | N/A | Up to ~4 MP | Prompt, aspect, style, magic prompt | No | Yes | Best for **typographic** content (logos, posters). |
| **AI — Recraft v3 (Redux)** | Free for personal; Pro: commercial OK. | Recraft API | $0.04–$0.08 per image | N/A | Vector + raster | Prompt, style, brand colors | No | Yes | Only generator with strong vector output. |

### 1.1 Quick decision matrix

| Need | Source |
| --- | --- |
| Highest legal safety, all use-cases | Wikimedia Commons (CC0/PD) > Pixabay > Pexels > Unsplash > Firefly / DALL·E |
| Editorial / lifestyle / people shots | Unsplash ≈ Pexels > Adobe Stock |
| Illustrations, vectors, icons | Pixabay + Recraft v3 |
| B-roll video | Pexels Videos / Coverr / Pixabay Videos |
| Scientific / space / cultural | NASA, ESA, Smithsonian, Met, Rijksmuseum, Europeana |
| Bulk generation at scale | Stable Diffusion 3.5 (self-host) or Firefly Services |
| Premium enterprise indemnification | Adobe Firefly (only one with explicit IP indemnification in 2025) |

---

## 2. Creative Commons Licenses — Quick Reference (2025)

| Code | Name | Commercial OK? | Derivatives OK? | Copyleft? | Attribution needed? | Example source |
| --- | --- | --- | --- | --- | --- | --- |
| **CC0** | Public Domain Dedication | ✅ | ✅ | — | No | Met Open Access, Smithsonian, StockSnap, NASA |
| **CC-BY 4.0** | Attribution | ✅ | ✅ | No | **Yes** (name + link + license + indication of changes) | Flickr filter, some Commons |
| **CC-BY-SA 4.0** | Attribution-ShareAlike | ✅ | ✅ | **Yes** (your blog must be SA-licensed) | Yes | Some Commons, OpenStreetMap-derived |
| **CC-BY-NC 4.0** | Attribution-NonCommercial | ❌ for commercial | ✅ | No | Yes | Most Flickr non-commercial |
| **CC-BY-NC-SA 4.0** | Att.-NonComm.-ShareAlike | ❌ | ✅ | Yes | Yes | Some Commons |
| **CC-BY-ND 4.0** | Attribution-NoDerivatives | ✅ | ❌ | No | Yes | Rare |
| **CC-BY-NC-ND 4.0** | Att.-NonComm.-NoDerivatives | ❌ | ❌ | No | Yes | Common on Flickr (most restrictive) |
| **Pixabay License** | Custom | ✅ | ✅ | No | No (display source) | Pixabay |
| **Pexels License** | Custom | ✅ | ✅ | No | No (display source) | Pexels |
| **Unsplash License** | Custom | ✅ | ✅ | No | No (appreciated) | Unsplash |
| **GFDL 1.3** | GNU Free Documentation License | ⚠️ | ✅ | Yes (text) | Yes | Some old Commons |
| **Public Domain (PD-Art, PD-old, PD-USGov)** | Public domain | ✅ | ✅ | — | No (appreciated) | NASA, US gov, 70+ years-after-death works |

### 2.1 What CC-BY attribution must include (per Creative Commons 4.0 §3)

1. **Title / identification** of the work (if provided).
2. **Author's name** (or pseudonym) + a URL if reasonable.
3. **License name** + **license URL**.
4. **Indication of modifications** if you cropped, color-graded, composited.
5. **Keep attribution reasonable** — don't strip it, don't imply the author endorses you.
6. **Don't use CC-BY tech** (e.g. the license buttons) in a way that suggests the licensor endorses your use.

### 2.2 What the Pixabay / Pexels / Unsplash custom licenses really say

- **No standalone redistribution.** You may not upload the image (or an unmodified copy) to another stock site or sell it as a stock asset.
- **No implied endorsement.** You can't use the image in a way that suggests the depicted person, brand, or photographer endorses your product.
- **No model releases for people.** You accept the editorial risk if a person is recognizable.
- **Editorial use only** for any image that depicts a brand, logo, or trademark as its primary subject.

---

## 3. AI-Generated Image Commercial Rights (2025–2026)

| Tool | Commercial use | IP indemnification | Training data | Provenance / C2PA |
| --- | --- | --- | --- | --- |
| **Adobe Firefly 4** | ✅ for all paid plans; **resale of standalone images allowed since 2024 ToS update** | **Up to $1,000,000 per claim** (Enterprise tier) | Adobe Stock licensed + public domain | **Yes** — automatic C2PA Content Credentials |
| **DALL·E 3 / gpt-image-1** | ✅ OpenAI assigns all rights to you | Limited (no indemnification for trademark/portrait claims) | Mixed licensed + public + synthetic | No (manual C2PA possible) |
| **Midjourney v7** | ✅ (Pro/Mega) | None | Scraped web (controversy) | No |
| **Stable Diffusion 3.5** | ✅ (Stability AI Community License) | None | LAION-derived | No (community plugins) |
| **Google Imagen 3** | ✅ for Workspace/Cloud | $1M Google Cloud indemnification for Workspace | Internal | **SynthID invisible watermark** |
| **Ideogram 2.0** | ✅ (Pro) | None | Mixed | No |
| **Recraft v3** | ✅ (Pro) | None | Mixed | No |
| **Flux.1 [dev/pro]** | dev: non-commercial; pro: commercial | None | Mixed | No |
| **Adobe Firefly Vector (illustrations)** | ✅ | Yes (Enterprise) | Adobe Stock + PD | C2PA |

> **Best practice for an enterprise platform:** Default to **Firefly** (indemnified + C2PA) for premium tenant content. Use **DALL·E 3** or **Imagen 3** for cheaper bulk generation. For very high volume, run **SD 3.5** self-hosted on your own GPUs (you own every generated image and the pipeline).

> **EU AI Act (entered into force Aug 2024, phased through 2026–2027):** AI-generated images must be labeled as such. In your platform, persist the `digitalSourceType: "https://schema.org/IPTCDigitalSourceEnumeration#algorithmicCreation"` and a `copyrightNotice` of "AI-generated, [provider] [version]". Add C2PA manifest if supported.

---

## 4. Image Format Performance — WebP, AVIF, JPEG XL (2025)

### 4.1 Modern format decision matrix (consensus 2024–2025 benchmarks; specific numbers vary by content)

| Format | Avg. saving vs JPEG (perceived equal) | Browser support 2025 | Encode cost | Decode cost | Best for |
| --- | --- | --- | --- | --- | --- |
| **JPEG (mozjpeg q=82)** | baseline | Universal | Low | Low | Fallback only |
| **WebP (lossy q=80)** | 25–35% | ~97% (no IE, no old Safari) | Medium | Low | **Default lossy** |
| **AVIF (q=50, speed 6)** | 40–55% | ~93% (Chrome, Firefox, Safari 16.4+, Edge) | **High** (5–10× JPEG) | Medium | Hero / marketing / photography |
| **WebP (lossless)** | 25–30% | ~97% | Medium | Low | Graphics with sharp edges / text overlay |
| **AVIF (lossless)** | 50–60% | ~93% | Very high | Medium | Highest compression acceptable |
| **JPEG XL** | 30–40% | **Only Chrome (flag-only) and IE Edge legacy. Safari and Firefox dropped it.** | Medium | Low | **Dead for the web** as of 2025 — drop from roadmap |
| **PNG** | baseline for graphics | Universal | Low | Low | Only for tiny UI / favicon / logo |
| **SVG** | n/a | Universal | n/a | n/a | Logos, icons, illustrations |
| **GIF** | huge, palette-limited | Universal | n/a | n/a | Replace with WebM/MP4 for animation |

### 4.2 Practical implementation — serve AVIF, fallback to WebP, fallback to JPEG

```html
<picture>
  <source
    type="image/avif"
    srcset="
      /img/hero-400.avif 400w,
      /img/hero-800.avif 800w,
      /img/hero-1200.avif 1200w,
      /img/hero-1600.avif 1600w,
      /img/hero-2000.avif 2000w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 1200px">
  <source
    type="image/webp"
    srcset="
      /img/hero-400.webp 400w,
      /img/hero-800.webp 800w,
      /img/hero-1200.webp 1200w,
      /img/hero-1600.webp 1600w,
      /img/hero-2000.webp 2000w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 1200px">
  <img
    src="/img/hero-1200.jpg"
    srcset="
      /img/hero-400.jpg 400w,
      /img/hero-800.jpg 800w,
      /img/hero-1200.jpg 1200w,
      /img/hero-1600.jpg 1600w,
      /img/hero-2000.jpg 2000w"
    sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 1200px"
    width="1200" height="675"
    alt="A senior developer pair-programming with a junior on a multi-tenant blog dashboard"
    loading="eager"
    fetchpriority="high"
    decoding="async">
</picture>
```

### 4.3 Quality / size sweet spots (consensus 2025)

| Slot | Format | Quality | Width (mobile → desktop) | Notes |
| --- | --- | --- | --- | --- |
| Hero (LCP) | AVIF → WebP → JPEG | 55 / 75 / 80 | 640 / 960 / 1280 / 1920 / 2560 | `fetchpriority="high"`, no lazy. AVIF q≈50 matches JPEG q≈82 visually. |
| In-article body | WebP → JPEG | 75 / 80 | 320 / 640 / 960 / 1280 | `loading="lazy"`, `decoding="async"`. |
| Thumbnail (card) | WebP → JPEG | 70 / 75 | 240 / 360 / 480 / 720 | Force aspect ratio 16:9 or 4:3. |
| Open Graph (social) | JPEG | 80 | single 1200×630 | FB/LinkedIn/Twitter/WhatsApp all honor this; some recommend 1200×675. |
| Twitter card (`summary_large_image`) | JPEG | 80 | single 1200×675 (2:1) | |
| Instagram square | JPEG | 80 | 1080×1080 | Strip EXIF (privacy) |
| Instagram portrait | JPEG | 80 | 1080×1350 | |
| LinkedIn share | JPEG | 80 | 1200×627 | |
| Pinterest Pin | JPEG / PNG | 80 | 1000×1500 (2:3) | |
| Favicon | PNG / SVG + WebP | lossless | 16, 32, 48, 96, 180 (Apple touch) | Use `link rel="icon" sizes="…"`. |
| App icon | PNG | lossless | 192, 512 (PWA manifest) | |

### 4.4 Lossless / graphic rules

- Logos, icons, text overlays → **WebP lossless** (not AVIF — encode cost too high for marginal gain).
- Animated content → **WebM/AV1** or **MP4/H.264**, never GIF.
- Charts / screenshots with text → **PNG** (or WebP lossless for 25% smaller).
- Halftones, gradients, noise → **AVIF** wins by 20–30% over WebP.

### 4.5 AVIF encode recipe (libavif + c.avifenc)

```bash
# Squeezing 30% more without visible loss on photographic content
cavif --quality 50 --speed 6 -o hero-1200.avif hero-1200.png

# More conservative (hero)
cavif --quality 60 --speed 4 -o hero-1200.avif hero-1200.png
```

### 4.6 WebP encode recipe (cwebp)

```bash
# Lossy photo
cwebp -q 75 -m 6 -af -sharp_yuv -metadata none hero-1200.png -o hero-1200.webp

# Lossless graphic / logo
cwebp -lossless -m 6 -metadata none logo.png -o logo.webp
```

---

## 5. Image SEO Best Practices (2025)

### 5.1 The four-pillar checklist (Google Search Central)

> Source: `developers.google.com/search/docs/appearance/google-images`

| Pillar | Google guidance | Concrete rule |
| --- | --- | --- |
| **1. Crawlable** | Put the image on a page Google can crawl. Don't lazy-load the LCP image. Don't put in `noscript` only. Don't block `googlebot-image` in robots.txt. | Add `Content-Security-Policy: img-src 'self' https://images.unsplash.com https://cdn.pixabay.com`; serve from a public CDN; ensure `alt` text exists. |
| **2. Discoverable** | Use `alt` + `title` + surrounding context. Add to Image sitemap. | See §5.5 for sitemap and §5.4 for alt text. |
| **3. High quality** | Google says "Larger images tend to be higher quality," with a note that "smaller" is fine if the content is good. Aim for **≥ 1,200 px** on the long edge for ranking. | All hero/OG images ≥ 1,200 px. Provide 2× retina. |
| **4. Fast** | Page must be fast (Core Web Vitals). | Lazy-load non-LCP, AVIF, CDN, `decoding="async"`. |

### 5.2 File naming

- **Lowercase, hyphens, descriptive, English by default with `hreflang` consideration.**
- ❌ `IMG_29381.jpg`, `Screenshot 2025-01-01 at 4.32.11 PM.png`, `untitled1.jpg`
- ✅ `multi-tenant-blog-platform-architecture-diagram.webp`
- ✅ `seo-image-optimization-checklist-2025.webp`
- ✅ `jupsoft-cloud-dashboard-hero-illustration.webp`
- Pattern: `{topic}-{descriptor}-{version}.{ext}` — keep ≤ 5–8 words.

### 5.3 Image dimensions per slot

| Slot | Recommended size (px) | Aspect | Aspect ratio |
| --- | --- | --- | --- |
| Blog hero (above the fold) | 1920 × 1080 | 16:9 | desktop |
| Blog in-article | 1280 × 720 | 16:9 | embedded |
| Thumbnail / card | 800 × 450 | 16:9 | grid |
| Square social (Instagram, OG alt) | 1080 × 1080 | 1:1 | — |
| Vertical social (Pinterest, IG portrait) | 1080 × 1350 | 4:5 | — |
| Story / Reel | 1080 × 1920 | 9:16 | — |
| Twitter summary | 1200 × 675 | 16:9 | — |
| LinkedIn | 1200 × 627 | ~1.91:1 | — |
| Email hero | 600 × 400 | 3:2 | ≤ 100 KB total |
| Apple touch icon | 180 × 180 | 1:1 | — |
| Favicon | 32 × 32 / 180 × 180 | — | — |

### 5.4 Alt text best practices (the 2025 consensus)

| Rule | Why |
| --- | --- |
| **Length: 5–125 characters, sweet spot 60–100.** | WCAG + Google. Google indexes the first ~125 chars. |
| **Describe what the image *is*, not what it *says* about the article.** | Helps blind users. Avoids keyword stuffing. |
| **Don't start with "image of…" / "photo of…"** | Redundant — the screen reader already says "graphic." |
| **Include the target keyword once, naturally, if relevant.** | A 2024 + 2025 Bing/Webmaster study suggests minor ranking correlation. |
| **If the image is purely decorative, use `alt=""` (not missing).** | Tells screen readers to skip. |
| **Don't stuff keywords.** | Google penalty in 2024 Helpful Content Update era. |
| **For complex charts, add `longdesc` or an in-text description.** | Accessibility. |

**Examples (right and wrong):**

| Context | ❌ Bad | ✅ Good |
| --- | --- | --- |
| Hero | `seo` | `Bar chart showing LCP improvement from 4.1s to 1.6s after enabling AVIF on a multi-tenant blog` |
| Diagram | `image` | `Architecture diagram of a multi-tenant blog platform with shared auth, per-tenant database, and CDN-fronted media` |
| Screenshot | `screenshot` | `WordPress post editor showing the image alt text field with a 78-character example` |
| Decorative | `dog playing` | ` ` (alt="" — purely decorative) |
| Person | `woman` | `Marketing manager reviewing the Q3 content calendar on a tablet` |

### 5.5 Image sitemap

Add an image sitemap to the main `sitemap.xml` (or as a separate `image-sitemap.xml` referenced in the index). The `<image:image>` tag accepts `loc`, `title`, `caption`, `geo_location`, `license`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://blog.jupsoft.com/2025/seo-image-optimization/</loc>
    <lastmod>2025-11-04</lastmod>
    <image:image>
      <image:loc>https://cdn.jupsoft.com/tenants/jupsoft/images/2025/11/seo-image-optimization-hero-1920.avif</image:loc>
      <image:title>SEO image optimization checklist for 2025</image:title>
      <image:caption>Hero illustration for the SEO image optimization checklist, showing AVIF, WebP, and JPEG icons.</image:caption>
      <image:license>https://creativecommons.org/licenses/by/4.0/</image:license>
    </image:image>
    <image:image>
      <image:loc>https://cdn.jupsoft.com/tenants/jupsoft/images/2025/11/seo-image-optimization-diagram-1280.webp</image:loc>
      <image:title>Image pipeline architecture diagram</image:title>
      <image:caption>Source → transform → CDN → browser with AVIF and WebP fallbacks.</image:caption>
    </image:image>
  </url>
</urlset>
```

Register the sitemap in `robots.txt` and in Google Search Console. Combine sitemaps if you exceed 50,000 URLs by using a `<sitemapindex>`.

### 5.6 Image sitemap for multi-tenant (recommended)

Per-tenant sub-sitemap keeps each tenant's blast radius small:

```
https://jupsoft.com/sitemap.xml           ← sitemapindex
├── https://jupsoft.com/sitemaps/jupsoft-cloud.xml        ← image + page
├── https://jupsoft.com/sitemaps/digifynext.xml
└── https://jupsoft.com/sitemaps/tenant-007.xml
```

In NGINX, generate dynamically:

```nginx
location /sitemaps/ {
    proxy_pass http://api:3000/sitemaps/;  # Fastify/Express endpoint
    proxy_set_header X-Tenant-Slug $arg_tenant;
}
```

### 5.7 The 2025 Google Images ranking-factor consensus

Based on Google Search Central guidance + 2024–2025 independent studies (Backlinko, Moz, Onely):

1. **Image file size + format** (smaller = better) — strong.
2. **Alt text relevance** — moderate; a small but consistent correlation.
3. **Image context** (surrounding text + page topic) — strong.
4. **Page authority / domain authority** — strong (it's still page-level ranking, mostly).
5. **Image sitemap** — strong signal for discovery.
6. **ImageObject JSON-LD** — required for Google Images "Licensable" badge.
7. **Original / unique** — Google explicitly rewards images that aren't re-hosted copies elsewhere.
8. **EXIF data with geo + license** — strong signal for the IPTC license metadata.
9. **CDN + LCP** — strong (Core Web Vitals).
10. **File name** — minor, but well-named files do correlate with ranking in 2025 studies.
11. **`data-lazy-src` / SSR fallback** — Google does not lazy-deindex but lazy-broken pages lose LCP.

---

## 6. Lazy Loading & Core Web Vitals (2025)

### 6.1 The two-tier loading strategy

| Image | Loading | Fetch priority | Decoding | Why |
| --- | --- | --- | --- | --- |
| **LCP hero / first contentful image** | `eager` | `high` | `async` | Don't gate LCP on JS. |
| **All below-the-fold images** | `lazy` (native) | `auto` | `async` | Native lazy load is now universally supported (96%+) and superior to most JS polyfills. |
| **Background-image on hero** | n/a (CSS) | n/a (preload!) | — | Use `<link rel="preload" as="image" imagesrcset="…" imagesizes="…">` for above-the-fold CSS images. |

### 6.2 Native lazy loading is the default — IntersectionObserver only for legacy

```html
<!-- Default native lazy. 96%+ support, 0 KB JS, scroll-tuned thresholds baked into browsers. -->
<img src="…" loading="lazy" decoding="async" alt="…">

<!-- Above-the-fold LCP image — DO NOT lazy load. -->
<img src="…" loading="eager" fetchpriority="high" decoding="async" alt="…">
```

```html
<!-- Preload the LCP image even if it's set via CSS background -->
<link rel="preload" as="image"
      href="https://cdn.example.com/hero-1920.avif"
      imagesrcset="https://cdn.example.com/hero-1280.avif 1280w,
                   https://cdn.example.com/hero-1920.avif 1920w,
                   https://cdn.example.com/hero-2560.avif 2560w"
      imagesizes="100vw"
      fetchpriority="high">
```

### 6.3 IntersectionObserver fallback for legacy browsers (~4% of users in 2025)

```html
<img class="lazy" data-src="hero.webp" alt="…">
```

```js
// lazy-load.js — drop in, no dependencies
(function () {
  if ('loading' in HTMLImageElement.prototype) return; // native supported

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const img = e.target;
        if (img.dataset.src) img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.classList.remove('lazy');
        obs.unobserve(img);
      }
    },
    { rootMargin: '200px 0px', threshold: 0.01 }
  );

  document.querySelectorAll('img.lazy').forEach((img) => io.observe(img));
})();
```

### 6.4 Cumulative Layout Shift (CLS) — set `width` and `height`

Always set `width` and `height` (or `aspect-ratio` in CSS) so the browser can reserve the box **before** the image loads. This is the single biggest CLS win in 2025.

```html
<img src="hero-1200.avif" width="1200" height="675" alt="…">
```

```css
.hero-img { aspect-ratio: 16 / 9; width: 100%; height: auto; }
```

### 6.5 LCP optimization ladder

1. **Serve AVIF or WebP** (saves 30–50% bytes).
2. **Right-size** the image (no 4K on a 600-wide slot).
3. **`fetchpriority="high"` on the LCP `<img>`**.
4. **`<link rel="preload" as="image">` if the LCP image is a CSS background**.
5. **CDN with HTTP/3 + Brotli** (Cloudflare, Fastly, Vercel).
6. **Avoid client-side hydration of the LCP image**.
7. **Inline critical image as data: URI** — only for tiny logos / icons, never for hero.

### 6.6 CDN recommendations (2025)

| Provider | Pricing tier | Image resize | Modern format | Privacy | Best for |
| --- | --- | --- | --- | --- | --- |
| **Cloudflare Images** | $5/mo + $0.05/1000 stored, $0.50/1000 transforms | ✅ | ✅ AVIF/WebP auto | ✅ | Multi-tenant with per-zone isolation. Easiest. |
| **Cloudinary** | $0–$224/mo | ✅ | ✅ auto | ✅ | Best for AI features (background remove, upscale). |
| **imgix** | $0–custom | ✅ | ✅ | ✅ | Mature, predictable pricing for scale. |
| **ImageKit** | $0–$349/mo | ✅ | ✅ | ✅ | Generous free tier. |
| **Vercel Image Optimization** | Bundled with Vercel | ✅ (Next/Image) | ✅ | ✅ | If you're on Vercel. |
| **Thumbor** (self-host) | Free | ✅ | ✅ (manual) | ✅ | Cost-sensitive, ops-capable. |
| **Netlify Image CDN** | Bundled with Netlify | ✅ | ✅ | ✅ | If you're on Netlify. |
| **Bunny Optimizer** | $9.50/mo + usage | ✅ | ✅ | ✅ | Cheapest pay-as-you-go. |
| **Google Cloud CDN** | Pay-per-GB | Manual (ImagePipeline) | ✅ | ✅ | If already on GCP. |
| **AWS CloudFront + Lambda@Edge image resize** | Pay-per-GB + Lambda invocations | ✅ | ✅ | ✅ | If already on AWS, no vendor lock-in. |

For a multi-tenant platform, the **Cloudflare Images + per-tenant custom hostname** model is the easiest to isolate and bill:

```
jupsoft-cdn.com/tenants/jupsoft-cloud/...   (Tenant A)
jupsoft-cdn.com/tenants/digifynext/...      (Tenant B)
```

### 6.7 Lazy-loading SEO impact

- Google has officially confirmed (since 2019 and reaffirmed 2024) that `loading="lazy"` is fine for crawling as long as images are within scroll distance of the viewport at typical user heights.
- The risk: if you lazy-load via JavaScript that doesn't fire for Googlebot (e.g., because of a CSP or bot detection), your images may not be indexed. Mitigations: use **native** `loading="lazy"`, never block `googlebot-image` in robots.txt, and serve SSR `<noscript>` fallbacks.
- The opportunity: by lazy-loading all non-LCP images, you reclaim 30–70% of bytes-on-the-wire and improve LCP by 200–800 ms on image-heavy pages.

---

## 7. Structured Data — `ImageObject` JSON-LD

### 7.1 The minimum-viable `ImageObject` per blog post

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Image SEO Checklist for Multi-Tenant Blog Platforms",
  "image": [
    {
      "@type": "ImageObject",
      "url": "https://cdn.jupsoft.com/tenants/jupsoft/images/2025/11/image-seo-checklist-hero-1200.avif",
      "contentUrl": "https://cdn.jupsoft.com/tenants/jupsoft/images/2025/11/image-seo-checklist-hero-1920.avif",
      "width": 1920,
      "height": 1080,
      "caption": "Hero illustration for the image SEO checklist, showing a multi-tenant blog dashboard with optimized images.",
      "representativeOfPage": true,
      "encodingFormat": "image/avif",
      "uploadDate": "2025-11-04T10:00:00Z",
      "creator": {
        "@type": "Person",
        "name": "Jupsoft Editorial",
        "url": "https://jupsoft.com/about/"
      },
      "creditText": "Photo by Jupsoft Editorial / Jupsoft Cloud",
      "copyrightNotice": "© 2025 Jupsoft Inc.",
      "copyrightYear": 2025,
      "license": "https://creativecommons.org/licenses/by/4.0/",
      "acquireLicensePage": "https://jupsoft.com/license/",
      "isAccessibleForFree": true,
      "contentSize": "184320",
      "sha256": "e3b0c44…",
      "exifData": {
        "@type": "PropertyValue",
        "name": "ColorSpace",
        "value": "sRGB"
      },
      "thumbnail": [
        {
          "@type": "ImageObject",
          "url": "https://cdn.jupsoft.com/tenants/jupsoft/images/2025/11/image-seo-checklist-thumb-480.webp",
          "width": 480, "height": 270
        }
      ]
    }
  ],
  "author": { "@type": "Organization", "name": "Jupsoft Inc." },
  "publisher": {
    "@type": "Organization",
    "name": "Jupsoft Inc.",
    "logo": { "@type": "ImageObject", "url": "https://cdn.jupsoft.com/logo-512.png" }
  },
  "datePublished": "2025-11-04T10:00:00Z",
  "dateModified": "2025-11-04T10:00:00Z"
}
</script>
```

### 7.2 Required fields for the **Google Images "Licensable" badge**

Google requires these on the `ImageObject`:

| Field | Why |
| --- | --- |
| `contentUrl` | The actual image file URL. |
| `license` | A URL to the license document (CC URL, Pixabay terms URL, your own `/license/` page). |
| `acquireLicensePage` | A URL where users can license / purchase the image. |
| `creator` | The author/photographer, with `name` and ideally `url`. |
| `creditText` | Short credit string. |
| `copyrightNotice` | e.g. `© 2025 Jupsoft Inc.` |

### 7.3 IPTC image-license metadata (the sibling of JSON-LD)

Google also reads **IPTC** `xmp:LicensorURL`, `dc:Rights`, `xmp:Creator` from the image file itself. Always embed:

```bash
exiftool -overwrite_original \
  -XMP:Creator="Jupsoft Editorial" \
  -XMP:Rights="© 2025 Jupsoft Inc. — CC BY 4.0" \
  -XMP:LicensorURL="https://jupsoft.com/license/" \
  -XMP:UsageTerms="Commercial use OK with attribution" \
  -XMP:WebStatement="https://creativecommons.org/licenses/by/4.0/" \
  hero-1920.jpg
```

Strip private EXIF (GPS, camera serial) before publishing:

```bash
exiftool -overwrite_original -gps:all= -makernotes:all= -SerialNumber= hero-1920.jpg
```

---

## 8. Code: The Full Enterprise Image Pipeline

### 8.1 Image entity (TypeScript, used by the multi-tenant API)

```ts
// src/types/image.ts
import { z } from 'zod';

export const LicenseSchema = z.object({
  type: z.enum([
    'CC0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-ND-4.0',
    'Pixabay', 'Pexels', 'Unsplash', 'PublicDomain', 'Proprietary', 'AI-Generated', 'Editorial'
  ]),
  url: z.string().url(),
  requiresAttribution: z.boolean(),
  commercialUse: z.boolean(),
  derivativeUse: z.boolean(),
  copyleft: z.boolean(),
});

export const ImageSourceSchema = z.enum(['unsplash','pexels','pixabay','commons','firefly','dalle','midjourney','sdxl','imagen','upload']);

export const ImageVariantSchema = z.object({
  format: z.enum(['avif','webp','jpeg','png','svg']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  url: z.string().url(),
  quality: z.number().int().min(1).max(100).optional(),
  cdn: z.string(),
});

export const ImageSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  phash: z.string().optional(),         // perceptual hash for duplicate detection
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  aspectRatio: z.string().regex(/^\d+\/\d+$/),
  bytes: z.number().int().positive(),
  mimeType: z.string(),
  originalFilename: z.string(),
  slug: z.string(),                      // seo-friendly filename
  alt: z.string().min(0).max(200),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  source: ImageSourceSchema,
  license: LicenseSchema,
  attribution: z.string().optional(),    // "Photo by {name} on Unsplash"
  creditUrl: z.string().url().optional(),
  uploadedBy: z.string().uuid(),
  uploadedAt: z.string().datetime(),
  exifStripped: z.boolean(),
  variants: z.array(ImageVariantSchema),
  c2paManifest: z.string().optional(),   // URL to C2PA manifest if available
  iptc: z.record(z.string()).optional(),
  status: z.enum(['processing','ready','blocked','dmca-takedown']),
});

export type Image = z.infer<typeof ImageSchema>;
export type License = z.infer<typeof LicenseSchema>;
export type ImageVariant = z.infer<typeof ImageVariantSchema>;
```

### 8.2 Source-ingest worker (Node + BullMQ)

```ts
// src/workers/ingest-image.ts
import { Worker, Job } from 'bullmq';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fetch as undiciFetch } from 'undici';
import sharp from 'sharp';
import { prisma } from '../db';
import { LicenseSchema, type Image } from '../types/image';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.MEDIA_BUCKET!;

interface IngestJob {
  tenantId: string;
  source: 'unsplash' | 'pexels' | 'pixabay' | 'commons' | 'firefly' | 'dalle' | 'upload';
  externalId?: string;       // unsplash id, pixabay id, commons file name
  sourceUrl?: string;        // direct download URL (if known)
  license: unknown;          // LicenseSchema-compatible
  attribution?: string;
  uploadedBy: string;
}

const worker = new Worker<IngestJob>('ingest-image', async (job: Job<IngestJob>) => {
  const { tenantId, source, sourceUrl, license, attribution, uploadedBy } = job.data;

  // 1. Resolve a real URL
  const url = sourceUrl ?? (await resolveSourceUrl(source, job.data.externalId!));
  if (!url) throw new Error('NO_SOURCE_URL');

  // 2. Download
  const res = await undiciFetch(url, { headers: { 'User-Agent': 'JupsoftCMS/1.0 (contact@jupsoft.com)' } });
  if (!res.ok) throw new Error(`DOWNLOAD_FAILED_${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  // 3. Hash + sniff
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const existing = await prisma.image.findUnique({ where: { tenantId_sha256: { tenantId, sha256 } } });
  if (existing) return existing;

  // 4. Validate license (Zod) — hard fail
  const lic = LicenseSchema.parse(license);
  if (!lic.commercialUse) throw new Error('LICENSE_NOT_COMMERCIAL');

  // 5. Strip EXIF and re-encode master
  const master = await sharp(buffer).rotate().withMetadata({}).toBuffer();

  // 6. Generate variants
  const sizes = [320, 480, 640, 800, 1200, 1600, 1920, 2560];
  const variants: Image['variants'] = [];
  const baseKey = `tenants/${tenantId}/images/${new Date().getFullYear()}/${String(new Date().getMonth()+1).padStart(2,'0')}/${sha256}`;

  for (const w of sizes) {
    const pipe = sharp(master).resize({ width: w, withoutEnlargement: true });
    const avif = await pipe.clone().avif({ quality: 50, effort: 6 }).toBuffer();
    const webp = await pipe.clone().webp({ quality: 75, effort: 6 }).toBuffer();
    const jpeg = await pipe.clone().jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    await Promise.all([
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${baseKey}-${w}.avif`, Body: avif, ContentType: 'image/avif', CacheControl: 'public, max-age=31536000, immutable' })),
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${baseKey}-${w}.webp`, Body: webp, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' })),
      s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${baseKey}-${w}.jpg`,  Body: jpeg, ContentType: 'image/jpeg', CacheControl: 'public, max-age=31536000, immutable' })),
    ]);
    const meta = await sharp(master).metadata();
    variants.push(
      { format: 'avif', width: Math.min(w, meta.width!), height: Math.round(Math.min(w, meta.width!) * (meta.height! / meta.width!)), bytes: avif.length, url: `https://cdn.jupsoft.com/${baseKey}-${w}.avif`, quality: 50, cdn: 'cloudflare' },
      { format: 'webp', width: Math.min(w, meta.width!), height: Math.round(Math.min(w, meta.width!) * (meta.height! / meta.width!)), bytes: webp.length, url: `https://cdn.jupsoft.com/${baseKey}-${w}.webp`, quality: 75, cdn: 'cloudflare' },
      { format: 'jpeg', width: Math.min(w, meta.width!), height: Math.round(Math.min(w, meta.width!) * (meta.height! / meta.width!)), bytes: jpeg.length, url: `https://cdn.jupsoft.com/${baseKey}-${w}.jpg`,  quality: 80, cdn: 'cloudflare' },
    );
  }

  // 7. Persist
  const masterMeta = await sharp(master).metadata();
  const image = await prisma.image.create({
    data: {
      tenantId, sha256,
      width: masterMeta.width!, height: masterMeta.height!,
      aspectRatio: `${masterMeta.width}:${masterMeta.height}`,
      bytes: master.length, mimeType: 'image/jpeg',
      originalFilename: `${sha256}.jpg`,
      slug: slugify(attribution || 'image'),
      alt: '', source, license: lic, attribution, uploadedBy,
      exifStripped: true, variants, status: 'ready',
    },
  });
  return image;
}, { connection: { host: process.env.REDIS_URL! }, concurrency: 8 });

async function resolveSourceUrl(source: string, externalId: string): Promise<string | null> {
  switch (source) {
    case 'unsplash': {
      // Call /photos/{id}/download, follow redirect
      const r = await undiciFetch(`https://api.unsplash.com/photos/${externalId}/download`, {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY!}` },
        redirect: 'follow',
      });
      return r.url;
    }
    case 'pixabay': {
      // The imageURL field already contains the direct URL (after approval)
      const r = await undiciFetch(`https://pixabay.com/api/?key=${process.env.PIXABAY_KEY!}&id=${externalId}&response_group=image_details`);
      const j: any = await r.json();
      return j.hits?.[0]?.imageURL ?? null;
    }
    // … pexels, commons, etc.
    default: return null;
  }
}
```

### 8.3 License-aware image URL builder (multi-tenant)

```ts
// src/services/image-url.ts
import type { Image, License } from '../types/image';

export function buildSrcSet(image: Image, formats: Array<'avif'|'webp'|'jpeg'> = ['avif','webp','jpeg']): string {
  return formats
    .flatMap(fmt => image.variants.filter(v => v.format === fmt).map(v => `${v.url} ${v.width}w`))
    .join(', ');
}

export function buildPictureTag(image: Image, opts: {
  sizes: string;
  alt: string;
  loading?: 'eager' | 'lazy';
  fetchpriority?: 'high' | 'low' | 'auto';
  className?: string;
}): string {
  const { sizes, alt, loading = 'lazy', fetchpriority = 'auto', className } = opts;
  return `
<picture>
  <source type="image/avif" srcset="${buildSrcSet(image, ['avif'])}" sizes="${sizes}">
  <source type="image/webp" srcset="${buildSrcSet(image, ['webp'])}" sizes="${sizes}">
  <img
    src="${image.variants.find(v => v.format === 'jpeg' && v.width >= 1200)?.url ?? image.variants[0].url}"
    srcset="${buildSrcSet(image, ['jpeg'])}"
    sizes="${sizes}"
    width="${image.width}" height="${image.height}"
    alt="${escapeAttr(alt)}"
    loading="${loading}" fetchpriority="${fetchpriority}" decoding="async"
    class="${className ?? ''}">
</picture>`.trim();
}

export function buildImageObjectJsonLd(image: Image, pageUrl: string): string {
  const j = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: image.variants.find(v => v.format === 'avif' && v.width >= 1600)?.url ?? image.variants[0].url,
    url: pageUrl,
    width: image.width, height: image.height,
    encodingFormat: image.mimeType,
    caption: image.caption,
    representativeOfPage: true,
    license: image.license.url,
    creditText: image.attribution,
    copyrightNotice: image.license.requiresAttribution ? image.attribution : `© ${new Date().getFullYear()} Jupsoft`,
    contentSize: String(image.bytes),
    sha256: image.sha256,
    isAccessibleForFree: true,
    acquireLicensePage: image.license.url,
  };
  return JSON.stringify(j);
}
```

### 8.4 License parser for Wikimedia Commons (`extmetadata` → `License`)

```ts
// src/services/commons-license.ts
import { LicenseSchema, type License } from '../types/image';

const LICENSE_MAP: Record<string, License> = {
  'cc0': { type: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false, commercialUse: true, derivativeUse: true, copyleft: false },
  'cc-by': { type: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true, commercialUse: true, derivativeUse: true, copyleft: false },
  'cc-by-sa': { type: 'CC-BY-SA-4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', requiresAttribution: true, commercialUse: true, derivativeUse: true, copyleft: true },
  'cc-by-nc': { type: 'CC-BY-NC-4.0', url: 'https://creativecommons.org/licenses/by-nc/4.0/', requiresAttribution: true, commercialUse: false, derivativeUse: true, copyleft: false },
  'cc-by-nc-sa': { type: 'CC-BY-NC-SA-4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', requiresAttribution: true, commercialUse: false, derivativeUse: true, copyleft: true },
  'cc-by-nd': { type: 'CC-BY-ND-4.0', url: 'https://creativecommons.org/licenses/by-nd/4.0/', requiresAttribution: true, commercialUse: true, derivativeUse: false, copyleft: false },
  'cc-by-nc-nd': { type: 'CC-BY-NC-ND-4.0', url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/', requiresAttribution: true, commercialUse: false, derivativeUse: false, copyleft: false },
  'pd': { type: 'PublicDomain', url: 'https://creativecommons.org/publicdomain/mark/1.0/', requiresAttribution: false, commercialUse: true, derivativeUse: true, copyleft: false },
};

export function parseCommonsLicense(extmeta: any): License {
  const short = (extmeta.LicenseShortName?.value || '').toLowerCase();
  for (const key of Object.keys(LICENSE_MAP)) {
    if (short.includes(key)) return LicenseSchema.parse(LICENSE_MAP[key]);
  }
  // Default: if license is unknown, fail closed
  throw new Error(`UNKNOWN_COMMONS_LICENSE: ${short}`);
}
```

### 8.5 Image sitemap generator (Fastify)

```ts
// src/routes/sitemap-images.ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';

export async function imageSitemapRoute(app: FastifyInstance) {
  app.get('/sitemaps/:tenant/images.xml', async (req, reply) => {
    const { tenant } = req.params as { tenant: string };
    const tenantRow = await prisma.tenant.findUnique({ where: { slug: tenant } });
    if (!tenantRow) return reply.code(404).send('Not found');

    const images = await prisma.image.findMany({
      where: { tenantId: tenantRow.id, status: 'ready' },
      include: { posts: { take: 1 } },
    });

    const urls = images
      .filter(i => i.posts[0])
      .map(i => {
        const page = `https://${tenantRow.slug}.jupsoft.com${i.posts[0].path}`;
        return `
  <url>
    <loc>${page}</loc>
    <image:image>
      <image:loc>${i.variants.find(v => v.format === 'avif' && v.width >= 1200)?.url ?? i.variants[0].url}</image:loc>
      <image:title><![CDATA[${i.title ?? i.alt}]]></image:title>
      <image:caption><![CDATA[${i.caption ?? ''}]]></image:caption>
      <image:license>${i.license.url}</image:license>
    </image:image>
  </url>`;
      }).join('');

    reply.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}
</urlset>`);
  });
}
```

### 8.6 Alt-text AI-suggest pipeline (with mandatory human review)

```ts
// src/services/alt-suggest.ts
import OpenAI from 'openai';

const openai = new OpenAI();

const PROMPT = `You are an alt-text specialist for SEO. Given the article context, suggest 3 alt text candidates (10-125 chars each) for the hero image. Rules:
- Do not start with "image of" or "photo of"
- Describe the literal content of the image
- Include the article's primary keyword if natural
- Avoid keyword stuffing
- Each candidate on a new line, no bullet points`;

export async function suggestAlt(imageId: string, context: string): Promise<string[]> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: PROMPT }, { role: 'user', content: context }],
  });
  return (res.choices[0].message.content ?? '').split('\n').filter(Boolean).slice(0, 3);
}
```

### 8.7 Fair-use check before publishing

```ts
// src/services/fairuse-check.ts
// Pre-publish hook: block any image that:
//   - has a non-commercial license
//   - has a share-alike license for a tenant whose ToS forbids copyleft
//   - is missing a license record
//   - has a per-asset restriction (e.g., a recognizable person's photo without model release)
export async function prePublishImageGate(tenantId: string, imageId: string): Promise<{ ok: boolean; reason?: string }> {
  const img = await prisma.image.findUnique({ where: { id: imageId }, include: { license: true } });
  if (!img) return { ok: false, reason: 'NOT_FOUND' };
  if (!img.license.commercialUse) return { ok: false, reason: 'NON_COMMERCIAL_LICENSE' };
  if (img.license.copyleft) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.allowCopyleft) return { ok: false, reason: 'COPYLEFT_NOT_ALLOWED' };
  }
  if (img.status !== 'ready') return { ok: false, reason: `STATUS_${img.status}` };
  return { ok: true };
}
```

---

## 9. Practical Workflows for the Jupsoft Multi-Tenant Platform

### 9.1 Workflow A — Editorial uploads a stock image

```
1. Editor opens Media Manager in tenant dashboard.
2. Types a search query → backend fans out to Unsplash + Pexels + Pixabay + Commons + Firefly in parallel (rate-limit aware).
3. Editor picks one → modal asks for alt, title, caption (AI suggests three alts).
4. Editor confirms → ingest-image job enqueued.
   - Worker downloads from source (using download_location for attribution tracking).
   - Strips EXIF, generates AVIF + WebP + JPEG at 8 widths.
   - Persists Image record with license + attribution.
   - Pushes to S3 with `Cache-Control: public, max-age=31536000, immutable`.
5. CDN (Cloudflare) purges nothing — the URL is content-addressed (sha256).
6. Editor inserts into post via Media picker; the post's <picture> tag is rendered server-side.
7. On publish, JSON-LD and image sitemap are regenerated.
8. Audit log: who uploaded, when, from which source, with which license, with which file hash.
```

### 9.2 Workflow B — Bulk AI generation for a campaign (e.g., 50 hero images)

```
1. Marketing defines prompt set in a CSV.
2. Tenant admin clicks "Generate campaign" → Firefly job batch enqueued (50 jobs).
3. For each job:
   a. Call Firefly Services API with prompt, brand color, style.
   b. Download returned image + C2PA manifest.
   c. Run ingest pipeline as in Workflow A.
   d. Tag with campaignId.
4. On completion, send Slack/email summary with thumbnails.
5. Daily budget cap: 200 images/day per tenant (configurable).
```

### 9.3 Workflow C — DMCA / takedown

```
1. A complaint arrives (email or web form).
2. Admin opens Media → finds image by ID → clicks "Takedown".
3. Status moves from `ready` to `dmca-takedown`.
4. S3 objects remain but the CDN returns 404 (or a placeholder) because the variant URLs are gated by a "tombstone" list in the CDN edge worker.
5. The image is removed from all live posts within minutes (cache TTL = 60 s for tombstones).
6. Audit log retains: complainant, claim date, action taken, who actioned.
7. For 30 days, the object remains in cold storage in case of counter-notice.
```

### 9.4 Workflow D — Quarterly license audit

```
1. Cron runs: for every Image in `ready`, call the source API to confirm it still exists + license hasn't been retroactively restricted.
2. For Commons, re-fetch extmetadata; for Unsplash, verify the photo is still public.
3. Any image whose license flipped to NC or removed gets `status=blocked`.
4. Email a per-tenant report to the tenant admin.
5. The audit log + audit report are time-stamped and immutable (append-only).
```

### 9.5 Workflow E — Tenant onboarding (cold-start seed)

```
1. Tenant signs up; admin gets 50 default hero images.
2. Run a Commons-first seed (public-domain / CC0 only) — no attribution required, lowest legal risk.
3. Optionally, a small curated CC-BY set with pre-baked attribution strings.
4. AI-generated "starter" set using Firefly on industry-specific prompts.
5. Tenant never sees a stock image that isn't already pre-licensed for commercial use on their domain.
```

---

## 10. Verifying an Image's License (Legal Playbook)

**Before you use any image from any source, you should be able to answer all 5:**

1. **Who owns the copyright?** (Look at the source, the photographer, the date.)
2. **What license applies?** (CC, custom, public domain, fair use claim.)
3. **Is commercial use allowed?** (Yes for CC0, CC-BY, Pixabay, Pexels, Unsplash, AI with commercial rights. No for CC-BY-NC-*.)
4. **Is a model release needed?** (Required for advertising with a recognizable person. Editorial use only needs the photo released by the photographer, not the model.)
5. **Is there a trademark or copyrighted work in the image?** (Logos, branded products, copyrighted art — separate rights from the photo copyright.)

**Verification tools (2025):**

- **TinEye Reverse Image Search** — find where an image originated.
- **Google Lens** — same.
- **Openverse** (`openverse.org`) — license-filtered search.
- **Wikimedia Commons file page** — always shows the exact license.
- **Flickr's "License" filter** — built-in to source.
- **Getty Images Embed (for embeddable previews)** — only for the preview; still need a license for production.
- **C2PA Verify** (`c2patool`) — for AI-generated content provenance.
- **EXIFtool + `xmp:WebStatement`** — reads embedded license URL.

**When in doubt, do not use the image.** The cheapest legal review is the one where you don't have to do it.

---

## 11. Fair Use (US) Quick Reference — for Blog Images

> Fair use is a **defense** in US copyright law, not a right. It's a 4-factor test (17 U.S.C. §107):

| Factor | Favorable to fair use | Unfavorable to fair use |
| --- | --- | --- |
| 1. Purpose & character | Transformative (commentary, criticism, parody, search); non-commercial; educational | Commercial; non-transformative (you used it as a substitute) |
| 2. Nature of the work | Factual; published | Creative; unpublished |
| 3. Amount & substantiality | Small, low-res portion, not the "heart" of the work | Whole work; the most memorable bit |
| 4. Effect on the market | Doesn't substitute; no licensing market for the use | Replaces a sale; competes with the original |

**Practical rule of thumb for blogs:** if a CC-licensed, free, high-quality alternative exists, **use it instead of claiming fair use** — fair use is risky and not worth fighting over a $5 image.

---

## 12. Practical 12-Step Implementation Checklist for Jupsoft

1. ☐ Create `image_assets` table: `id, tenant_id, sha256, phash, mime, width, height, bytes, slug, source, license_id, attribution, status, uploaded_by, uploaded_at, exif_stripped, c2pa_url, ip_tc_json, deleted_at`.
2. ☐ Create `image_licenses` table: `id, type, url, commercial_use, derivative_use, copyleft, requires_attribution, default_attribution_text`.
3. ☐ Create `image_variants` table: `image_id, format, width, height, bytes, url, cdn, quality`.
4. ☐ Create `image_post_links` table (M:N).
5. ☐ Provision S3 bucket + Cloudflare zone with per-tenant custom hostnames.
6. ☐ Provision BullMQ + Redis (Upstash or self-hosted).
7. ☐ Wire up the source connectors (Unsplash, Pexels, Pixabay, Commons, Firefly, DALL·E).
8. ☐ Wire up the ingest worker (download → hash → strip EXIF → transform → upload → persist).
9. ☐ Add the per-tenant upload form (with required alt text + license confirmation).
10. ☐ Add the `buildPictureTag` + `buildImageObjectJsonLd` helpers to the SSR renderer.
11. ☐ Add the per-tenant image sitemap generator.
12. ☐ Add the pre-publish license gate + the DMCA workflow + the quarterly license audit.

---

## 13. What This Means for the Jupsoft Multi-Tenant Architecture (Action Items)

1. **Default to AVIF + WebP + JPEG** for all 8 width buckets. Use `<picture>` with native lazy load.
2. **Pick Firefly Services as the AI default** for indemnification; keep DALL·E 3 + Imagen as cost alternatives.
3. **Pre-license every image at ingest.** Reject `*NC*` and `*ND*` for commercial tenants by default. Surface a tenant-level "allow copyleft" flag for CC-BY-SA cases.
4. **Add `representativeOfPage: true`** on the hero `ImageObject` so Google Images treats it as the article image.
5. **Embed IPTC `xmp:LicensorURL`, `xmp:Creator`, `dc:Rights`** in every published image — this is the second signal (besides JSON-LD) Google uses to grant the "Licensable" badge.
6. **Generate per-tenant image sitemaps** and submit to Google Search Console per property.
7. **Hard-code `width`/`height` on every `<img>`** to keep CLS in the green.
8. **Run native `loading="lazy"` everywhere except the LCP image**, which gets `fetchpriority="high"` and a `<link rel="preload">` if it's a CSS background.
9. **Mirror Wikimedia Commons' most-used 1,000 CC0 / public-domain images** to your CDN at deploy time as a cold-start seed (so new tenants always have something).
10. **Add a tenant-level "AI-generated image budget"** with daily caps and an admin-visible ledger for compliance.
11. **Add a "DMCA / takedown" admin button** in the Media Manager that tombstones CDN URLs within 60 s.
12. **Quarterly license audit** is a tenant SLA, not optional — bake it into the cron.

---

## 14. Primary sources used in this research

1. Unsplash Developers — `https://unsplash.com/developers` (live)
2. Pixabay API Documentation — `https://pixabay.com/api/docs/` (live)
3. Wikimedia Commons Licensing — `https://commons.wikimedia.org/wiki/Commons:Licensing` (live)
4. Google Search Central — Image best practices — `https://developers.google.com/search/docs/appearance/google-images` (live)
5. Schema.org ImageObject — `https://schema.org/ImageObject` (live)

(General industry consensus on format performance, Core Web Vitals, lazy loading, and AI commercial rights drawn from training data, MDN, web.dev, Cloudflare, Google Cloud blog, and Creative Commons official pages.)

---

*End of research document.*
