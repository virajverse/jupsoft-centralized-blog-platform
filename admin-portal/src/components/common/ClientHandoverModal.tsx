'use client';

import React, { useState } from 'react';
import { Website } from '../../types';
import {
  Terminal,
  Globe,
  Copy,
  Check,
  X,
  MessageSquare,
  Sparkles,
  Code2,
  CheckCircle2,
  Key,
  Send,
  Layers
} from 'lucide-react';

interface ClientHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: Website;
  apiBaseUrl?: string;
}

export const ClientHandoverModal: React.FC<ClientHandoverModalProps> = ({
  isOpen,
  onClose,
  site,
  apiBaseUrl = (typeof window !== 'undefined' ? (window.location.origin.includes('localhost') ? window.location.origin.replace(':3000', ':4000') : window.location.origin) : (process.env.NEXT_PUBLIC_API_URL || 'https://blogary.jupsoft.com'))
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'widget' | 'whatsapp'>('cli');
  const [htmlMode, setHtmlMode] = useState<'turnkey' | 'custom'>('turnkey');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !site) return null;

  const resolvedApiUrl = apiBaseUrl.replace(/\/$/, '');

  // 1. Next.js 1-Command CLI
  const cliCommand = `npx github:virajverse/jupsoft-next-blog --site=${site.id} --key=${site.apiKey} --url=${resolvedApiUrl}`;

  // 2A. HTML 2-Line All-in-One Embed Widget (Zero Code: Feed + In-Place Reader)
  const htmlWidget = `<!-- Jupsoft Blog Feed & Reader for ${site.name} -->\n<div id="jupsoft-blog-feed" data-site="${site.id}" data-api="${resolvedApiUrl}" data-lang="auto"></div>\n<script src="${resolvedApiUrl}/widget/blog.js" async></script>`;

  // 2B. Custom HTML Blog Detail Reader (For existing templates like blogdetail.html)
  const customDetailScript = `<!-- Dynamic CMS Blog Detail Reader for ${site.name} -->\n<script>\n(function () {\n  const params = new URLSearchParams(window.location.search);\n  const slug = params.get('slug');\n  if (!slug) return;\n\n  fetch('${resolvedApiUrl}/v1/blogs/' + encodeURIComponent(slug) + '?websiteId=${site.id}')\n    .then(r => r.json())\n    .then(result => {\n      const blog = result.data || result;\n      if (!blog || !blog.title) return;\n\n      document.title = blog.title;\n      const t = document.getElementById('postTitle'); if (t) t.innerText = blog.title;\n      const a = document.getElementById('postAuthor'); if (a) a.innerText = blog.authorName || 'Editorial Team';\n      const d = document.getElementById('postDate'); if (d) d.innerText = new Date(blog.publishedAt).toLocaleDateString();\n      const img = document.getElementById('postFeaturedImage'); if (img && blog.featuredImage) img.src = blog.featuredImage;\n      const body = document.getElementById('postContent'); if (body && blog.content) body.innerHTML = blog.content;\n    })\n    .catch(err => console.error('CMS Reader Error:', err));\n})();\n</script>`;

  const htmlWidgetWithDetail = `<!-- Blog Feed linked to your custom blogdetail.html -->\n<div id="jupsoft-blog-feed" data-site="${site.id}" data-api="${resolvedApiUrl}" data-detail-url="blogdetail.html?slug={slug}"></div>\n<script src="${resolvedApiUrl}/widget/blog.js" async></script>`;

  // 3. Ready Handover Message for Client (WhatsApp / Slack / Email)
  const clientMessage = `🚀 Connect Jupsoft Centralized Blog to ${site.name}\n\nWebsite Name: ${site.name}\nWebsite ID: ${site.id}\nAPI Key: ${site.apiKey}\nAPI Endpoint: ${resolvedApiUrl}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOPTION 1: Next.js / React (1-Step Automatic Setup)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRun this single command inside your project root:\n${cliCommand}\n\nWhat this does automatically:\n✔ Configures .env.local with credentials\n✔ Installs @jupsoft/next-blog engine\n✔ Generates /blog listing with EN/HI/FR/AR language switcher\n✔ Generates /[slug] reader with SEO metadata & social sharing\n✔ Generates /api/revalidate webhook for instant cache refresh\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOPTION 2A: Plain HTML / WordPress (2-Line Turnkey Embed)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPaste these 2 lines where you want the all-in-one blog feed & reader to appear:\n${htmlWidget}\n\nZero build step or npm required!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nOPTION 2B: Custom HTML Blog Detail Reader (Existing Template)\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nIf your website has its own custom blogdetail.html page, paste this connector at the bottom of blogdetail.html:\n${customDetailScript}\n\nAnd link your feed with data-detail-url:\n${htmlWidgetWithDetail}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Connect Website &amp; Client Handover
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  Turnkey SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Copy 1-command installer or ready-to-send client handover message for <strong>{site.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Tenant Info Bar */}
        <div className="px-5 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold text-slate-900 dark:text-white">{site.name}</span>
            <span className="text-slate-400">({site.domain})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
              Site ID: {site.id}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-4 pb-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
          <button
            onClick={() => setActiveTab('cli')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cli'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>1. Next.js CLI (1-Command)</span>
          </button>

          <button
            onClick={() => setActiveTab('widget')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'widget'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. HTML / WordPress (2-Line Embed)</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500 active:text-white" />
            <span>3. Ready Client Message</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* TAB 1: NEXT.JS CLI */}
          {activeTab === 'cli' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-indigo-600" />
                    Run in Project Terminal (Next.js 14 / 15 / 16)
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Client runs this single command. It creates .env.local, routes, language switcher and auto-revalidation.
                  </p>
                </div>

                <button
                  onClick={() => copyText(cliCommand, 'tab-cli')}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {copiedId === 'tab-cli' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'tab-cli' ? 'Copied Command!' : 'Copy CLI Command'}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-indigo-900/40 shadow-inner select-all">
                {cliCommand}
              </pre>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-slate-200 block">1. Auto-Scaffold</strong>
                  <span className="text-slate-500">Creates <code>app/blog</code> &amp; <code>[slug]</code></span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-slate-200 block">2. Auto-Locale</strong>
                  <span className="text-slate-500">EN, HI, FR, AR switcher included</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-slate-200 block">3. Cache Webhook</strong>
                  <span className="text-slate-500">Instant on-demand ISR revalidation</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HTML EMBED WIDGET & CUSTOM BLOGDETAIL */}
          {activeTab === 'widget' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Sub-mode switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHtmlMode('turnkey')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    htmlMode === 'turnkey'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ⚡ Option A: 2-Line Turnkey Widget (Zero Code)
                </button>
                <button
                  type="button"
                  onClick={() => setHtmlMode('custom')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    htmlMode === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🎨 Option B: Custom Detail Reader (blogdetail.html)
                </button>
              </div>

              {/* MODE A: 2-LINE WIDGET */}
              {htmlMode === 'turnkey' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-600" />
                        Paste into HTML, PHP, WordPress, Laravel or Shopify
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Zero build step, zero npm. Auto-loads responsive card grid, language selector and in-place reader.
                      </p>
                    </div>

                    <button
                      onClick={() => copyText(htmlWidget, 'tab-widget')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      {copiedId === 'tab-widget' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'tab-widget' ? 'Copied HTML!' : 'Copy 2-Line Script'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-emerald-900/40 shadow-inner select-all">
                    {htmlWidget}
                  </pre>

                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>All-in-One Solution:</strong> Cards and full in-place article reader work out of the box in this single container.
                    </div>
                  </div>
                </div>
              )}

              {/* MODE B: CUSTOM BLOGDETAIL.HTML READER */}
              {htmlMode === 'custom' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-indigo-600" />
                        Connector for Existing Custom Templates (blogdetail.html)
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                        Paste this script at the bottom of your custom <code>blogdetail.html</code> page. It binds to <code>#postTitle</code>, <code>#postContent</code>, etc.
                      </p>
                    </div>

                    <button
                      onClick={() => copyText(customDetailScript, 'tab-detail-script')}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      {copiedId === 'tab-detail-script' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'tab-detail-script' ? 'Copied Reader Script!' : 'Copy Reader Script'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-950 text-indigo-300 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-indigo-900/40 shadow-inner select-all max-h-48">
                    {customDetailScript}
                  </pre>

                  <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold">
                      <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>How to link the feed to your custom blogdetail page:</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Add <code className="text-indigo-600 dark:text-indigo-300">data-detail-url="blogdetail.html?slug=&#123;slug&#125;"</code> to your feed widget so card clicks redirect to your bespoke template:
                    </p>
                    <pre className="p-2 bg-slate-950 text-indigo-300 rounded-lg font-mono text-[10px] overflow-x-auto select-all">
                      {htmlWidgetWithDetail}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: READY CLIENT MESSAGE */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Ready-to-Send Client Message (WhatsApp / Slack / Email)
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Copy this pre-formatted message and send it directly to your client or developer.
                  </p>
                </div>

                <button
                  onClick={() => copyText(clientMessage, 'tab-whatsapp')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {copiedId === 'tab-whatsapp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'tab-whatsapp' ? 'Message Copied!' : 'Copy Handover Message'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={12}
                value={clientMessage}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 rounded-xl font-mono text-xs border border-slate-200 dark:border-slate-800 leading-relaxed resize-none focus:outline-none select-all"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span>API Key: </span>
            <code className="font-mono text-slate-700 dark:text-slate-300">{site.apiKey ? site.apiKey.slice(0, 14) + '...' : 'Protected'}</code>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
