import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { jupsoft, JupsoftClient } from '../client.js';
import type { PageProps } from '../types.js';

export async function JupsoftBlogDetail({ params, searchParams, client }: PageProps & { client?: JupsoftClient }) {
  const activeClient = client || jupsoft;
  
  // Fix Bug #3: Safely resolve params whether Promise or object without crashing on undefined
  const resolvedParams = (params ? await params : {}) as { slug?: string };
  const slug = resolvedParams?.slug || '';
  if (!slug) notFound();

  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

  // Fix Bug #10: Ordered language preference matching
  const headerStore = await headers();
  const acceptLang = (headerStore.get('accept-language') || '').toLowerCase();
  let currentLang = sp?.lang;
  if (!currentLang) {
    const langs = acceptLang.split(',').map((s) => s.split(';')[0].trim().slice(0, 2));
    const supported = ['en', 'hi', 'fr', 'ar'];
    currentLang = supported.find((l) => langs.includes(l)) || 'en';
  }

  const blog = await activeClient.getBlogBySlug(slug, currentLang);
  if (!blog) notFound();

  activeClient.recordView(slug, blog.id);

  const resolveImageUrl = (img?: string) => {
    if (!img) return '';
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const base = activeClient.apiUrl || 'https://blogary.jupsoft.com';
    return `${base.replace(/\/$/, '')}/${img.replace(/^\//, '')}`;
  };

  return (
    <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href={`/blog?lang=${currentLang}`} className="hover:text-slate-900">Blog</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{blog.title}</span>
        </nav>

        <details className="relative inline-block cursor-pointer">
          <summary className="list-none select-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors border border-slate-200/80">
            <span className="text-sm leading-none">🌐</span>
            <span className="uppercase tracking-wider">{currentLang}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </summary>
          <div className="absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 animate-in fade-in duration-150">
            {[
              { code: 'en', native: 'English' },
              { code: 'hi', native: 'हिंदी' },
              { code: 'fr', native: 'Français' },
              { code: 'ar', native: 'العربية' },
            ].map((l) => (
              <Link
                key={l.code}
                href={`/blog/${slug}?lang=${l.code}`}
                className={`flex items-center justify-between px-3.5 py-1.5 text-xs transition-colors ${
                  currentLang === l.code
                    ? 'font-bold text-blue-600 bg-blue-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{l.native}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{l.code}</span>
              </Link>
            ))}
          </div>
        </details>
      </div>

      {blog.schemaJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blog.schemaJsonLd) }}
        />
      )}

      <header className="mb-8">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-4">
          {blog.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-900">{blog.authorName}</span>
          <span>&middot;</span>
          <span>{blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : 'Recent'}</span>
          <span>&middot;</span>
          <span>{blog.readTimeMinutes} min read</span>
        </div>
      </header>

      {blog.featuredImage && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-8 shadow-sm">
          <img
            src={resolveImageUrl(blog.featuredImage)}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-slate lg:prose-lg max-w-none mb-12 text-slate-800 leading-relaxed text-base sm:text-lg [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-slate-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-slate-900 [&_h2]:border-b [&_h2]:border-slate-100 [&_h2]:pb-2 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-slate-900 [&_p]:mb-5 [&_p]:leading-relaxed [&_p]:text-slate-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_ol]:space-y-1.5 [&_li]:text-slate-700 [&_strong]:text-slate-900 [&_strong]:font-semibold [&_pre]:bg-slate-950 [&_pre]:text-emerald-400 [&_pre]:p-5 [&_pre]:rounded-2xl [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:text-sm [&_pre]:font-mono [&_code]:font-mono [&_code]:text-sm [&_code]:bg-slate-100 [&_code]:text-pink-600 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_blockquote]:text-slate-600 [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
        <Link
          href={`/blog?lang=${currentLang}`}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          &larr; Back to all articles
        </Link>
      </div>
    </main>
  );
}
