# @jupsoft/next-blog

> Turnkey, high-performance Blog Engine for Next.js 14, 15, and 16 App Router powered by Jupsoft Centralized CMS.

## Features
- 🚀 **1-Command Setup**: Zero configuration needed.
- 🌐 **Automatic Browser Locale Detection**: Detects `hi`, `fr`, `ar`, with fallback to `en`.
- 🔍 **Google Search Console Hreflang SEO**: Automatic multi-language canonical and alternate links.
- ⚡ **On-Demand ISR Revalidation**: Webhook cache purge in under 50ms.
- 🖼️ **WebP Image Support**: Pre-configured responsive images.
- 🎨 **Sleek Micro-Dropdown**: Modern `[ 🌐 EN ▾ ]` language switcher.

## Quickstart

Run the automatic scaffolder inside your Next.js project:

```bash
npx @jupsoft/next-blog --key=YOUR_API_KEY --site=YOUR_WEBSITE_ID
```

Or install manually:

```bash
npm install @jupsoft/next-blog
```

### 1. Blog Listing Grid (`app/blog/page.tsx`)
```tsx
import { JupsoftBlogList } from '@jupsoft/next-blog';

export const revalidate = 3600;
export default JupsoftBlogList;
```

### 2. Single Article Post (`app/blog/[slug]/page.tsx`)
```tsx
import { JupsoftBlogDetail, generateBlogMeta } from '@jupsoft/next-blog';

export const revalidate = 3600;
export const generateMetadata = generateBlogMeta;
export default JupsoftBlogDetail;
```

### 3. On-Demand ISR Webhook (`app/api/revalidate/route.ts`)
```ts
export { POST } from '@jupsoft/next-blog/webhook';
```

## Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_CMS_API_URL=https://blogary.jupsoft.com/api
CMS_WEBSITE_ID=your-website-id
CMS_TENANT_API_KEY=your-api-key
CMS_WEBHOOK_SECRET=wh_sec_jupsoft_default_revalidate_2026
```
> *Note: If `CMS_WEBHOOK_SECRET` is not provided, the SDK automatically defaults to `wh_sec_jupsoft_default_revalidate_2026` for seamless zero-config webhook verification.*

