import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { jupsoft, JupsoftClient } from '../client.js';
import type { BlogListPageProps } from '../types.js';

export { BlogListPageProps };

export async function JupsoftBlogList({ searchParams, client }: BlogListPageProps & { client?: JupsoftClient }) {
  const activeClient = client || jupsoft;
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;
  
  // Fix Bug #12: Sanitize page number to positive integer
  const currentPage = Math.max(1, Math.floor(Number(sp.page) || 1));
  const selectedCategory = sp.category || '';
  const searchQuery = sp.q || '';

  // Fix Bug #9: Auto-detect visitor system language using ordered preference matching
  const headerStore = await headers();
  const acceptLang = (headerStore.get('accept-language') || '').toLowerCase();
  let currentLang = sp.lang;
  if (!currentLang) {
    const langs = acceptLang.split(',').map((s) => s.split(';')[0].trim().slice(0, 2));
    const supported = ['en', 'hi', 'fr', 'ar'];
    currentLang = supported.find((l) => langs.includes(l)) || 'en';
  }

  const [blogsRes, categoriesRes] = await Promise.all([
    activeClient.getBlogs({
      page: currentPage,
      limit: 9,
      category: selectedCategory || undefined,
      q: searchQuery || undefined,
      lang: currentLang,
    }),
    activeClient.getCategories().catch(() => ({ success: true, data: [] })),
  ]);

  const blogs = blogsRes.data || [];
  const total = blogsRes.meta?.total || blogs.length;
  const totalPages = Math.ceil(total / 9) || 1;
  const categories = categoriesRes.data || [];

  return (
    <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Latest News &amp; Insights
        </h1>
        <p className="text-lg text-slate-600">
          Stay informed with architectural insights, technology guides, and enterprise updates.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-4 border-b border-slate-100">
        <div className="flex items-center flex-wrap gap-2">
          <Link
            href={`/blog?lang=${currentLang}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog?category=${encodeURIComponent(cat.slug || cat.id)}&lang=${currentLang}`}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === (cat.slug || cat.id)
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <div className="relative group inline-block self-end sm:self-auto">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer border border-slate-200/80">
            <span className="text-sm leading-none">🌐</span>
            <span className="uppercase tracking-wider">{currentLang}</span>
            <span className="text-[10px] text-slate-400">▾</span>
          </button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
            {[
              { code: 'en', native: 'English' },
              { code: 'hi', native: 'हिंदी' },
              { code: 'fr', native: 'Français' },
              { code: 'ar', native: 'العربية' },
            ].map((l) => (
              <Link
                key={l.code}
                href={`/blog?lang=${l.code}${selectedCategory ? `&category=${selectedCategory}` : ''}`}
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
        </div>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-lg">No articles found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {post.featuredImage && (
                <Link href={`/blog/${post.slug}?lang=${currentLang}`} className="block relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </Link>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Recent'}</span>
                  <span>&middot;</span>
                  <span>{post.readTimeMinutes || 5} min read</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                  <Link href={`/blog/${post.slug}?lang=${currentLang}`}>{post.title}</Link>
                </h2>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                  {post.excerpt}
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-900">{post.authorName}</span>
                  <Link
                    href={`/blog/${post.slug}?lang=${currentLang}`}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Read article &rarr;
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {currentPage > 1 && (
            <Link
              href={`/blog?page=${currentPage - 1}&lang=${currentLang}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ''}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
            >
              &larr; Previous
            </Link>
          )}
          <span className="text-sm text-slate-500 px-3">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/blog?page=${currentPage + 1}&lang=${currentLang}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ''}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50"
            >
              Next &rarr;
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
