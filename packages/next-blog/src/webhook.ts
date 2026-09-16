import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { jupsoft } from './client.js';

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('x-signature');

  // Verify HMAC SHA-256 signature using the SDK
  const isValid = await jupsoft.verifyWebhookSignature(bodyText, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  // Invalidate specific article cache and list tags (Fix Bug #6: safely validate slug)
  if (payload.event === 'blog.published' || payload.event === 'blog.archived') {
    if (payload.slug && typeof payload.slug === 'string') {
      const cleanSlug = payload.slug.trim();
      (revalidateTag as any)(`blog:${cleanSlug}`);
    }
    (revalidateTag as any)('blogs');
    (revalidateTag as any)('blogs-list');
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
