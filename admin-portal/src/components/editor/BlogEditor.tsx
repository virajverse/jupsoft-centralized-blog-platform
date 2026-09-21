'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { analyzeSEO } from '../../utils/seoAuditor';
import { 
  ArrowLeft, 
  Save, 
  Search, 
  Image as ImageIcon, 
  AlertTriangle, 
  Check, 
  X, 
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  RemoveFormatting,
  FileCode,
  Link2,
  Unlink,
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
  Eye,
  ExternalLink,
  Clock,
  Globe, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  SlidersHorizontal,
  UploadCloud,
  FileText,
  Sparkles,
  Languages,
  UserCheck
} from 'lucide-react';
import { LanguageCode, BlogStatus, Blog, BlogTranslation, BlogSEO, MediaItem } from '../../types';
import { createEmptySEO } from '../../data/initialData';
import { canPublish, canApprove } from '../../utils/permissions';
import { apiClient } from '../../services/apiClient';
import { resolveMediaUrl, extractS3Key } from '../../utils/mediaUtils';

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
    addMediaItem,
    fetchMedia,
    saveBlog, 
    showNotification,
    activeRole,
    addRedirect,
    currentUser,
    users,
    fetchUsers,
  } = useBlogStore();

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
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'editor' | 'cover'>('editor');
  const [mediaModalTab, setMediaModalTab] = useState<'upload' | 'library' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaSearchQuery, setMediaSearchQuery] = useState('');
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customImageAlt, setCustomImageAlt] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Premium Link Manager State
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);
  const [linkNoFollow, setLinkNoFollow] = useState(false);

  const filteredSiteMedia = useMemo(() => {
    if (!mediaSearchQuery.trim()) return siteMedia;
    const q = mediaSearchQuery.toLowerCase();
    return siteMedia.filter(
      (m) => m.fileName.toLowerCase().includes(q) || m.altText?.toLowerCase().includes(q)
    );
  }, [siteMedia, mediaSearchQuery]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLanguageTabClick = (lang: LanguageCode) => {
    if (lang === currentLang) return;
    if (editor) {
      const currentHtml = editor.getHTML();
      setTranslations((prev) => {
        const next = {
          ...prev,
          [currentLang]: {
            ...prev[currentLang],
            content: currentHtml,
          },
        };
        const nextContent = next[lang]?.content || '<p></p>';
        editor.commands.setContent(nextContent);
        return next;
      });
    }
    setParam('lang', lang === 'en' ? null : lang);
  };

  const handleInspectorTabClick = (tab: 'seo' | 'social' | 'metadata' | 'media') => {
    setParam('tab', tab === 'seo' ? null : tab);
    setInspectorOpen(true);
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

  // Author & Byline state
  const cleanCurrentName = (currentUser?.name || 'Aarav Sharma').replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim();
  const [authorMode, setAuthorMode] = useState<'user' | 'custom'>(() => {
    if (existingBlog?.authorId === 'usr-custom') return 'custom';
    return 'user';
  });
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(
    existingBlog?.authorId || currentUser?.id || 'usr-superadmin'
  );
  const [authorName, setAuthorName] = useState<string>(
    existingBlog?.authorName?.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim() || cleanCurrentName
  );
  const [authorAvatar, setAuthorAvatar] = useState<string>(
    existingBlog?.authorAvatar || currentUser?.avatar || '/uploads/avatars/avatar-default.webp'
  );

  useEffect(() => {
    if (fetchUsers) fetchUsers();
  }, [fetchUsers]);

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

  // Tiptap Editor instance with rich extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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
          class: 'text-blue-600 underline hover:text-blue-800 transition-colors cursor-pointer',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: activeTrans.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[420px]',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setTranslations((prev) => ({
        ...prev,
        [currentLang]: {
          ...prev[currentLang],
          content: html,
        },
      }));
      setHasUnsavedChanges(true);
    },
  });

  // Open Premium Link Modal with active selection / URL
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    setLinkUrl(previousUrl);
    setLinkText(selectedText);
    setLinkOpenNewTab(editor.getAttributes('link').target === '_blank');
    setLinkNoFollow(editor.getAttributes('link').rel?.includes('nofollow') || false);
    setLinkModalOpen(true);
  };

  // Save / Apply Link from modal
  const handleSaveLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setLinkModalOpen(false);
      return;
    }

    let href = linkUrl.trim();
    if (
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('tel:') &&
      !href.startsWith('/')
    ) {
      href = `https://${href}`;
    }

    const { from, to } = editor.state.selection;
    const currentSelectedText = editor.state.doc.textBetween(from, to, ' ');

    if (linkText && linkText !== currentSelectedText) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: linkText,
          marks: [
            {
              type: 'link',
              attrs: {
                href,
                target: linkOpenNewTab ? '_blank' : null,
                rel: linkNoFollow ? 'nofollow noopener noreferrer' : 'noopener noreferrer',
              },
            },
          ],
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href,
          target: linkOpenNewTab ? '_blank' : null,
          rel: linkNoFollow ? 'nofollow noopener noreferrer' : 'noopener noreferrer',
        })
        .run();
    }
    setLinkModalOpen(false);
    showNotification('Link applied successfully! 🔗', 'success');
  };

  // Remove Link handler
  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkModalOpen(false);
    showNotification('Link removed.', 'info');
  };

  // Keyboard shortcut (Ctrl+K / Cmd+K) listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (editor && editor.isFocused) {
          e.preventDefault();
          handleOpenLinkModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Load full blog detail from backend API once on initial mount (never during typing)
  const [isLoadingFullBlog, setIsLoadingFullBlog] = useState(false);
  const loadedBlogIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!targetBlogId) return;
    if (loadedBlogIdRef.current === targetBlogId) return; // Only fetch once!
    let active = true;
    setIsLoadingFullBlog(true);
    apiClient.getBlogById(targetBlogId)
      .then((fullBlog: any) => {
        if (!active || !fullBlog) return;
        loadedBlogIdRef.current = targetBlogId;
        if (fullBlog.translations) {
          setTranslations((prev) => {
            const next = { ...prev };
            (['en', 'hi', 'fr', 'ar'] as LanguageCode[]).forEach((l) => {
              if (fullBlog.translations[l]) {
                next[l] = {
                  ...defaultTrans(l),
                  ...fullBlog.translations[l],
                  content: fullBlog.translations[l].content || '<p></p>',
                  seo: fullBlog.translations[l].seo || createEmptySEO(),
                };
              }
            });
            return next;
          });

          // Sync into editor once on initial load
          const curContent = fullBlog.translations[currentLang]?.content;
          if (editor && curContent) {
            editor.commands.setContent(curContent);
          }
        }
        if (fullBlog.status) setStatus(fullBlog.status as BlogStatus);
        if (fullBlog.featuredImage) setFeaturedImage(fullBlog.featuredImage);
        if (fullBlog.featuredImageAlt) setFeaturedImageAlt(fullBlog.featuredImageAlt);
        if (Array.isArray(fullBlog.categoryIds)) setSelectedCategories(fullBlog.categoryIds);
        if (Array.isArray(fullBlog.tagIds)) setSelectedTags(fullBlog.tagIds);
        if (fullBlog.scheduledAt) setScheduledAt(fullBlog.scheduledAt);
        if (fullBlog.websiteId) setSelectedWebsiteId(fullBlog.websiteId);
        if (fullBlog.authorId) {
          setSelectedAuthorId(fullBlog.authorId);
          if (fullBlog.authorId === 'usr-custom') setAuthorMode('custom');
        }
        if (fullBlog.authorName) {
          setAuthorName(fullBlog.authorName.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim());
        }
        if (fullBlog.authorAvatar) {
          setAuthorAvatar(fullBlog.authorAvatar);
        }
      })
      .catch((err) => {
        console.warn('API getBlogById fetch failed, using local store data:', err);
      })
      .finally(() => {
        if (active) setIsLoadingFullBlog(false);
      });

    return () => {
      active = false;
    };
  }, [targetBlogId]); // NEVER depend on editor here!

  // Sync editor content ONCE when editor mounts if initial content exists
  const initialContentSyncedRef = useRef(false);
  useEffect(() => {
    if (editor && !initialContentSyncedRef.current) {
      initialContentSyncedRef.current = true;
      const initialHtml = translations[currentLang]?.content;
      if (initialHtml && initialHtml !== '<p>Start drafting your high-impact article here...</p>') {
        editor.commands.setContent(initialHtml);
      }
    }
  }, [editor]);

  // Sync editor content ONLY when language tab changes via URL
  const prevLangRef = useRef<LanguageCode>(currentLang);
  useEffect(() => {
    if (prevLangRef.current !== currentLang) {
      prevLangRef.current = currentLang;
      if (editor) {
        const langContent = translations[currentLang]?.content || '<p></p>';
        editor.commands.setContent(langContent);
      }
    }
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  // Real Auto-Save: Debounced 2.5 seconds after editing stops
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;
    const effectiveTitle = activeTrans?.title?.trim() || translations.en?.title?.trim();
    if (!effectiveTitle) return; // Don't auto-save without an article title

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const targetSiteId = selectedWebsiteId || (activeWebsiteId !== 'all' ? activeWebsiteId : 'site-cloud');
        const id = existingBlog?.id || targetBlogId || `blog-${Date.now()}`;
        const currentEditorHtml = editor ? editor.getHTML() : undefined;
        const cleanedTranslations = { ...translations };
        if (currentEditorHtml !== undefined && cleanedTranslations[currentLang]) {
          cleanedTranslations[currentLang] = {
            ...cleanedTranslations[currentLang],
            content: currentEditorHtml,
          };
        }

        const autoSavedBlog: Blog = {
          id,
          websiteId: targetSiteId,
          authorId: authorMode === 'user' ? selectedAuthorId : 'usr-custom',
          authorName: authorName.trim() || cleanCurrentName,
          authorAvatar: authorAvatar || '/uploads/avatars/avatar-default.webp',
          featuredImage,
          featuredImageAlt,
          status,
          publishDate: existingBlog?.publishDate,
          scheduledAt: scheduledAt || undefined,
          publishedBy: existingBlog?.publishedBy,
          viewCount: existingBlog?.viewCount || 0,
          readTimeMinutes: Math.max(1, Math.round((editor?.getText().split(/\s+/).length || 100) / 180)),
          categoryIds: selectedCategories,
          tagIds: selectedTags,
          translations: cleanedTranslations,
          workflowLogs: existingBlog?.workflowLogs || [],
          createdAt: existingBlog?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveBlog(autoSavedBlog);
        setHasUnsavedChanges(false);
        const now = new Date();
        setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Auto-save error:', err);
      } finally {
        setIsSaving(false);
      }
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    hasUnsavedChanges,
    isSaving,
    activeTrans?.title,
    translations,
    selectedWebsiteId,
    activeWebsiteId,
    existingBlog,
    targetBlogId,
    editor,
    currentLang,
    authorMode,
    selectedAuthorId,
    authorName,
    cleanCurrentName,
    authorAvatar,
    featuredImage,
    featuredImageAlt,
    status,
    scheduledAt,
    selectedCategories,
    selectedTags,
    saveBlog,
  ]);

  const [isTranslating, setIsTranslating] = useState(false);

  const handleAiTranslate = async () => {
    const enSource = translations['en'];
    if (!enSource?.title && !enSource?.content) {
      showNotification('Please enter an English title or content first to translate from.', 'warning');
      return;
    }
    setIsTranslating(true);
    try {
      const sourceContent = currentLang === 'en' ? (editor?.getHTML() || enSource.content) : enSource.content;
      const res = await apiClient.translateText({
        from: 'en',
        to: currentLang,
        title: enSource.title,
        excerpt: enSource.excerpt,
        content: sourceContent,
      });

      const translatedTitle = res.title || enSource.title;
      const translatedExcerpt = res.excerpt || enSource.excerpt;
      const translatedContent = res.content || sourceContent;
      const newSlug = slugify(translatedTitle) || `post-${Date.now()}`;

      setTranslations((prev) => ({
        ...prev,
        [currentLang]: {
          ...prev[currentLang],
          title: translatedTitle,
          slug: newSlug,
          excerpt: translatedExcerpt,
          content: translatedContent,
          seo: {
            ...prev[currentLang].seo,
            metaTitle: translatedTitle,
            metaDescription: translatedExcerpt,
            canonicalUrl: `https://${activeSite.domain}/blog/${newSlug}`,
          },
        },
      }));

      if (editor && translatedContent) {
        editor.commands.setContent(translatedContent);
      }
      showNotification(`AI Translation complete for ${currentLang.toUpperCase()}! ✨`, 'success');
    } catch (err: any) {
      console.error('AI translation failed:', err);
      showNotification(err?.message || 'AI translation service unavailable', 'warning');
    } finally {
      setIsTranslating(false);
    }
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

  // Live Document Word Count, Character Count & Reading Time
  const docStats = useMemo(() => {
    const text = (activeTrans.content || '').replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  }, [activeTrans.content]);

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
          name: authorName || 'Staff Writer',
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
  }, [activeTrans, featuredImage, existingBlog, activeSite, authorName]);

  const copySchemaJson = () => {
    navigator.clipboard.writeText(jsonLdSchema);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  // Unified handler to apply selected image (cover or editor body)
  const handleApplySelectedMedia = (item: { cdnUrl: string; altText?: string }) => {
    const finalUrl = resolveMediaUrl(item.cdnUrl);
    const alt = item.altText || activeTrans.title || 'Blog image';

    if (mediaPickerTarget === 'cover') {
      setFeaturedImage(item.cdnUrl);
      setFeaturedImageAlt(alt);
      showNotification('Featured cover image set! 🖼️', 'success');
    } else {
      if (editor) {
        editor.chain().focus().setImage({ src: finalUrl, alt, title: alt }).run();
        showNotification('WebP image inserted into article canvas! 🖼️', 'success');
      }
    }
    setMediaPickerOpen(false);
  };

  // Upload image file with automated WebP conversion
  const handleUploadWebpImage = async (file: File) => {
    if (!file) return;
    setUploadingImage(true);
    const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
    const uploadSiteId = selectedWebsiteId || activeWebsiteId || 'site-cloud';
    const uploadSite = websites.find((w) => w.id === uploadSiteId) || websites[0];

    try {
      // Step 1: Attempt server-side WebP pipeline via backend
      const res = await apiClient.uploadMedia(file, uploadSiteId, cleanName);
      if (res && res.cdnUrl) {
        const newItem: MediaItem = {
          id: res.id || `med-${Date.now()}`,
          websiteId: uploadSiteId,
          fileName: res.fileName || cleanName,
          fileType: 'image/webp',
          fileSizeBytes: res.fileSizeBytes || file.size,
          s3Key: extractS3Key(res.s3Key || res.cdnUrl),
          cdnUrl: resolveMediaUrl(res.cdnUrl),
          altText: cleanName.replace(/[-_]/g, ' ').replace('.webp', ''),
          dimensions: res.dimensions || { width: 1200, height: 800 },
          uploadedBy: currentUser?.name || activeRole,
          createdAt: new Date().toISOString(),
        };
        addMediaItem(newItem);
        handleApplySelectedMedia(newItem);
        setUploadingImage(false);
        return;
      }
    } catch (err) {
      console.warn('Server media upload failed, converting to WebP on client canvas:', err);
    }

    // Step 2: Fallback to client-side HTML5 canvas WebP conversion
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.88);
          const head = 'data:image/webp;base64,';
          const sizeInBytes = Math.round((webpDataUrl.length - head.length) * 3 / 4);

          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');

          const newItem: MediaItem = {
            id: `med-${Date.now()}`,
            websiteId: uploadSiteId,
            fileName: cleanName,
            fileType: 'image/webp',
            fileSizeBytes: sizeInBytes,
            s3Key: `blogs/${uploadSite?.s3Prefix || 'general'}/${yyyy}/${mm}/${cleanName}`,
            cdnUrl: webpDataUrl,
            altText: cleanName.replace(/[-_]/g, ' ').replace('.webp', ''),
            dimensions: { width: img.width, height: img.height },
            uploadedBy: currentUser?.name || activeRole,
            createdAt: new Date().toISOString(),
          };

          addMediaItem(newItem);
          handleApplySelectedMedia(newItem);
        }
        setUploadingImage(false);
      };
      img.onerror = () => {
        setUploadingImage(false);
        showNotification('Failed to process and convert image.', 'warning');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customImageUrl.trim()) {
      showNotification('Please enter a valid image URL', 'warning');
      return;
    }
    handleApplySelectedMedia({
      cdnUrl: customImageUrl.trim(),
      altText: customImageAlt.trim() || activeTrans.title || 'Blog image',
    });
    setCustomImageUrl('');
    setCustomImageAlt('');
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

    // Ensure active editor HTML is synced into the active language translation
    const currentEditorHtml = editor ? editor.getHTML() : undefined;
    const cleanedTranslations = { ...translations };
    if (currentEditorHtml !== undefined && cleanedTranslations[currentLang]) {
      cleanedTranslations[currentLang] = {
        ...cleanedTranslations[currentLang],
        content: currentEditorHtml,
      };
    }

    // Ensure all authored translations have a valid slug
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
      authorId: authorMode === 'user' ? selectedAuthorId : 'usr-custom',
      authorName: authorName.trim() || cleanCurrentName,
      authorAvatar: authorAvatar || '/uploads/avatars/avatar-default.webp',
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
      setHasUnsavedChanges(false);
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
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#070b14] relative overflow-hidden">
      {/* Studio Header Bar (48px) */}
      <header className="h-12 bg-white dark:bg-[#0c1322] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between shrink-0 gap-2 z-30">
        {/* Left: Back to blogs & website scope */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <Link
            href={`/blogs?site=${selectedWebsiteId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Exit editor and return to blogs list"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div
            className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
            title="Target Publication Website"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedWebsiteId}
              onChange={(e) => setSelectedWebsiteId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
            >
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Language Switcher Tabs & Autosave status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
            {(['en', 'hi', 'fr', 'ar'] as LanguageCode[]).map((lang) => {
              const hasTitle = Boolean(translations[lang]?.title);
              const isActive = currentLang === lang;
              return (
                <button
                  key={lang}
                  onClick={() => handleLanguageTabClick(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
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
              type="button"
              onClick={handleAiTranslate}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              title={`Translate English title and content to ${currentLang.toUpperCase()} with AI`}
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isTranslating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isTranslating ? 'Translating...' : `Translate from EN`}</span>
            </button>
          )}

          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 font-mono pl-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSaving
                  ? 'bg-amber-400 animate-pulse'
                  : hasUnsavedChanges
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
            {isSaving
              ? 'Saving...'
              : hasUnsavedChanges
              ? 'Unsaved changes'
              : lastSavedTime
              ? `Saved ${lastSavedTime}`
              : 'Saved'}
          </span>
        </div>

        {/* Right: Schedule, Status, Preview, Inspector toggle, Save/Publish */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {status === 'Scheduled' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-800 dark:text-purple-300">
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
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer shrink-0"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Live Consumer Preview"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
              inspectorOpen
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            title="Toggle Settings & SEO Auditor Drawer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings &amp; SEO</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              seoResult.score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {seoResult.score}
            </span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving...' : status === 'Published' ? 'Publish Article' : 'Save Draft'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Modern Elevated Document Studio Canvas */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-100/75 dark:bg-[#070b14] py-6 sm:py-10 px-3 sm:px-8 flex justify-center items-start focus:outline-none" tabIndex={-1}>
          {/* Elevated Document Sheet (Paper Canvas) */}
          <div className="w-full max-w-6xl xl:max-w-7xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm min-h-[88vh] flex flex-col transition-all mb-12">
            
            {/* Docked Editor Toolbar at Top of Document Sheet */}
            {editor && (
              <div className="sticky top-0 z-30 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs rounded-t-2xl">
                {/* Left: Complete Professional Toolbar Controls */}
                <div className="flex flex-wrap items-center gap-1">
                  {/* Style / Heading Group */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setParagraph().run()}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        !editor.isActive('heading') ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Paragraph"
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        editor.isActive('heading', { level: 1 }) ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Heading 1"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        editor.isActive('heading', { level: 2 }) ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        editor.isActive('heading', { level: 3 }) ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="Heading 3"
                    >
                      H3
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

                  {/* Inline Text Marks Group */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      className={`p-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        editor.isActive('bold') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('italic') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('underline') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Underline (Ctrl+U)"
                    >
                      <UnderlineIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('strike') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Strikethrough"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('highlight') ? 'bg-amber-300 text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Highlight Marker"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleCode().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('code') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Inline Code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

                  {/* Text Alignment Group */}
                  <div className="hidden sm:flex items-center gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setTextAlign('left').run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive({ textAlign: 'left' }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setTextAlign('center').run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive({ textAlign: 'center' }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setTextAlign('right').run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive({ textAlign: 'right' }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Justify"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

                  {/* Lists & Blocks Group */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleBulletList().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('bulletList') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleOrderedList().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('orderedList') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleBlockquote().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('blockquote') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Blockquote"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                      className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        editor.isActive('codeBlock') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Preformatted Code Block"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().setHorizontalRule().run()}
                      className="p-1.5 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Horizontal Divider"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  {/* Premium Link & Image Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleOpenLinkModal}
                      title={editor.isActive('link') ? 'Edit Link (Ctrl+K)' : 'Insert Link (Ctrl+K)'}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        editor.isActive('link')
                          ? 'bg-blue-600 text-white shadow-blue-500/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{editor.isActive('link') ? 'Edit Link' : 'Link'}</span>
                    </button>

                    {editor.isActive('link') && (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleRemoveLink}
                        title="Unlink"
                        className="p-1.5 rounded-md text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerTarget('editor');
                        setMediaModalTab(siteMedia.length > 0 ? 'library' : 'upload');
                        setMediaPickerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Insert WebP Image (Upload or Media Library)"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Image</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-blue-200/60 dark:bg-blue-800/60 font-mono">WebP</span>
                    </button>
                  </div>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

                  {/* Clear Format & History */}
                  <div className="hidden md:flex items-center gap-0.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                      className="p-1.5 rounded-md text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Clear Formatting"
                    >
                      <RemoveFormatting className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().undo().run()}
                      className="p-1.5 rounded-md text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => editor.chain().focus().redo().run()}
                      className="p-1.5 rounded-md text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Right: Real-time Word & Reading Time Counter */}
                <div className="hidden lg:flex items-center gap-2.5 text-xs text-slate-400 font-medium select-none shrink-0">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {docStats.readTime} min read
                  </span>
                  <span>·</span>
                  <span>{docStats.words} words</span>
                </div>
              </div>
            )}

            {/* Document Sheet Body */}
            <div className="p-6 sm:p-12 space-y-6 flex-1 flex flex-col">
              {/* Published Slug 301 Warning Notice (TRD Section 7) */}
              {status === 'Published' && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-center space-x-3 text-xs text-amber-800 dark:text-amber-300 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>SEO Continuity:</strong> Blog is published. Modifying the slug will automatically establish a 301 Permanent Redirect.
                  </span>
                </div>
              )}

              {/* Featured Cover Photo */}
              {featuredImage ? (
                <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-21/9 max-h-[380px] shadow-xs">
                  <img
                    src={resolveMediaUrl(featuredImage)}
                    alt={featuredImageAlt || 'Cover'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/70 p-1.5 rounded-xl backdrop-blur-xs shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerTarget('cover');
                        setMediaModalTab(siteMedia.length > 0 ? 'library' : 'upload');
                        setMediaPickerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Change Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedImage('');
                        setFeaturedImageAlt('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setMediaPickerTarget('cover');
                      setMediaModalTab(siteMedia.length > 0 ? 'library' : 'upload');
                      setMediaPickerOpen(true);
                    }}
                    className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-400 bg-white dark:bg-slate-850 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <ImageIcon className="w-3 h-3" />
                    </div>
                    <span>Add Cover Photo</span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal hidden sm:inline">• 1200×630 WebP (SEO &amp; Discover)</span>
                  </button>

                  <div className="text-[11px] text-slate-400 select-none font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-500 dark:text-slate-400">{activeSite.name}</span>
                  </div>
                </div>
              )}

              {/* Title & Live Metadata Byline */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={
                    currentLang === 'hi' ? 'यहाँ लेख का मुख्य शीर्षक लिखें...' :
                    currentLang === 'fr' ? 'Titre principal de l\'article...' :
                    currentLang === 'ar' ? 'عنوان المقال الرئيسي...' :
                    'Enter article title...'
                  }
                  value={activeTrans.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="w-full bg-transparent text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none border-none leading-[1.18] font-sans py-1"
                />

                {/* Editorial Byline Strip: Permalink + Category + Tags */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-slate-500 dark:text-slate-400 py-2.5 px-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
                  {/* Permalink section */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                    <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-slate-400 font-mono text-[11px] select-none">/blog/</span>
                    <input
                      type="text"
                      value={activeTrans.slug}
                      onChange={(e) => updateActiveTransField('slug', slugify(e.target.value))}
                      placeholder="article-slug"
                      className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-transparent focus:outline-none max-w-[140px] sm:max-w-[180px]"
                      title="Custom URL Slug"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://${activeSite.domain}/blog/${activeTrans.slug}`);
                        showNotification('Live permalink copied to clipboard! 📋', 'success');
                      }}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer ml-0.5"
                      title="Copy full article URL"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700 select-none">•</span>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <TagIcon className="w-3 h-3 text-slate-400 shrink-0" />
                    {selectedCategories.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleInspectorTabClick('metadata');
                          setInspectorOpen(true);
                        }}
                        className="text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        + Category
                      </button>
                    ) : (
                      selectedCategories.map((catId) => {
                        const cat = siteCategories.find((c) => c.id === catId);
                        if (!cat) return null;
                        return (
                          <span
                            key={cat.id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200/80 dark:border-blue-900/60 shadow-2xs"
                          >
                            <span>{cat.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedCategories(selectedCategories.filter((id) => id !== cat.id))}
                              className="text-blue-400 hover:text-rose-500 cursor-pointer ml-0.5"
                              title="Remove category"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })
                    )}
                    {selectedCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInspectorTabClick('metadata');
                          setInspectorOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        title="Add more categories"
                      >
                        +
                      </button>
                    )}
                  </div>

                  <span className="hidden sm:inline text-slate-300 dark:text-slate-700 select-none">•</span>

                  {/* Tag Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedTags.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleInspectorTabClick('metadata');
                          setInspectorOpen(true);
                        }}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer hover:underline px-1"
                      >
                        + Add tags
                      </button>
                    ) : (
                      selectedTags.map((tagId) => {
                        const tag = siteTags.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                          >
                            <span>#{tag.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTags(selectedTags.filter((id) => id !== tag.id))}
                              className="text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
                              title="Remove tag"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })
                    )}
                    {selectedTags.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleInspectorTabClick('metadata');
                          setInspectorOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        title="Manage tags"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lead Summary / Abstract (Article Subtitle & SERP Deck) */}
              <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 focus-within:border-blue-500 transition-colors">
                <textarea
                  placeholder="Write a brief lead abstract or subtitle for search previews and social shares..."
                  value={activeTrans.excerpt}
                  onChange={(e) => updateActiveTransField('excerpt', e.target.value)}
                  rows={2}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="w-full bg-transparent text-sm sm:text-base text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none leading-relaxed resize-none italic transition-colors border-none p-0"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="font-mono text-[10px] text-slate-400">Article Subtitle &amp; SERP Search Snippet</span>
                  <span className={`font-mono text-[10px] ${activeTrans.excerpt.length > 160 ? 'text-amber-500 font-semibold' : 'text-slate-400'}`}>
                    {activeTrans.excerpt.length}/160 chars {activeTrans.excerpt.length > 160 ? '(Optimal: ≤160)' : ''}
                  </span>
                </div>
              </div>

              {/* Tiptap Rich-Text Writing Canvas */}
              <div dir={isRTL ? 'rtl' : 'ltr'} className="flex-1 min-h-[450px] text-slate-900 dark:text-slate-100 pt-2">
                <EditorContent
                  editor={editor}
                  className="tiptap prose prose-slate dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed focus:outline-none min-h-[420px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:border-none [&_.ProseMirror-focused]:outline-none [&_*]:outline-none"
                />
              </div>
            </div>

            {/* Document Bottom Status & Health Bar */}
            <div className="px-6 sm:px-12 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#0b1120] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 rounded-b-2xl">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {docStats.readTime} min read
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {docStats.words} words ({docStats.chars} characters)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleInspectorTabClick('seo');
                    setInspectorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 shadow-2xs"
                  title="Open SEO & Settings Audit"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>SEO Score:</span>
                  <span className={seoResult.score >= 80 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                    {seoResult.score}/100
                  </span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right: Slide-Over Inspector Drawer */}
        <aside
          className={`fixed top-12 bottom-0 right-0 w-96 bg-white dark:bg-[#0c1322] border-l border-slate-200 dark:border-slate-800 z-40 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out text-xs ${
            inspectorOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
        >
          {/* Drawer Top Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#0a0f1d]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-xs text-slate-900 dark:text-white">Settings &amp; SEO Auditor</span>
            </div>
            <button
              type="button"
              onClick={() => setInspectorOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Tabs header - URL bound */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 p-1 gap-1 bg-slate-50 dark:bg-[#0a0f1d]">
            <button
              onClick={() => handleInspectorTabClick('seo')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeInspectorTab === 'seo'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
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
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700'
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
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700'
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
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Cover</span>
            </button>
          </div>

          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            {/* TAB 1: SEO AUDITOR & SCHEMA */}
            {activeInspectorTab === 'seo' && (
              <div className="space-y-3.5">
                {/* Score Gauge Card */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">SEO Health Score</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      seoResult.score >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                      seoResult.score >= 50 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}>
                      {seoResult.score}/100 · {seoResult.status === 'good' ? 'Optimized' : seoResult.status === 'average' ? 'Moderate' : 'Needs Work'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${seoResult.score}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        seoResult.score >= 80 ? 'bg-emerald-500' :
                        seoResult.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Focus Keyword Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Target Focus Keyword
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. cloud erp, school erp"
                    value={activeTrans.seo.focusKeyword}
                    onChange={(e) => updateActiveSeoField('focusKeyword', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Robots Directive Selector (TRD Sec 11) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Robots Directive (Crawler Control)
                  </label>
                  <select
                    value={activeTrans.seo.robots || 'index, follow'}
                    onChange={(e) => updateActiveSeoField('robots', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="index, follow">index, follow (Default - Live Production)</option>
                    <option value="noindex, follow">noindex, follow (Staging / Duplicate)</option>
                    <option value="noindex, nofollow">noindex, nofollow (Private Draft)</option>
                    <option value="index, nofollow">index, nofollow (Do Not Pass Equity)</option>
                  </select>
                </div>

                {/* Meta Keywords Input (TRD Sec 11) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Meta Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="erp, cloud, saas, school, enterprise"
                    value={activeTrans.seo.metaKeywords || ''}
                    onChange={(e) => updateActiveSeoField('metaKeywords', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Canonical URL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Canonical URL
                  </label>
                  <input
                    type="text"
                    value={activeTrans.seo.canonicalUrl}
                    onChange={(e) => updateActiveSeoField('canonicalUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* JSON-LD Schema Collapsible Accordion (TRD Sec 11 & 12) */}
                <details className="group border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <summary className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 select-none">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Structured Data (JSON-LD)</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={copySchemaJson}
                        className="text-[10px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {copiedSchema ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSchema ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-2 rounded bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                      {jsonLdSchema}
                    </pre>
                  </div>
                </details>

                {/* Automated Checks List */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    SEO Verification ({seoResult.checks.filter(c => c.status === 'pass').length}/{seoResult.checks.length} Passed)
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#0c1322]">
                    {seoResult.checks.map((check) => (
                      <div
                        key={check.id}
                        className="p-2 flex items-start gap-2 text-xs"
                      >
                        {check.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                        {check.status === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                        {check.status === 'fail' && <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{check.label}</div>
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
              <div className="space-y-4">
                {/* Google SERP Preview */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-slate-400" /> Google Search Preview
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-left space-y-1 font-sans">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                      https://{activeSite.domain} › blog › {activeTrans.slug || 'draft'}
                    </div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {activeTrans.seo.metaTitle || activeTrans.title || 'Untitled Post'} | {activeSite.name}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {activeTrans.seo.metaDescription || activeTrans.excerpt || 'Add a meta description to preview how this article will appear in search results.'}
                    </div>
                  </div>
                </div>

                {/* Facebook / LinkedIn Open Graph Card */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Share2 className="w-3 h-3 text-blue-500" /> Social Card (OG Preview)
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                      {featuredImage ? (
                        <img src={resolveMediaUrl(featuredImage)} alt="OG Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">
                          Featured Image will render here
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div className="text-[9px] uppercase font-mono text-slate-400 dark:text-slate-500">{activeSite.domain}</div>
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Share2 className="w-3 h-3 text-slate-600 dark:text-slate-400" /> Twitter / X Card
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#0c1322]">
                    <div className="aspect-video bg-slate-200 dark:bg-slate-800 relative">
                      {featuredImage ? (
                        <img src={resolveMediaUrl(featuredImage)} alt="Twitter Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">
                          Featured Image
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div className="text-[9px] font-mono text-slate-400">{activeSite.domain}</div>
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
                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Social (OG) Title Override
                    </label>
                    <input
                      type="text"
                      placeholder={activeTrans.title || 'Leave blank to use article title'}
                      value={activeTrans.seo.ogTitle}
                      onChange={(e) => updateActiveSeoField('ogTitle', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Social (OG) Description Override
                    </label>
                    <textarea
                      rows={2}
                      placeholder={activeTrans.excerpt || 'Leave blank to use excerpt'}
                      value={activeTrans.seo.ogDescription}
                      onChange={(e) => updateActiveSeoField('ogDescription', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: METADATA & TAXONOMY */}
            {activeInspectorTab === 'metadata' && (
              <div className="space-y-3.5">
                {/* Meta Title with Sync button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      SERP Meta Title
                    </label>
                    <button
                      type="button"
                      onClick={() => updateActiveSeoField('metaTitle', activeTrans.title)}
                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Sync Title
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activeTrans.seo.metaTitle}
                    onChange={(e) => updateActiveSeoField('metaTitle', e.target.value)}
                    placeholder="50-60 chars title"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                  />
                  <div className="text-[10px] text-right text-slate-400 font-mono">
                    {activeTrans.seo.metaTitle.length}/60 chars
                  </div>
                </div>

                {/* Meta Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      SERP Meta Description
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {activeTrans.seo.metaDescription.length}/160 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={activeTrans.seo.metaDescription}
                    onChange={(e) => updateActiveSeoField('metaDescription', e.target.value)}
                    placeholder="140-160 chars description"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                  />
                </div>

                {/* Author & Byline Governance */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-blue-500" /> Author / Byline
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorMode('user');
                          const matchedUser = users.find((u) => u.id === selectedAuthorId) || currentUser;
                          if (matchedUser) {
                            setAuthorName(matchedUser.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim());
                            setAuthorAvatar(matchedUser.avatar || '/uploads/avatars/avatar-default.webp');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                          authorMode === 'user'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Team
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthorMode('custom')}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer transition-colors ${
                          authorMode === 'custom'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {authorMode === 'user' ? (
                    <div className="space-y-1">
                      <select
                        value={selectedAuthorId}
                        onChange={(e) => {
                          const uId = e.target.value;
                          setSelectedAuthorId(uId);
                          const found = users.find((u) => u.id === uId) || (currentUser?.id === uId ? currentUser : null);
                          if (found) {
                            setAuthorName(found.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim());
                            if (found.avatar) setAuthorAvatar(found.avatar);
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 cursor-pointer"
                      >
                        {currentUser && (
                          <option value={currentUser.id}>
                            {currentUser.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim()} (You)
                          </option>
                        )}
                        {users
                          .filter((u) => u.id !== currentUser?.id)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name.replace(/\s*\([^)]*Admin[^)]*\)/gi, '').trim()} ({u.role})
                            </option>
                          ))}
                      </select>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Public byline: <strong className="text-slate-700 dark:text-slate-300">{authorName}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. DigifyNext Team, Editorial Desk, Guest Author"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Enter any custom team desk or guest writer byline.
                      </p>
                    </div>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Categories ({activeSite.name})
                  </label>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {siteCategories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer py-0.5"
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
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1">
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
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
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
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" /> Schedule Publishing
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: FEATURED COVER MEDIA */}
            {activeInspectorTab === 'media' && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Featured Cover Image
                    </label>
                    {featuredImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setFeaturedImage('');
                          setFeaturedImageAlt('');
                        }}
                        className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {featuredImage ? (
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative group aspect-video bg-slate-100 dark:bg-slate-900 shadow-2xs">
                      <img
                        src={resolveMediaUrl(featuredImage)}
                        alt={featuredImageAlt || 'Cover'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white font-mono">
                        Cover
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center text-xs text-slate-400 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                      <div>No featured image assigned.</div>
                      <div className="text-[11px] text-slate-400">Select from library below or enter URL.</div>
                    </div>
                  )}
                </div>

                {/* Quick select from uploaded media */}
                {siteMedia.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Select from Uploaded Media
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {siteMedia.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setFeaturedImage(m.cdnUrl);
                            setFeaturedImageAlt(m.altText);
                          }}
                          className={`aspect-video rounded-md overflow-hidden border transition-all cursor-pointer ${
                            featuredImage === m.cdnUrl
                              ? 'border-slate-900 dark:border-white ring-2 ring-slate-400'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          <img src={resolveMediaUrl(m.cdnUrl)} alt={m.altText} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CDN Image URL */}
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Or Paste Image URL
                  </label>
                  <input
                    type="text"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>

                {/* Alt text */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Image Alt Text
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">SEO Factor</span>
                  </div>
                  <input
                    type="text"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Descriptive text for accessibility & SEO"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            )}

          </div>
        </aside>
      </div>

      {/* Media Picker & Auto-WebP Upload Modal */}
      {mediaPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {mediaPickerTarget === 'cover' ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {mediaPickerTarget === 'cover' ? 'Set Featured Cover Image' : 'Insert Article Image'}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                      Auto-WebP
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target site: <span className="font-medium text-slate-600 dark:text-slate-300">{activeSite.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMediaPickerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]">
              <button
                type="button"
                onClick={() => setMediaModalTab('upload')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  mediaModalTab === 'upload'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload & Convert (WebP)</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaModalTab('library')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  mediaModalTab === 'library'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Media Library</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {siteMedia.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMediaModalTab('url')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  mediaModalTab === 'url'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>External URL</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* TAB 1: UPLOAD & AUTO-CONVERT */}
              {mediaModalTab === 'upload' && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadWebpImage(file);
                    }}
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingMedia(true);
                    }}
                    onDragLeave={() => setIsDraggingMedia(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingMedia(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleUploadWebpImage(file);
                    }}
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                      isDraggingMedia
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 bg-slate-50/60 dark:bg-slate-900/40'
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="py-4 flex flex-col items-center space-y-3">
                        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          Optimizing & Converting to WebP...
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Applying 88% lossless compression, generating CDN key, and updating library
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-blue-100/70 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Click to browse or drag and drop image here
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            PNG, JPG, JPEG, GIF, SVG or WebP (up to 10MB)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Automated WebP Conversion Included
                        </span>
                      </>
                    )}
                  </div>

                  {/* Informational Callout */}
                  <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span>⚡ Why WebP?</span>
                    </div>
                    <p>
                      WebP delivers 30%–80% smaller file sizes than PNG/JPEG with superior visual fidelity, ensuring 100/100 Google Lighthouse Core Web Vitals and rapid LCP load times.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDIA LIBRARY */}
              {mediaModalTab === 'library' && (
                <div className="space-y-4">
                  {/* Search bar within library */}
                  {siteMedia.length > 0 && (
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={mediaSearchQuery}
                        onChange={(e) => setMediaSearchQuery(e.target.value)}
                        placeholder="Search assets by file name or alt text..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {siteMedia.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div>No media assets uploaded for {activeSite.name} yet.</div>
                      <button
                        type="button"
                        onClick={() => setMediaModalTab('upload')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Upload & Convert First Image
                      </button>
                    </div>
                  ) : filteredSiteMedia.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No media items match "{mediaSearchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                      {filteredSiteMedia.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleApplySelectedMedia(item)}
                          className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden group cursor-pointer hover:border-blue-500 hover:shadow-md transition-all bg-slate-50 dark:bg-slate-900 flex flex-col"
                        >
                          <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                            <img
                              src={resolveMediaUrl(item.cdnUrl)}
                              alt={item.altText || item.fileName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-black/60 text-white backdrop-blur-xs font-mono">
                              {item.fileType?.replace('image/', '') || 'webp'}
                            </span>
                            <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-2.5 py-1 rounded-lg bg-white text-slate-900 text-[11px] font-bold shadow-sm">
                                Use Image
                              </span>
                            </div>
                          </div>
                          <div className="p-2 flex-1 flex flex-col justify-between">
                            <div className="text-[11px] font-semibold text-slate-900 dark:text-white truncate" title={item.fileName}>
                              {item.fileName}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                              <span>{(item.fileSizeBytes / 1024).toFixed(0)} KB</span>
                              {item.dimensions && (
                                <span>{item.dimensions.width}×{item.dimensions.height}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DIRECT EXTERNAL URL */}
              {mediaModalTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Direct Image / WebP CDN URL
                    </label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or https://cdn.jupsoft.com/..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Alt Text (Accessibility & Image SEO)
                    </label>
                    <input
                      type="text"
                      value={customImageAlt}
                      onChange={(e) => setCustomImageAlt(e.target.value)}
                      placeholder="Concise description of the image"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {customImageUrl.trim() && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="text-[11px] font-semibold text-slate-500 mb-2">Image Preview:</div>
                      <div className="aspect-video max-h-48 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={resolveMediaUrl(customImageUrl)}
                          alt={customImageAlt || 'Preview'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      disabled={!customImageUrl.trim()}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {mediaPickerTarget === 'cover' ? 'Set as Cover Image' : 'Insert into Article'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
              <Link
                href={`/media?site=${activeWebsiteId}`}
                target="_blank"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Open Media Manager</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setMediaPickerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Consumer Blog Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          {/* Top Control Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white">
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

            {/* Close Modal */}
            <button
              onClick={() => setPreviewOpen(false)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clean Article Preview Container */}
          <div className="flex-1 w-full max-w-4xl flex justify-center overflow-hidden">
            <div className="w-full h-full bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-700/60 shadow-2xl overflow-y-auto p-6 sm:p-10 space-y-6">
              {/* Categories & Title */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCategories.map((catId) => {
                    const cat = siteCategories.find((c) => c.id === catId);
                    return (
                      <span
                        key={catId}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
                      src={authorAvatar || '/uploads/avatars/avatar-default.webp'}
                      alt="Author"
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {authorName || 'Staff Writer'}
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
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                  <img
                    src={resolveMediaUrl(featuredImage)}
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
      )}

      {/* Premium Interactive Link Editor Modal */}
      {linkModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setLinkModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editor?.isActive('link') ? 'Edit Hyperlink' : 'Insert Hyperlink'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure target URL, display text, and SEO flags</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Destination URL */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/guide"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveLink();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setLinkModalOpen(false);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                  {linkUrl && (
                    <a
                      href={linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Test URL in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Anchor Text */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Anchor Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Read the complete documentation"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveLink();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setLinkModalOpen(false);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Attributes Checklist */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkOpenNewTab}
                    onChange={(e) => setLinkOpenNewTab(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Open in new tab (<code className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">target="_blank"</code>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkNoFollow}
                    onChange={(e) => setLinkNoFollow(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">SEO: Add NoFollow (<code className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">rel="nofollow"</code>)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                {editor?.isActive('link') ? (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Remove Link
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Ctrl+K shortcut</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                >
                  {editor?.isActive('link') ? 'Update Link' : 'Insert Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
