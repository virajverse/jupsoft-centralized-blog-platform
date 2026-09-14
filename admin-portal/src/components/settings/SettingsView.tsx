'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { Website, LanguageCode } from '../../types';
import { 
  Globe, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap,
  Plus,
  ShieldCheck,
  Activity,
  Server,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
  Search,
  Filter
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    websites, 
    activeWebsiteId, 
    updateWebsite, 
    addWebsite,
    blogs,
    auditLogs,
    showNotification 
  } = useBlogStore();

  const isAllSites = activeWebsiteId === 'all';

  // URL state
  const tenantParam = searchParams.get('tenant');
  const tabParam = (searchParams.get('tab') as 'all' | 'general' | 'webhook' | 'audit') || 'all';

  const defaultSiteId = isAllSites ? (tenantParam || websites[0]?.id) : activeWebsiteId;
  const [targetSiteId, setTargetSiteId] = useState<string>(defaultSiteId);
  const [activeTab, setActiveTab] = useState<'all' | 'general' | 'webhook' | 'audit'>(tabParam);

  // Onboard modal state
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLang, setNewLang] = useState<LanguageCode>('en');

  // Copy & Webhook tester states
  const [copiedKey, setCopiedKey] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookLog, setWebhookLog] = useState<{
    status: number;
    response: string;
    timestamp: string;
  } | null>(null);

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState('');

  useEffect(() => {
    if (tenantParam && websites.some((w) => w.id === tenantParam)) {
      setTargetSiteId(tenantParam);
    }
  }, [tenantParam, websites]);

  useEffect(() => {
    if (['all', 'general', 'webhook', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectTenant = (id: string) => {
    setTargetSiteId(id);
    setParam('tenant', id);
  };

  const handleTabChange = (tab: 'all' | 'general' | 'webhook' | 'audit') => {
    setActiveTab(tab);
    setParam('tab', tab === 'all' ? null : tab);
  };

  const activeSite = websites.find((w) => w.id === targetSiteId) || websites[0];

  const copyApiKey = () => {
    if (!activeSite) return;
    navigator.clipboard.writeText(activeSite.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Auto-fill slug from name in onboarding modal
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newSlug || newSlug === val.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, -1)) {
      setNewSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  const handleCreateWebsite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim()) {
      showNotification('Please provide both a website name and domain.', 'warning');
      return;
    }

    const cleanSlug = (newSlug.trim() || newName.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^-+|-+$/g, '');
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
    const randomHex = Math.random().toString(36).substring(2, 10);
    const newSiteId = `site-${cleanSlug}`;

    const newWebsite: Website = {
      id: newSiteId,
      name: newName.trim(),
      domain: cleanDomain,
      logoUrl: newLogoUrl.trim() || `https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=120&q=80`,
      description: newDescription.trim() || `${newName.trim()} content network.`,
      apiKey: `jup_live_sec_${cleanSlug}_${randomHex}`,
      s3Prefix: `blogs/${cleanSlug}/`,
      status: 'active',
      defaultLanguage: newLang,
      supportedLanguages: ['en', 'hi', 'fr', 'ar'],
      revalidateWebhookUrl: `https://${cleanDomain}/api/revalidate`,
      createdAt: new Date().toISOString(),
    };

    addWebsite(newWebsite);
    setTargetSiteId(newWebsite.id);
    setIsOnboardOpen(false);
    setNewName('');
    setNewDomain('');
    setNewSlug('');
    setNewLogoUrl('');
    setNewDescription('');
    showNotification(`Tenant "${newWebsite.name}" registered and ready for Next.js consumers!`, 'success');
  };

  // Simulate Webhook dispatch with HMAC signature (TRD Section 13)
  const testWebhookRevalidation = () => {
    if (!activeSite) return;
    setTestingWebhook(true);
    setTimeout(() => {
      setTestingWebhook(false);
      setWebhookLog({
        status: 200,
        response: `{"revalidated": true, "tag": "blog:preview-${activeSite.s3Prefix.replace(/[/]/g, '')}", "now": ${Math.floor(Date.now() / 1000)}}`,
        timestamp: new Date().toLocaleTimeString(),
      });
      showNotification('Webhook test dispatched & revalidated successfully!', 'success');
    }, 800);
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      log.event.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.websiteId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tenant &amp; System Settings
            </h1>
            {activeSite && (
              <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                {activeSite.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage multi-tenant website domains, independent AWS S3 prefixes, ISR webhook purges, and security audit trails.
          </p>
        </div>

        <button
          onClick={() => setIsOnboardOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Onboard New Website</span>
        </button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            Configured Sites
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {websites.length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Active Tenants
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {websites.filter((w) => w.status === 'active').length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            Total Articles
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {blogs.length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-500" />
            Audit Logs
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {auditLogs.length}
          </div>
        </div>
      </div>

      {/* Tenant Scope Selector (in All mode) */}
      {isAllSites && (
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">Configuring Tenant:</span>
          {websites.map((w) => (
            <button
              key={w.id}
              onClick={() => handleSelectTenant(w.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                targetSiteId === w.id
                  ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0f172a] p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto max-w-full">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All Tenants Overview
        </button>
        <button
          onClick={() => handleTabChange('general')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Identity &amp; API Key
        </button>
        <button
          onClick={() => handleTabChange('webhook')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'webhook'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Webhook Revalidation
        </button>
        <button
          onClick={() => handleTabChange('audit')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          System Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB: ALL TENANTS OVERVIEW */}
      {activeTab === 'all' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Multi-Tenant Registry
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each tenant maintains isolated categories, tags, author workflows, and S3 folders.
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                {websites.length} Tenants Configured
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Tenant Name &amp; Domain</th>
                    <th className="py-3 px-4 font-semibold">S3 Folder Prefix</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Articles</th>
                    <th className="py-3 px-4 font-semibold">API Key Identifier</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {websites.map((w) => {
                    const articleCount = blogs.filter((b) => b.websiteId === w.id).length;
                    const isSelected = w.id === targetSiteId;
                    return (
                      <tr 
                        key={w.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors ${
                          isSelected ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${w.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{w.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {w.domain}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {w.s3Prefix}
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              const nextStatus = w.status === 'active' ? 'inactive' : 'active';
                              updateWebsite(w.id, { status: nextStatus });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold cursor-pointer border text-[11px] transition-colors ${
                              w.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {w.status === 'active' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {articleCount}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {w.apiKey.slice(0, 16)}...
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              handleSelectTenant(w.id);
                              handleTabChange('general');
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IDENTITY & API KEY */}
      {activeTab === 'general' && activeSite && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-500" />
              Tenant Profile &amp; Domain
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Website Name</label>
                <input
                  type="text"
                  value={activeSite.name}
                  onChange={(e) => updateWebsite(activeSite.id, { name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Production Domain</label>
                <input
                  type="text"
                  value={activeSite.domain}
                  onChange={(e) => updateWebsite(activeSite.id, { domain: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Logo URL / Brand Mark</label>
                <div className="flex items-center gap-3">
                  {activeSite.logoUrl && (
                    <img
                      src={activeSite.logoUrl}
                      alt={activeSite.name}
                      className="w-9 h-9 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                  <input
                    type="url"
                    value={activeSite.logoUrl || ''}
                    onChange={(e) => updateWebsite(activeSite.id, { logoUrl: e.target.value })}
                    placeholder="https://cdn.example.com/logo.png"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Tenant Status</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateWebsite(activeSite.id, { status: activeSite.status === 'active' ? 'inactive' : 'active' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5 ${
                      activeSite.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {activeSite.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Status: {activeSite.status.toUpperCase()}</span>
                  </button>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inactive tenants refuse public API read calls.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">AWS S3 Folder Prefix</label>
                <input
                  type="text"
                  readOnly
                  value={activeSite.s3Prefix}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-500 dark:text-slate-400 font-mono focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Enforces isolated S3 bucket partitioning per TRD Section 10 &amp; 17.
                </p>
              </div>
            </div>
          </div>

          {/* Credentials & Consumer Tokens */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              API Key &amp; Authentication Scope
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                  Tenant Live Secret API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={activeSite.apiKey}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-700 dark:text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={copyApiKey}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Pass in consumer requests header: `Authorization: Bearer &lt;api_key&gt;`.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Supported Locales:</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSite.supportedLanguages.map((lang) => (
                    <span 
                      key={lang} 
                      className="px-2 py-0.5 rounded-md font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                    >
                      {lang.toUpperCase()} {lang === activeSite.defaultLanguage ? '(Default)' : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Rate Limiting Guarantee:</div>
                <p>Public consumer endpoints apply a Redis token bucket limiter with 1,000 req/min per IP/API key (TRD Section 11).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEBHOOK REVALIDATION */}
      {activeTab === 'webhook' && activeSite && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xs max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-500" />
              Webhook Revalidation Engine
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-medium">
              HMAC SHA-256
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Consumer Revalidation Endpoint
              </label>
              <input
                type="text"
                value={activeSite.revalidateWebhookUrl}
                onChange={(e) => updateWebsite(activeSite.id, { revalidateWebhookUrl: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {/* Test Trigger Button */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-slate-900 dark:text-white font-semibold">Test On-Demand Revalidation:</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Dispatches a test `blog.published` payload to purge Next.js ISR cached pages immediately on the live domain.
              </p>
              <button
                disabled={testingWebhook}
                onClick={testWebhookRevalidation}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                <span>{testingWebhook ? 'Dispatching Webhook...' : 'Fire Test Revalidation Ping'}</span>
              </button>

              {webhookLog && (
                <div className="mt-2 p-3 rounded-lg bg-white dark:bg-[#0f172a] text-[11px] font-mono space-y-1 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>HTTP {webhookLog.status} OK</span>
                    <span>{webhookLog.timestamp}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 break-all">{webhookLog.response}</div>
                </div>
              )}
            </div>

            {/* Payload info */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200">TRD Webhook Architecture:</div>
              <div>&bull; Consuming site verifies `X-Signature` HMAC hash with shared secret</div>
              <div>&bull; Next.js calls `revalidateTag(&apos;blog:&apos; + body.slug)` in route handler</div>
              <div>&bull; Zero cache staleness without sacrificing SSR speed!</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SYSTEM AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Immutable System Audit Logs (TRD Section 15)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All administrative events, workflow status changes, user invitations, and media updates are recorded.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter logs by event or user..."
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">User &amp; Role</th>
                  <th className="py-2.5 px-4 font-semibold">Event</th>
                  <th className="py-2.5 px-4 font-semibold">Tenant Scope</th>
                  <th className="py-2.5 px-4 font-semibold">Client IP</th>
                  <th className="py-2.5 px-4 font-semibold">Activity Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No audit logs match current search filter.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.userName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.role}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          {log.event}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {log.websiteId}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD NEW WEBSITE */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Onboard New Website Tenant
                </h2>
              </div>
              <button
                onClick={() => setIsOnboardOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWebsite} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Website Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jupsoft FinTech Blog"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Production Domain <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. fintech.jupsoft.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slug / Tenant Key
                  </label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="fintech-blog"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Language
                  </label>
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value as LanguageCode)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="en">English (EN)</option>
                    <option value="hi">Hindi (HI)</option>
                    <option value="fr">French (FR)</option>
                    <option value="ar">Arabic (AR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tenant Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Banking, automated accounting, and cloud infrastructure blogs."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brand Logo URL <span className="text-slate-400 font-normal">(Optional CDN or WebP link)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://yourdomain.com/brand-logo.svg"
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="font-semibold text-slate-700 dark:text-slate-300">Automated Provisioning:</div>
                <div>&bull; Generates secure secret API key `jup_live_sec_...`</div>
                <div>&bull; Isolates AWS S3 prefix `blogs/{newSlug || 'slug'}/`</div>
                <div>&bull; Pre-configures Next.js revalidation endpoint `https://{newDomain || 'domain'}/api/revalidate`</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs"
                >
                  Provision &amp; Save Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
