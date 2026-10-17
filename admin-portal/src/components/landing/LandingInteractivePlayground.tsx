'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Languages, 
  Terminal, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Globe, 
  ShieldCheck,
  Zap,
  Sliders
} from 'lucide-react';

export const LandingInteractivePlayground: React.FC = () => {
  // State for Demo 1: SEO Gauge
  const [metaTitle, setMetaTitle] = useState('Enterprise Multi-Tenant Headless CMS Platform');
  const [focusKeyword, setFocusKeyword] = useState('Multi-Tenant');
  const [hasAltText, setHasAltText] = useState(true);

  // SEO Calculation logic
  const titleLength = metaTitle.length;
  const titleLengthOk = titleLength >= 40 && titleLength <= 65;
  const keywordInTitle = focusKeyword.length > 0 && metaTitle.toLowerCase().includes(focusKeyword.toLowerCase());
  
  let score = 40;
  if (titleLengthOk) score += 25;
  if (keywordInTitle) score += 20;
  if (hasAltText) score += 15;

  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500';
  const strokeColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  // State for Demo 2: Multi-Language Engine
  const [activeLang, setActiveLang] = useState<'en' | 'hi' | 'fr' | 'ar'>('en');

  const translations = {
    en: {
      dir: 'ltr',
      title: 'Decoupled Next.js 16 & NestJS 11 Architecture',
      slug: 'decoupled-nextjs16-nestjs11-architecture',
      excerpt: 'Centralized headless content management hub powering multiple tenant domains with sub-300ms read latency.',
      langName: 'English',
    },
    hi: {
      dir: 'ltr',
      title: 'डिकपल्ड नेक्स्ट.जेएस 16 एवं नेस्ट.जेएस 11 आर्किटेक्चर',
      slug: 'decoupled-nextjs16-nestjs11-architecture-hi',
      excerpt: 'केंद्रीयकृत हेडलेस कंटेंट मैनेजमेंट प्लेटफॉर्म जो कई टेनेंट वेबसाइटों को 300ms से कम में लोड करता है।',
      langName: 'Hindi (हिंदी)',
    },
    fr: {
      dir: 'ltr',
      title: 'Architecture Découplée Next.js 16 & NestJS 11',
      slug: 'architecture-decouplee-nextjs16-nestjs11',
      excerpt: 'Plateforme de gestion de contenu headless centralisée alimentant plusieurs domaines consommateurs.',
      langName: 'French (Français)',
    },
    ar: {
      dir: 'rtl',
      title: 'بنية منتقلة Next.js 16 و NestJS 11 المتقدمة',
      slug: 'decoupled-architecture-ar',
      excerpt: 'منصة إدارة المحتوى المركزية بدون رأس التي تدعم نطاقات العملاء المتعددة في أقل من 300 مللي ثانية.',
      langName: 'Arabic (العربية RTL)',
    },
  };

  // State for Demo 3: Webhook Terminal Simulator
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'System ready. Click "Publish Post" to trigger HMAC-SHA256 Webhook ISR Revalidation.',
  ]);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishPost = () => {
    setIsPublishing(true);
    setTerminalLogs(['[INIT] Publishing blog post "enterprise-cloud-2026"...']);

    setTimeout(() => {
      setTerminalLogs((prev) => [
        ...prev,
        '[DATABASE] Prisma status updated: Published at ' + new Date().toISOString(),
      ]);
    }, 400);

    setTimeout(() => {
      const signature = 'sha256=' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setTerminalLogs((prev) => [
        ...prev,
        `[WEBHOOK] Fired payload to https://jupsoft.com/api/revalidate`,
        `[HEADER] x-signature: ${signature}`,
        `[RESPONSE] 200 OK — Consumer site cache revalidated in 12ms.`,
      ]);
      setIsPublishing(false);
    }, 900);
  };

  return (
    <section id="interactive-demo" className="py-20 md:py-28 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080c14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-mono font-semibold mb-3 border border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Coded Playground</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Test Real-Time Platform Features
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Try the live SEO audit gauge, test instant multi-language translation, and simulate HMAC-signed webhook revalidations.
          </p>
        </div>

        {/* Playground Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Widget 1: SEO Audit Gauge */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Automated SEO Gauge
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Live Engine
                </span>
              </div>

              {/* Gauge Score Meter */}
              <div className="flex items-center justify-center my-6">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-slate-200 dark:text-slate-800"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke={strokeColor}
                      strokeWidth="10"
                      strokeDasharray={364}
                      strokeDashoffset={364 - (364 * score) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-3xl font-extrabold font-mono ${scoreColor}`}>
                      {score}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                      out of 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Controls */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs text-slate-500 font-mono flex justify-between mb-1">
                    <span>Meta Title Length ({titleLength} chars)</span>
                    <span className={titleLengthOk ? 'text-emerald-500' : 'text-rose-500'}>
                      {titleLengthOk ? 'Optimal (40-65)' : 'Too short/long'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-mono flex justify-between mb-1">
                    <span>Focus Keyword</span>
                    <span className={keywordInTitle ? 'text-emerald-500' : 'text-rose-500'}>
                      {keywordInTitle ? 'Found in title' : 'Missing in title'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-sans text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 font-mono">Cover Image Alt Text</span>
                  <button
                    onClick={() => setHasAltText(!hasAltText)}
                    className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                      hasAltText
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {hasAltText ? 'Included (+15)' : 'Missing (+0)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist items */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Meta Title Character Range</span>
                {titleLengthOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Focus Keyword Density Check</span>
                {keywordInTitle ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>
          </div>

          {/* Widget 2: Multi-Language Switcher */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Multi-Language Translation
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  i18n Engine
                </span>
              </div>

              {/* Language Selection Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                {(['en', 'hi', 'fr', 'ar'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      activeLang === lang
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {translations[lang].langName}
                  </button>
                ))}
              </div>

              {/* Translation Output Preview */}
              <div
                dir={translations[activeLang].dir}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Title</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {translations[activeLang].title}
                  </h4>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Slug</span>
                  <code className="text-xs font-mono text-purple-500">
                    /{translations[activeLang].slug}
                  </code>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Excerpt</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {translations[activeLang].excerpt}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>RTL Layout Support</span>
              <span className="text-emerald-500 font-semibold">Active</span>
            </div>
          </div>

          {/* Widget 3: Webhook ISR Simulator */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Webhook ISR Simulator
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  HMAC Signed
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Click publish to simulate instant on-demand cache revalidation across external consumer Next.js frontends.
              </p>

              {/* Publish Trigger Button */}
              <button
                onClick={handlePublishPost}
                disabled={isPublishing}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer mb-4"
              >
                {isPublishing ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing HMAC Signature...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Publish & Fire Webhook</span>
                  </>
                )}
              </button>

              {/* Terminal Logs Window */}
              <div className="p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 font-mono text-[11px] space-y-1.5 h-44 overflow-y-auto custom-scrollbar">
                {terminalLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes('200 OK')
                        ? 'text-emerald-400 font-bold'
                        : log.includes('x-signature')
                        ? 'text-indigo-400'
                        : log.includes('DATABASE')
                        ? 'text-purple-400'
                        : 'text-slate-300'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Security Standard</span>
              <span className="text-indigo-400 font-semibold">HMAC-SHA256</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
