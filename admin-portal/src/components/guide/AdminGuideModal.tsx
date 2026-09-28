'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { HELP_CATEGORIES, HelpCategory, HelpQuestion } from '../../data/helpCenterData';
import { 
  BookOpen, 
  X, 
  Search, 
  Copy, 
  Check, 
  Layers, 
  Globe, 
  FileText, 
  Kanban, 
  Tag, 
  Image as ImageIcon, 
  ArrowRightLeft, 
  BarChart3, 
  Users, 
  Settings, 
  ShieldCheck, 
  Zap, 
  ChevronRight,
  ChevronLeft,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Cpu,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
  Compass,
  Lightbulb,
  ExternalLink
} from 'lucide-react';

type ModalMode = 'options' | 'manual';

export const AdminGuideModal: React.FC = () => {
  const router = useRouter();
  const isGuideOpen = useBlogStore((s) => s.isGuideOpen);
  const setGuideOpen = useBlogStore((s) => s.setGuideOpen);
  const activeRole = useBlogStore((s) => s.activeRole);

  const [mode, setMode] = useState<ModalMode>('options');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(HELP_CATEGORIES[0].id);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedStep, setCopiedStep] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuideOpen(false);
    };
    if (isGuideOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isGuideOpen, setGuideOpen]);

  // Selected Category
  const activeCategory = useMemo(() => {
    return HELP_CATEGORIES.find((c) => c.id === selectedCategoryId) || HELP_CATEGORIES[0];
  }, [selectedCategoryId]);

  // Selected Question
  const activeQuestion = useMemo(() => {
    if (!selectedQuestionId) return null;
    for (const cat of HELP_CATEGORIES) {
      const q = cat.questions.find((item) => item.id === selectedQuestionId);
      if (q) return q;
    }
    return null;
  }, [selectedQuestionId]);

  // Search Results across all categories and tags
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { category: HelpCategory; question: HelpQuestion }[] = [];
    for (const cat of HELP_CATEGORIES) {
      for (const question of cat.questions) {
        const matchesTitle = question.title.toLowerCase().includes(q);
        const matchesTitleHi = question.titleHi.toLowerCase().includes(q);
        const matchesDesc = question.shortDesc.toLowerCase().includes(q);
        const matchesTags = question.tags.some((tag) => tag.toLowerCase().includes(q));
        const matchesSummary = question.summary.toLowerCase().includes(q);
        if (matchesTitle || matchesTitleHi || matchesDesc || matchesTags || matchesSummary) {
          results.push({ category: cat, question });
        }
      }
    }
    return results;
  }, [searchQuery]);

  const handleSelectQuestion = (catId: string, qId: string) => {
    setSelectedCategoryId(catId);
    setSelectedQuestionId(qId);
  };

  const handleBackToCategory = () => {
    setSelectedQuestionId(null);
  };

  const handleActionClick = (href: string) => {
    setGuideOpen(false);
    router.push(href);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'FileText': return FileText;
      case 'Kanban': return Kanban;
      case 'Globe': return Globe;
      case 'Tag': return Tag;
      case 'ArrowRightLeft': return ArrowRightLeft;
      case 'Lock': return Lock;
      case 'AlertCircle': return AlertCircle;
      default: return HelpCircle;
    }
  };

  const copyFullGuide = () => {
    const text = `# Jupsoft Centralized Multi-Site Content Engine — Administrator Manual
Super Admin Operations & Architecture Reference

## 1. Centralized Multi-Tenant Architecture Overview
The Jupsoft Centralized Content Platform consolidates editorial and publishing operations across multiple tenant domains into a single unified control hub.

### Core Architectural Principles:
- **Single Source of Truth**: All articles, media assets, categories, and user credentials reside in a central PostgreSQL database.
- **Connected Tenant Properties**:
  1. \`site-cloud\` -> Jupsoft Cloud & ERP (cloud.jupsoft.com)
  2. \`site-growth\` -> DigifyNext Marketing (digifynext.com)
  3. \`site-jupsoft-test\` -> Jupsoft Staging & Testing (test.jupsoft.com)
- **Instant Edge Invalidation**: Publishing or updating articles triggers HMAC-SHA256 signed webhooks to target consumer frontends, immediately purging edge cache without rebuilding or redeploying sites.

---

## 2. Multi-Tenant Scoping: Network vs. Site Scope
- **Global Network Scope (\`?site=all\`)**: Provides an aggregated view of total articles across all client domains, cross-site publishing velocity, pending reviews, and unified telemetry.
- **Tenant Scope (\`?site=site-cloud\`)**: Filters the entire workspace context—including Articles, Taxonomy, Media Library, and 301 Permanent Redirects—strictly to the selected brand domain.

---

## 3. End-to-End Content Publishing Lifecycle
1. **Scope Selection**: Writer selects target domain from the scope selector.
2. **Article Drafting**: Content is authored in the editor canvas with featured media and excerpts.
3. **SEO Optimization**: Focus keyword is assigned, and the 8-point automated audit scores the article.
4. **Multi-Language Translations**: Content is translated and reviewed across supported locale tabs.
5. **Editorial Review**: Writer submits draft; article transitions to "Under Review".
6. **Editorial Approval**: Editor reviews content on Kanban board and approves for release.
7. **Publication & Cache Purge**: Publisher triggers release; backend updates database, clears Redis cache, and fires HMAC webhook.
8. **Instant Edge Availability**: Consumer frontend updates within sub-300ms.
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAnswerSteps = (q: HelpQuestion) => {
    const lines = [
      `[Topic] ${q.title} (${q.titleHi})`,
      `Summary: ${q.summary}`,
      '',
      'Steps to follow:',
      ...q.steps.map((s) => `${s.step}. ${s.instruction}${s.detail ? ` (${s.detail})` : ''}`),
      q.proTip ? `\n[Pro-Tip] ${q.proTip}` : '',
    ].join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedStep(true);
    setTimeout(() => setCopiedStep(false), 2000);
  };

  if (!isGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-6xl h-[92vh] max-h-[850px] bg-white dark:bg-[#0c1220] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & NAVIGATION BAR                                            */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/90 dark:bg-[#0f172a]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Jupsoft Help Center &amp; Support
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 shrink-0">
                  Option-Wise Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Select an option below to get instant step-by-step guidance without AI confusion
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs + Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-200/80 dark:bg-slate-800/90 p-0.5 rounded-xl flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setMode('options')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'options'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Option-Wise Help</span>
                <span className="sm:hidden">Help</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">System Manual</span>
                <span className="sm:hidden">Docs</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MODE: OPTION-WISE INTERACTIVE HELP CENTER                              */}
        {/* ========================================================================= */}
        {mode === 'options' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Left Sidebar: Categories Navigation Rail */}
            <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0a0f1d] flex flex-col shrink-0">
              {/* Search Box */}
              <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search help topics (e.g. Super Admin, 403)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedQuestionId) setSelectedQuestionId(null);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Keyword Filter Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {['Super Admin', 'Invite', '403 Error', 'Publish', 'Featured Image', '301 Redirect'].map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => setSearchQuery(kw)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 font-medium transition-colors cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select a Help Category:
                </div>
                {HELP_CATEGORIES.map((cat) => {
                  const Icon = getCategoryIcon(cat.iconName);
                  const isSelected = selectedCategoryId === cat.id && !searchQuery;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setSelectedQuestionId(null);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 shadow-2xs'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${
                          isSelected ? 'text-red-700 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {cat.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {cat.titleHi}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 shrink-0">
                        {cat.questions.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* User Role Badge in Footer */}
              <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Logged in as:</span>
                <span className="font-bold text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-[11px] border border-red-200/60 dark:border-red-900/40">
                  {activeRole || 'Team Member'}
                </span>
              </div>
            </div>

            {/* Right Main Content Area */}
            <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-[#0c1220] p-4 sm:p-6">
              {/* Search Results Mode */}
              {searchQuery ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Search className="w-4 h-4 text-red-500" />
                        <span>Search Results for &ldquo;{searchQuery}&rdquo;</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Found {searchResults.length} matching questions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Clear search
                    </button>
                  </div>

                  {searchResults.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No matching options found
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        Try searching for a simpler keyword like &ldquo;Super Admin&rdquo;, &ldquo;Publish&rdquo;, &ldquo;Image&rdquo;, or &ldquo;403&rdquo;.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map(({ category, question }) => (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => {
                            handleSelectQuestion(category.id, question.id);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all flex items-start justify-between gap-3 group cursor-pointer shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {category.title}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                              {question.title}
                            </div>
                            <div className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mt-0.5">
                              {question.titleHi}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {question.shortDesc}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeQuestion ? (
                /* Detail Resolution View for Selected Question */
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-150">
                  {/* Back button */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <button
                      type="button"
                      onClick={handleBackToCategory}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to {activeCategory.title} Questions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyAnswerSteps(activeQuestion)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      title="Copy step-by-step instructions"
                    >
                      {copiedStep ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedStep ? 'Copied' : 'Copy Steps'}</span>
                    </button>
                  </div>

                  {/* Header Question Title */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                      {activeCategory.title}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {activeQuestion.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">
                      {activeQuestion.titleHi}
                    </p>
                  </div>

                  {/* Direct Answer Summary Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Direct Answer / Saransh</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {activeQuestion.summary}
                    </p>
                    {activeQuestion.summaryHi && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic border-t border-slate-200/60 dark:border-slate-800 pt-2">
                        {activeQuestion.summaryHi}
                      </p>
                    )}
                  </div>

                  {/* Numbered Steps Walkthrough */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Step-by-Step Instructions:
                    </h4>
                    <div className="space-y-2.5">
                      {activeQuestion.steps.map((st) => (
                        <div
                          key={st.step}
                          className="p-3.5 rounded-xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 shadow-2xs"
                        >
                          <div className="w-6 h-6 rounded-lg bg-red-600 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {st.step}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {st.instruction}
                            </div>
                            {st.detail && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {st.detail}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro-Tip Box */}
                  {activeQuestion.proTip && (
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Important Tip: </span>
                        <span>{activeQuestion.proTip}</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Button */}
                  {activeQuestion.actionLink && (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleActionClick(activeQuestion.actionLink!.href)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>{activeQuestion.actionLink.label}</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleBackToCategory}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Ask Another Question
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Category Questions Option Picker */
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Category Options
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                      {activeCategory.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeCategory.description}
                    </p>
                  </div>

                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Click any option below to view step-by-step instructions:
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {activeCategory.questions.map((q, idx) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSelectQuestion(activeCategory.id, q.id)}
                        className="w-full text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800/80 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                              {q.title}
                            </div>
                            <div className="text-xs text-red-600/80 dark:text-red-400/80 font-medium mt-0.5">
                              {q.titleHi}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {q.shortDesc}
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 shrink-0 transition-transform group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. MODE: FULL ARCHITECTURE & SYSTEM MANUAL                                */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 bg-white dark:bg-[#0c1220]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Technical Architecture &amp; Operations Manual
                </h3>
                <p className="text-xs text-slate-400">
                  Full reference documentation for DevOps, Super Admins, and system architects.
                </p>
              </div>
              <button
                type="button"
                onClick={copyFullGuide}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Manual' : 'Copy Manual (Markdown)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Layers className="w-4 h-4 text-red-500" />
                  <span>Centralized PostgreSQL Architecture</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All articles, revisions, taxonomy records, and user role assignments reside in a central PostgreSQL database. Tenant websites query this central data store via secure REST endpoints and authenticated tokens.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Sub-300ms On-Demand Cache Invalidation</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When articles are published or edited, the backend sends HMAC-SHA256 signed webhooks directly to target consumer domains, triggering on-demand edge cache purging instantly without rebuilding code.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>Connected Multi-Tenant Properties</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <div className="font-bold text-slate-900 dark:text-white">site-cloud</div>
                  <div className="text-[11px] text-slate-400 font-mono">cloud.jupsoft.com</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <div className="font-bold text-slate-900 dark:text-white">site-growth</div>
                  <div className="text-[11px] text-slate-400 font-mono">digifynext.com</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
                  <div className="font-bold text-slate-900 dark:text-white">site-jupsoft-test</div>
                  <div className="text-[11px] text-slate-400 font-mono">test.jupsoft.com</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. FOOTER STATUS BAR                                                      */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0f172a] flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Jupsoft Multi-Tenant Content Hub v2.4</span>
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen(false)}
            className="px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
