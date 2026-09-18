'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import { analyzeSEO } from '../../utils/seoAuditor';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  AlertTriangle, 
  Check, 
  X, 
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Tag as TagIcon,
  Calendar,
  RefreshCw,
  Share2,
  Copy,
  Code2,
  Bot,
  Eye,
  Laptop,
  Tablet,
  Smartphone,
  ExternalLink,
  Clock,
  Globe, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { LanguageCode, BlogStatus, Blog, BlogTranslation, BlogSEO } from '../../types';
import { createEmptySEO } from '../../data/initialData';
import { canPublish, canApprove } from '../../utils/permissions';
import { apiClient } from '../../services/apiClient';

interface BlogEditorProps {
  blogId?: string | null;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({ blogId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    editingBlogId, 
    blogs, 
    activeWebsiteId, 
    websites, 
    categories, 
    tags, 
    media,
    saveBlog, 
    showNotification,
    activeRole,
    addRedirect,
    currentUser,
    uiTheme,
  } = useBlogStore();

  const isZoho = uiTheme === 'zoho';

  const targetBlogId = blogId !== undefined ? blogId : editingBlogId;

  // Find existing blog or initialize new draft
  const existingBlog = useMemo(() => {
    return targetBlogId ? blogs.find((b) => b.id === targetBlogId) : null;
  }, [targetBlogId, blogs]);

  // Target website selection: scoped to existing post's site or current filter or fallback to first site
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(() => {
    if (existingBlog?.websiteId) return existingBlog.websiteId;
    if (activeWebsiteId && activeWebsiteId !== 'all') return activeWebsiteId;
    return websites[0]?.id || 'site-cloud';
  });

  const activeSite = websites.find((w) => w.id === selectedWebsiteId) || websites[0] || { id: 'site-cloud', name: 'Jupsoft Cloud & ERP' };
  const siteCategories = categories[selectedWebsiteId] || [];
  const siteTags = tags[selectedWebsiteId] || [];
  const siteMedia = useMemo(() => {
    const raw = media.filter((m) => m.websiteId === selectedWebsiteId);
    const seen = new Set<string>();
    return raw.filter((m) => {
      if (!m?.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [media, selectedWebsiteId]);

  // URL query params for language, inspector tab, and status
  const urlLang = searchParams.get('lang') as LanguageCode;
  const validLang = ['en', 'hi', 'fr', 'ar'].includes(urlLang) ? urlLang : 'en';
  
  const urlTab = searchParams.get('tab') as 'seo' | 'social' | 'metadata' | 'media';
  const validTab = ['seo', 'social', 'metadata', 'media'].includes(urlTab) ? urlTab : 'seo';

  const urlStatus = searchParams.get('status') as BlogStatus;
  const validStatuses: BlogStatus[] = ['Draft', 'Under Review', 'Approved', 'Scheduled', 'Published', 'Archived'];

  const currentLang = validLang;
  const activeInspectorTab = validTab;
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageTabClick = (lang: LanguageCode) => {
    setParam('lang', lang === 'en' ? null : lang);
  };

  const handleInspectorTabClick = (tab: 'seo' | 'social' | 'metadata' | 'media') => {
    setParam('tab', tab === 'seo' ? null : tab);
  };

  const allowedStatuses = useMemo(() => {
    const list: BlogStatus[] = ['Draft', 'Under Review'];
    if (canApprove(activeRole)) {
      list.push('Approved', 'Archived');
    }
    if (canPublish(activeRole)) {
      list.push('Scheduled', 'Published');
      if (!list.includes('Archived')) list.push('Archived');
    }
    return list;
  }, [activeRole]);

  // Working state for the post
  const [status, setStatus] = useState<BlogStatus>(
    existingBlog?.status || (validStatuses.includes(urlStatus) ? urlStatus : 'Draft')
  );

  const handleStatusChange = (newStatus: BlogStatus) => {
    if (!allowedStatuses.includes(newStatus)) {
      showNotification(`Your role (${activeRole}) cannot transition article to "${newStatus}".`, 'warning');
      return;
    }
    setStatus(newStatus);
    setParam('status', newStatus === 'Draft' ? null : newStatus);
  };

  const [featuredImage, setFeaturedImage] = useState(existingBlog?.featuredImage || '');
  const [featuredImageAlt, setFeaturedImageAlt] = useState(existingBlog?.featuredImageAlt || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(existingBlog?.categoryIds || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingBlog?.tagIds || []);
  const [scheduledAt, setScheduledAt] = useState(existingBlog?.scheduledAt || '');

  // Per-language dictionary state
  const defaultTrans = (lang: LanguageCode): BlogTranslation => ({
    id: `trans-${lang}-${Date.now()}`,
    blogId: existingBlog?.id || `blog-${Date.now()}`,
    languageCode: lang,
    title: '',
    slug: '',
    excerpt: '',
    content: '<p>Start drafting your high-impact article here...</p>',
    seo: createEmptySEO(),
  });

  const [translations, setTranslations] = useState<Record<LanguageCode, BlogTranslation>>(() => {
    if (existingBlog?.translations) {
      return {
        en: existingBlog.translations.en || defaultTrans('en'),
        hi: existingBlog.translations.hi || defaultTrans('hi'),
        fr: existingBlog.translations.fr || defaultTrans('fr'),
        ar: existingBlog.translations.ar || defaultTrans('ar'),
      };
    }
    return {
      en: defaultTrans('en'),
      hi: defaultTrans('hi'),
      fr: defaultTrans('fr'),
      ar: defaultTrans('ar'),
    };
  });

  const activeTrans = translations[currentLang];

  // Tiptap Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-xl my-4 max-w-full h-auto',
          loading: 'lazy',
        },
      }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: activeTrans.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setTranslations((prev) => ({
        ...prev,
        [currentLang]: {
          ...prev[currentLang],
          content: html,
        },
      }));
    },
  });

  // Sync editor content when language tab switches
  useEffect(() => {
    if (editor && activeTrans) {
      if (editor.getHTML() !== activeTrans.content) {
        editor.commands.setContent(activeTrans.content || '<p></p>');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLang, editor]);

  // Strictly typed helper functions
  const updateActiveTransField = <K extends keyof BlogTranslation>(
    field: K,
    value: BlogTranslation[K]
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLang]: {
        ...prev[currentLang],
        [field]: value,
      },
    }));
  };

  const updateActiveSeoField = <K extends keyof BlogSEO>(
    field: K,
    value: BlogSEO[K]
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLang]: {
        ...prev[currentLang],
        seo: {
          ...prev[currentLang].seo,
          [field]: value,
        },
      },
    }));
  };

  function slugify(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Handle title change & auto-generate slug atomically
  const handleTitleChange = (newTitle: string) => {
    setTranslations((prev) => {
      const current = prev[currentLang];
      const shouldAutoSlug = !current.slug || current.slug === slugify(current.title || '');
      const newSlug = shouldAutoSlug ? slugify(newTitle) : current.slug;

      const updatedSeo = { ...current.seo };
      if (!updatedSeo.metaTitle || updatedSeo.metaTitle === current.title) {
        updatedSeo.metaTitle = newTitle;
      }
      if (!updatedSeo.ogTitle || updatedSeo.ogTitle === current.title) {
        updatedSeo.ogTitle = newTitle;
      }
      if (!updatedSeo.twitterTitle || updatedSeo.twitterTitle === current.title) {
        updatedSeo.twitterTitle = newTitle;
      }
      if (shouldAutoSlug) {
        updatedSeo.canonicalUrl = `https://${activeSite.domain}/blog/${newSlug}`;
      }

      return {
        ...prev,
        [currentLang]: {
          ...current,
          title: newTitle,
          slug: newSlug,
          seo: updatedSeo,
        },
      };
    });
  };

  // Live SEO Analysis (TRD Section 11)
  const seoResult = useMemo(() => {
    return analyzeSEO({
      title: activeTrans.title,
      slug: activeTrans.slug,
      content: activeTrans.content,
      seo: activeTrans.seo,
      featuredImage,
      featuredImageAlt,
    });
  }, [activeTrans, featuredImage, featuredImageAlt]);

  // JSON-LD Schema Generator (TRD Section 11 & 12)
  const jsonLdSchema = useMemo(() => {
    return JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: activeTrans.title || 'Untitled Post',
        description: activeTrans.seo.metaDescription || activeTrans.excerpt || 'Blog summary',
        image: [featuredImage || `https://${activeSite.domain}/og-cover.webp`],
        datePublished: existingBlog?.publishDate || new Date().toISOString(),
        dateModified: new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: existingBlog?.authorName || 'Current User',
        },
        publisher: {
          '@type': 'Organization',
          name: activeSite.name,
          logo: {
            '@type': 'ImageObject',
            url: activeSite.logoUrl || `https://${activeSite.domain}/logo.png`,
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://${activeSite.domain}/blog/${activeTrans.slug || 'draft'}`,
        },
      },
      null,
      2
    );
  }, [activeTrans, featuredImage, existingBlog, activeSite]);

  const copySchemaJson = () => {
    navigator.clipboard.writeText(jsonLdSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  // Real-time AI Multi-Language Translation Engine
  const [isTranslating, setIsTranslating] = useState(false);

  const handleAITranslate = async () => {
    const enTrans = translations.en;
    if (!enTrans || !enTrans.title) {
      showNotification('Please fill the English (EN) post title first.', 'warning');
      return;
    }
    if (currentLang === 'en') {
      showNotification('Active tab is already English (EN). Switch to Hindi, French, or Arabic to translate.', 'info');
      return;
    }

    setIsTranslating(true);
    showNotification(`Translating English content to ${currentLang.toUpperCase()} via real-time translation engine...`, 'info');

    try {
      const currentEditorHtml = editor?.getHTML() || enTrans.content;
      const res = await apiClient.translateText({
        title: enTrans.title,
        excerpt: enTrans.excerpt,
        content: currentEditorHtml,
        from: 'en',
        to: currentLang,
      });

      const transTitle = res.title || enTrans.title;
      const transSlug = `${enTrans.slug || 'article'}-${currentLang}`;
      const transContent = res.content || currentEditorHtml;
      const transExcerpt = res.excerpt || enTrans.excerpt;

      setTranslations((prev) => ({
        ...prev,
        [currentLang]: {
          ...prev[currentLang],
          title: transTitle,
          slug: transSlug,
          excerpt: transExcerpt,
          content: transContent,
          seo: {
            ...enTrans.seo,
            metaTitle: transTitle,
            ogTitle: transTitle,
            twitterTitle: transTitle,
            metaDescription: transExcerpt || enTrans.seo?.metaDescription,
          },
        },
      }));

      if (editor) {
        editor.commands.setContent(transContent);
      }
      showNotification(`Successfully translated post to ${currentLang.toUpperCase()}!`, 'success');
    } catch (err: any) {
      console.error('Translation error:', err);
      showNotification(`Translation error: ${err?.message || 'Failed to translate'}`, 'warning');
    } finally {
      setIsTranslating(false);
    }
  };

  // Insert image into editor canvas
  const handleInsertImageIntoEditor = (item: { cdnUrl: string; altText: string }) => {
    if (editor) {
      editor.chain().focus().setImage({ src: item.cdnUrl, alt: item.altText, title: item.altText }).run();
      setMediaPickerOpen(false);
      showNotification('Image inserted into content canvas', 'success');
    }
  };

  // Save handler with TRD 301 Permanent Redirect Guard
  const handleSave = async () => {
    // 1. Validation: ensure primary title is provided
    const currentTrans = translations[currentLang];
    const enTrans = translations.en;
    const effectiveTitle = currentTrans?.title?.trim() || enTrans?.title?.trim();
    if (!effectiveTitle) {
      showNotification('Please enter an article title before saving.', 'warning');
      return;
    }

    const targetSiteId = selectedWebsiteId || (activeWebsiteId !== 'all' ? activeWebsiteId : 'site-cloud');
    const id = existingBlog?.id || `blog-${Date.now()}`;
    const oldSlug = existingBlog?.translations[currentLang]?.slug;
    const newSlug = activeTrans.slug || slugify(effectiveTitle);

    // TRD Section 7: If published slug changed, auto-record 301 redirect
    if (existingBlog?.status === 'Published' && oldSlug && newSlug && oldSlug !== newSlug) {
      addRedirect({
        id: `red-${Date.now()}`,
        websiteId: targetSiteId,
        fromSlug: oldSlug,
        toSlug: newSlug,
        statusCode: 301,
        hitCount: 0,
        createdAt: new Date().toISOString(),
      });
    }

    // Ensure all authored translations have a valid slug
    const cleanedTranslations = { ...translations };
    for (const l of (['en', 'hi', 'fr', 'ar'] as LanguageCode[])) {
      if (cleanedTranslations[l]?.title && !cleanedTranslations[l]?.slug) {
        cleanedTranslations[l] = {
          ...cleanedTranslations[l],
          slug: slugify(cleanedTranslations[l].title),
        };
      }
    }

    const newBlog: Blog = {
      id,
      websiteId: targetSiteId,
      authorId: currentUser?.id || existingBlog?.authorId || 'usr-superadmin',
      authorName: currentUser?.name || existingBlog?.authorName || 'Staff Writer',
      authorAvatar: currentUser?.avatar || existingBlog?.authorAvatar || '/uploads/avatars/avatar-default.webp',
      featuredImage,
      featuredImageAlt,
      status,
      publishDate: status === 'Published' && !existingBlog?.publishDate ? new Date().toISOString() : existingBlog?.publishDate,
      scheduledAt: scheduledAt || undefined,
      publishedBy: status === 'Published' ? (currentUser?.name || `User (${activeRole})`) : existingBlog?.publishedBy,
      viewCount: existingBlog?.viewCount || 0,
      readTimeMinutes: Math.max(2, Math.round((editor?.getText().split(/\s+/).length || 200) / 180)),
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      translations: cleanedTranslations,
      workflowLogs: existingBlog?.workflowLogs || [
        {
          id: `wl-${Date.now()}`,
          blogId: id,
          fromStatus: 'Draft',
          toStatus: status,
          changedBy: currentUser?.name || 'Current User',
          role: activeRole,
          notes: 'Blog created and saved in admin workspace.',
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: existingBlog?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await saveBlog(newBlog);
      showNotification(status === 'Published' ? 'Blog published successfully! 🎉' : 'Blog saved successfully! ✅', 'success');
      router.push(`/blogs?site=${targetSiteId}`);
    } catch (err: any) {
      console.warn('saveBlog error:', err);
      showNotification(err?.message || 'Error saving blog to database.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const isRTL = currentLang === 'ar';

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Editor Sub-Bar: Breadcrumb, language switcher, AI translate & save */}
      <div className={`border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 gap-2 overflow-x-auto no-scrollbar ${isZoho ? 'h-10 bg-white dark:bg-[#0c1322] px-3' : 'h-12 bg-white dark:bg-[#0f172a] px-3 sm:px-4'}`}>
        {/* Left: Breadcrumbs with auto-truncation for long article titles */}
        <div className="flex items-center space-x-1.5 text-xs min-w-0 max-w-[150px] sm:max-w-[220px] lg:max-w-[300px] shrink">
          <Link
            href={`/blogs?site=${selectedWebsiteId}`}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Back to blogs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <div className="flex items-center gap-1 font-medium min-w-0 truncate">
            <Link href={`/blogs?site=${selectedWebsiteId}`} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0">
              Blogs
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-slate-900 dark:text-white font-semibold truncate" title={existingBlog ? (activeTrans.title || 'Edit Blog') : 'New Blog'}>
              {existingBlog ? (activeTrans.title || 'Edit Blog') : 'New Blog'}
            </span>
          </div>
        </div>

        {/* Center: Language Switcher Tabs & AI Assistant */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {(['en', 'hi', 'fr', 'ar'] as LanguageCode[]).map((lang) => {
              const hasTitle = Boolean(translations[lang]?.title);
              const isActive = currentLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLanguageTabClick(lang)}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? (isZoho ? 'bg-red-600 text-white shadow-2xs font-bold' : 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-2xs')
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{lang.toUpperCase()}</span>
                  {hasTitle && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {currentLang !== 'en' && (
            <button
              onClick={handleAITranslate}
              disabled={isTranslating}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Real-time multi-language translation from English"
            >
              {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
              <span className="hidden md:inline">{isTranslating ? 'Translating...' : 'Translate EN'}</span>
            </button>
          )}
        </div>

        {/* Right: Target Website (Fully Clickable), Status, Preview & Save */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Target Website Selector - Always Clickable & Interactive */}
          <div
            className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 hover:border-indigo-400 transition-colors cursor-pointer"
            title="Switch Target Website"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[105px] sm:max-w-[130px] truncate"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {status === 'Scheduled' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
              <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
              <input
                type="datetime-local"
                value={scheduledAt ? scheduledAt.substring(0, 16) : ''}
                onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="bg-transparent text-[10px] font-mono focus:outline-none max-w-[125px]"
                title="Scheduled publication timestamp"
              />
            </div>
          )}

          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as BlogStatus)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-md px-2 py-1 focus:outline-none cursor-pointer shrink-0"
          >
            {allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Preview article"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 ${isZoho ? 'bg-red-600 hover:bg-red-700 text-white font-bold' : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-md'}`}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Authoring Canvas & Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Document Area */}
        <div className={`flex-1 flex flex-col overflow-y-auto ${isZoho ? 'px-4 sm:px-8 py-3 space-y-2.5' : 'px-6 sm:px-12 py-6 space-y-4'}`}>
          {/* Published Slug 301 Warning Notice (TRD Section 7) */}
          {status === 'Published' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-center space-x-3 text-xs text-amber-800 dark:text-amber-300 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>SEO Continuity:</strong> Blog is published. Modifying the slug will automatically establish a 301 Permanent Redirect.
              </span>
            </div>
          )}

          {/* AI Auto-Translate Quick Action Banner for Blank Locale Tabs */}
          {currentLang !== 'en' && !activeTrans.title && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">This locale ({currentLang.toUpperCase()}) is currently blank.</div>
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    Instantly generate translated title, body, and SEO tags from English.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAITranslate}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <span>⚡ Auto-Translate with AI</span>
              </button>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1">
            <input
              type="text"
              placeholder={`Enter post title (${currentLang.toUpperCase()})...`}
              value={activeTrans.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`w-full bg-transparent font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none tracking-tight pb-1.5 transition-colors border-b border-slate-200 dark:border-slate-800 ${isZoho ? 'text-xl sm:text-2xl focus:border-red-500' : 'text-2xl sm:text-3xl pb-2 focus:border-slate-400 dark:focus:border-slate-600'}`}
            />
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>https://{activeSite.domain}/blog/</span>
              <input
                type="text"
                value={activeTrans.slug}
                onChange={(e) => updateActiveTransField('slug', slugify(e.target.value))}
                placeholder="url-slug"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-indigo-600 dark:text-indigo-400 font-mono focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Excerpt Input */}
          <div>
            <textarea
              placeholder={`Short excerpt / abstract for index pages (${currentLang.toUpperCase()})...`}
              value={activeTrans.excerpt}
              onChange={(e) => updateActiveTransField('excerpt', e.target.value)}
              rows={2}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`w-full border placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors ${isZoho ? 'bg-white dark:bg-[#0c1322] border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-800 dark:text-slate-200 focus:border-red-500 shadow-none' : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-slate-400 shadow-xs'}`}
            />
          </div>

          {/* Tiptap Floating Toolbar */}
          {editor && (
            <div className={`sticky top-0 z-20 backdrop-blur-md border flex flex-wrap items-center ${isZoho ? 'bg-slate-50/95 dark:bg-[#0c1322]/95 border-slate-300 dark:border-slate-700 rounded p-1 gap-0.5 shadow-none' : 'bg-white/95 dark:bg-[#0f172a]/95 border-slate-200 dark:border-slate-800 rounded-xl p-1.5 gap-1 shadow-xs'}`}>
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  editor.isActive('bold') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  editor.isActive('italic') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  editor.isActive('heading', { level: 2 }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  editor.isActive('heading', { level: 3 }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  editor.isActive('bulletList') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  editor.isActive('orderedList') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  editor.isActive('blockquote') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  editor.isActive('codeBlock') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Code Block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const url = window.prompt('Enter URL:');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                title="Insert link"
                className={`p-1.5 rounded hover:bg-gray-100 ${
                  editor.isActive('link') ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                }`}
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
                title="Remove link"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30"
              >
                <X size={16} />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setMediaPickerOpen(true)}
                className="p-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                title="Insert WebP Image from Media Library"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Insert Image</span>
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
              <button
                onClick={() => editor.chain().focus().undo().run()}
                className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Undo"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Redo"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tiptap Canvas */}
          <div
            className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 min-h-[460px] shadow-xs text-slate-900 dark:text-slate-100 focus-within:border-slate-400 dark:focus-within:border-slate-600 transition-colors"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right: Inspector Sidebar */}
        <div className={`border-l flex flex-col shrink-0 overflow-hidden ${isZoho ? 'w-72 sm:w-80 bg-white dark:bg-[#0c1322] border-slate-200 dark:border-slate-800 text-xs' : 'w-80 sm:w-96 bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800'}`}>
          {/* Tabs header - URL bound */}
          <div className={`flex border-b border-slate-200 dark:border-slate-800 p-1 gap-0.5 ${isZoho ? 'bg-slate-100 dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-900/40 p-1.5 gap-1'}`}>
            <button
              onClick={() => handleInspectorTabClick('seo')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeInspectorTab === 'seo'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>SEO</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                seoResult.score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}>
                {seoResult.score}
              </span>
            </button>
            <button
              onClick={() => handleInspectorTabClick('social')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeInspectorTab === 'social'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Share2 className="w-3 h-3" />
              <span>Social</span>
            </button>
            <button
              onClick={() => handleInspectorTabClick('metadata')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeInspectorTab === 'metadata'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TagIcon className="w-3 h-3" />
              <span>Meta</span>
            </button>
            <button
              onClick={() => handleInspectorTabClick('media')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeInspectorTab === 'media'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Cover</span>
            </button>
          </div>

          {/* Inspector Content */}
          <div className={`flex-1 overflow-y-auto ${isZoho ? 'p-2.5 space-y-2.5' : 'p-4 space-y-4'}`}>
            {/* TAB 1: SEO AUDITOR & SCHEMA */}
            {activeInspectorTab === 'seo' && (
              <div className="space-y-4">
                {/* Score Gauge Card */}
                {isZoho ? (
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                        seoResult.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        seoResult.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {seoResult.score}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Content SEO Score</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {seoResult.status === 'good' && 'Ready for Production'}
                          {seoResult.status === 'average' && 'Fair Optimization'}
                          {seoResult.status === 'poor' && 'Needs Optimization'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{seoResult.score}/100 pts</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Automated Content SEO Score
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={
                            seoResult.score >= 80
                              ? 'text-emerald-500'
                              : seoResult.score >= 50
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }
                          strokeDasharray={`${seoResult.score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{seoResult.score}</span>
                        <span className="text-[9px] uppercase font-semibold text-slate-400">pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {seoResult.status === 'good' && 'Ready for Production'}
                    {seoResult.status === 'average' && 'Fair Optimization'}
                    {seoResult.status === 'poor' && 'Needs Optimization'}
                  </div>
                </div>
                )}

                {/* Focus Keyword Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Target Focus Keyword</span>
                    <span className="text-[10px] text-slate-400">Target Keyword</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. cloud erp, school erp"
                    value={activeTrans.seo.focusKeyword}
                    onChange={(e) => updateActiveSeoField('focusKeyword', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Robots Directive Selector (TRD Sec 11) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Robots Directive (Crawler Control)
                  </label>
                  <select
                    value={activeTrans.seo.robots || 'index, follow'}
                    onChange={(e) => updateActiveSeoField('robots', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                  >
                    <option value="index, follow">index, follow (Default - Live Production)</option>
                    <option value="noindex, follow">noindex, follow (Staging / Duplicate)</option>
                    <option value="noindex, nofollow">noindex, nofollow (Private Draft)</option>
                    <option value="index, nofollow">index, nofollow (Do Not Pass Equity)</option>
                  </select>
                </div>

                {/* Meta Keywords Input (TRD Sec 11) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Meta Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="erp, cloud, saas, school, enterprise"
                    value={activeTrans.seo.metaKeywords || ''}
                    onChange={(e) => updateActiveSeoField('metaKeywords', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Canonical URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Canonical URL</label>
                  <input
                    type="text"
                    value={activeTrans.seo.canonicalUrl}
                    onChange={(e) => updateActiveSeoField('canonicalUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* JSON-LD Schema Generator Preview (TRD Sec 11 & 12) */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-slate-500" />
                      JSON-LD Schema Markup
                    </span>
                    <button
                      type="button"
                      onClick={copySchemaJson}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSchema ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSchema ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {jsonLdSchema}
                  </pre>
                </div>

                {/* Automated Checks List */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    SEO Verification Checklist
                  </div>
                  <div className="space-y-1.5">
                    {seoResult.checks.map((check) => (
                      <div
                        key={check.id}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex items-start space-x-2 text-xs"
                      >
                        {check.status === 'pass' && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
                        {check.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />}
                        {check.status === 'fail' && <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{check.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{check.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SOCIAL & OPEN GRAPH SHARING (TRD Sec 7 & 11) */}
            {activeInspectorTab === 'social' && (
              <div className="space-y-5">
                {/* Google SERP Preview */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" /> Google SERP Snippet
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-left space-y-1 font-sans">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                      https://{activeSite.domain} &gt; blog &gt; {activeTrans.slug || 'draft'}
                    </div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {activeTrans.seo.metaTitle || activeTrans.title || 'Untitled Post'} | {activeSite.name}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {activeTrans.seo.metaDescription || activeTrans.excerpt || 'Add a meta description to preview how this article will appear in search results.'}
                    </div>
                  </div>
                </div>

                {/* Facebook / LinkedIn Open Graph Card */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-blue-500" /> Facebook &amp; LinkedIn Card Preview
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                      {featuredImage ? (
                        <img src={featuredImage} alt="OG Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          Featured Image will render here
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">{activeSite.domain}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {activeTrans.seo.ogTitle || activeTrans.title || 'Untitled Post'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {activeTrans.seo.ogDescription || activeTrans.excerpt || 'Blog summary description.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Twitter / X Large Summary Card */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> Twitter / X Card Preview
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f172a]">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                      {featuredImage ? (
                        <img src={featuredImage} alt="Twitter Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          Featured Image
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-[10px] font-mono text-slate-400">{activeSite.domain}</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {activeTrans.seo.twitterTitle || activeTrans.title || 'Untitled Post'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {activeTrans.seo.twitterDescription || activeTrans.excerpt || 'Short summary for Twitter.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OG Overrides */}
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Social (OG) Title Override</label>
                    <input
                      type="text"
                      placeholder={activeTrans.title || 'Leave blank to use article title'}
                      value={activeTrans.seo.ogTitle}
                      onChange={(e) => updateActiveSeoField('ogTitle', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Social (OG) Description Override</label>
                    <textarea
                      rows={2}
                      placeholder={activeTrans.excerpt || 'Leave blank to use excerpt'}
                      value={activeTrans.seo.ogDescription}
                      onChange={(e) => updateActiveSeoField('ogDescription', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: METADATA & TAXONOMY */}
            {activeInspectorTab === 'metadata' && (
              <div className="space-y-4">
                {/* Meta Title with Sync button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">SERP Meta Title</span>
                    <button
                      type="button"
                      onClick={() => updateActiveSeoField('metaTitle', activeTrans.title)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Sync Title
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activeTrans.seo.metaTitle}
                    onChange={(e) => updateActiveSeoField('metaTitle', e.target.value)}
                    placeholder="50-60 chars title"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <div className="text-[10px] text-right text-slate-400 font-mono">
                    {activeTrans.seo.metaTitle.length}/60 chars
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">SERP Meta Description</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeTrans.seo.metaDescription.length}/160 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={activeTrans.seo.metaDescription}
                    onChange={(e) => updateActiveSeoField('metaDescription', e.target.value)}
                    placeholder="140-160 chars description"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Categories */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Categories ({activeSite.name})</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {siteCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, cat.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter((id) => id !== cat.id));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-0 cursor-pointer"
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {siteTags.map((tag) => {
                      const selected = selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setSelectedTags(selectedTags.filter((t) => t !== tag.id));
                            } else {
                              setSelectedTags([...selectedTags, tag.id]);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-medium'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          #{tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule Picker */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Schedule Publishing
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: FEATURED COVER MEDIA */}
            {activeInspectorTab === 'media' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Featured Image</label>
                    {featuredImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeaturedImage('');
                          setFeaturedImageAlt('');
                        }}
                        className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                  {featuredImage ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group aspect-video bg-slate-100 dark:bg-slate-900 shadow-xs">
                      <img
                        src={featuredImage}
                        alt={featuredImageAlt || 'Cover'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                        WebP Cover
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 space-y-1">
                      <div>No featured image assigned.</div>
                      <div className="text-[11px] text-slate-400">Select from library below or enter URL.</div>
                    </div>
                  )}
                </div>

                {/* Quick select from uploaded media */}
                {siteMedia.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select from Uploaded Media</label>
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {siteMedia.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setFeaturedImage(m.cdnUrl);
                            setFeaturedImageAlt(m.altText);
                          }}
                          className={`aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer ${
                            featuredImage === m.cdnUrl
                              ? 'border-slate-900 dark:border-white ring-2 ring-slate-400'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          <img src={m.cdnUrl} alt={m.altText} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CDN Image URL */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Or Paste Image URL</label>
                  <input
                    type="text"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                {/* Alt text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Image Alt Text</span>
                    <span className="text-[10px] text-slate-500 font-mono">SEO Factor</span>
                  </label>
                  <input
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Descriptive text for accessibility & image ranking"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Picker Modal for In-Editor Insertion */}
      {mediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Insert Image from Media Library</h3>
              </div>
              <button
                onClick={() => setMediaPickerOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {siteMedia.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <div>No media assets uploaded for {activeSite.name} yet.</div>
                <Link
                  href={`/media?site=${activeWebsiteId}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-block"
                >
                  Go to Media Library to upload WebP images &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {siteMedia.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleInsertImageIntoEditor(item)}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group cursor-pointer hover:border-slate-400 transition-all bg-slate-50 dark:bg-slate-900"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={item.cdnUrl} alt={item.altText} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">{item.fileName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(item.fileSizeBytes / 1024).toFixed(0)} KB</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMediaPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Consumer Blog Preview Simulator Modal (TRD Section 3, 13 & 21) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          {/* Top Control Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between pb-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[240px] sm:max-w-md">
                  https://{activeSite.domain}/blog/{activeTrans.slug || 'untitled-slug'}
                </span>
              </div>
              <span className="hidden sm:inline-block text-[11px] text-slate-400">
                {status} ({currentLang.toUpperCase()})
              </span>
            </div>

            {/* Viewport Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 p-1 rounded-lg">
              <button
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop View (100%)"
                className={`p-1.5 rounded-md transition-colors ${
                  previewDevice === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet View (768px)"
                className={`p-1.5 rounded-md transition-colors ${
                  previewDevice === 'tablet' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                title="Mobile View (375px)"
                className={`p-1.5 rounded-md transition-colors ${
                  previewDevice === 'mobile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Close Modal */}
            <button
              onClick={() => setPreviewOpen(false)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Device Frame Window */}
          <div className="flex-1 w-full flex justify-center overflow-hidden">
            <div
              className={`h-full bg-white dark:bg-[#0b0f19] rounded-2xl border border-slate-700/60 shadow-2xl overflow-y-auto transition-all duration-200 flex flex-col ${
                previewDevice === 'desktop'
                  ? 'w-full max-w-5xl'
                  : previewDevice === 'tablet'
                  ? 'w-[768px]'
                  : 'w-[375px]'
              }`}
            >
              {/* Simulated Consumer Website Navigation Bar */}
              <div className="sticky top-0 z-20 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeSite.logoUrl ? (
                    <img src={activeSite.logoUrl} alt={activeSite.name} className="w-6 h-6 rounded-md object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs">
                      {activeSite.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold text-xs text-slate-900 dark:text-white tracking-tight">
                    {activeSite.name}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Solutions</span>
                  <span>Platform</span>
                  <span className="text-slate-900 dark:text-white font-semibold">Blog</span>
                  <span>Contact</span>
                </div>
              </div>

              {/* Simulated Article Body */}
              <div className="flex-1 p-6 sm:p-12 space-y-8 max-w-3xl mx-auto w-full">
                {/* Categories & Publish Date */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedCategories.map((catId) => {
                      const cat = siteCategories.find((c) => c.id === catId);
                      return (
                        <span
                          key={catId}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        >
                          {cat?.name || catId}
                        </span>
                      );
                    })}
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {activeTrans.title || 'Untitled Blog Post'}
                  </h1>

                  {activeTrans.excerpt && (
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {activeTrans.excerpt}
                    </p>
                  )}

                  {/* Author Card & Meta */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={existingBlog?.authorAvatar || '/uploads/avatars/avatar-default.webp'}
                        alt="Author"
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {existingBlog?.authorName || 'Staff Writer'}
                        </div>
                        <div className="text-[11px]">
                          {status === 'Published' ? 'Published' : status === 'Scheduled' ? 'Scheduled for' : 'Updated'}{' '}
                          {scheduledAt ? new Date(scheduledAt).toLocaleDateString() : new Date().toLocaleDateString()} · {Math.max(2, Math.round((editor?.getText().split(/\s+/).length || 200) / 180))} min read
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const url = `https://${activeSite?.domain || 'company.com'}/blog/${activeTrans.slug || 'article'}`;
                          navigator.clipboard?.writeText(url);
                          showNotification(`Blog link copied to clipboard: ${url}`, 'success');
                        }}
                        title="Copy Public Blog URL"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hero Featured Image */}
                {featuredImage && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                    <img
                      src={featuredImage}
                      alt={featuredImageAlt || activeTrans.title}
                      className="w-full h-auto object-cover max-h-[440px]"
                    />
                    {featuredImageAlt && (
                      <div className="p-2 text-center text-[11px] text-slate-400 italic bg-slate-50 dark:bg-slate-900">
                        {featuredImageAlt}
                      </div>
                    )}
                  </div>
                )}

                {/* Rendered HTML Content */}
                <div
                  className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeTrans.content }}
                />

                {/* Tag Cloud */}
                {selectedTags.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Related Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTags.map((tagId) => {
                        const tag = siteTags.find((t) => t.id === tagId);
                        return (
                          <span
                            key={tagId}
                            className="px-2.5 py-1 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                          >
                            #{tag?.name || tagId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
