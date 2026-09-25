import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { jupsoft } from './client.js';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-signature');
  const headerSecret =
    req.headers.get('x-cms-webhook-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const expectedSecret =
    (typeof process !== 'undefined' ? process.env?.CMS_WEBHOOK_SECRET : undefined) ||
    'wh_sec_jupsoft_default_revalidate_2026';

  // Multi-Gate Authentication:
  // 1. Direct Secret header check (fast, works across custom setups)
  // 2. Cryptographic HMAC SHA-256 signature verification
  let isValid = false;
  if (headerSecret && headerSecret.trim() === expectedSecret.trim()) {
    isValid = true;
  } else if (signature) {
    isValid = await jupsoft.verifyWebhookSignature(bodyText, signature, expectedSecret);
  }

  if (!isValid) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized: Invalid HMAC signature or webhook secret' },
      { status: 401 }
    );
  }

  let payload: any = {};
  if (bodyText && bodyText.trim()) {
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ ok: false, error: 'Malformed JSON payload' }, { status: 400 });
    }
  }

  // Safely revalidate both Tags and App Router paths
  try {
    if (typeof revalidatePath === 'function') {
      revalidatePath('/blog');
      revalidatePath('/blog/[slug]', 'page');
    }
  } catch {}

  if (payload.event === 'blog.published' || payload.event === 'blog.archived') {
    if (payload.slug && typeof payload.slug === 'string') {
      const cleanSlug = payload.slug.trim();
      try { (revalidateTag as any)(`blog:${cleanSlug}`); } catch {}
      try { if (typeof revalidatePath === 'function') revalidatePath(`/blog/${cleanSlug}`); } catch {}
    }
    try { (revalidateTag as any)('blogs'); } catch {}
    try { (revalidateTag as any)('blogs-list'); } catch {}
  }

  return NextResponse.json({ ok: true, revalidated: true, now: Date.now() });
}
