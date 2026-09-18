'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { Website, LanguageCode } from '../../types';
import { apiClient, WebhookEndpoint, WebhookDeliveryLogItem } from '../../services/apiClient';
import { 
  Globe, 
  Copy, 
  Check, 
  RefreshCw, 
  Zap,
  Plus,
  ShieldCheck,
  Layers,
  CheckCircle2,
  XCircle,
  History,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
  Radio,
  AlertCircle,
  Play,
  Trash2,
  Activity,
  Code2,
  Sparkles,
  Terminal
} from 'lucide-react';
import { ClientHandoverModal } from '../common/ClientHandoverModal';

export const SettingsView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    websites, 
    activeWebsiteId, 
    activeRole,
    fetchWebsites,
    fetchBlogs,
    updateWebsite, 
    addWebsite,
    deleteWebsite,
    blogs,
    auditLogs,
    fetchAuditLogs,
    showNotification 
  } = useBlogStore();

  const isSuperAdmin = activeRole === 'Super Admin';

  useEffect(() => {
    fetchWebsites();
    fetchBlogs();
  }, [fetchWebsites, fetchBlogs]);

  useEffect(() => {
    fetchAuditLogs(activeWebsiteId === 'all' ? undefined : activeWebsiteId);
  }, [activeWebsiteId, fetchAuditLogs]);

  const isAllSites = activeWebsiteId === 'all';

  // URL state
  const tenantParam = searchParams.get('tenant');
  const rawTabParam = searchParams.get('tab') as 'all' | 'general' | 'webhook' | 'audit';
  const activeTab = (rawTabParam && ['all', 'general', 'webhook', 'audit'].includes(rawTabParam))
    ? ((!isSuperAdmin && rawTabParam === 'all') ? 'general' : rawTabParam)
    : (isSuperAdmin ? 'all' : 'general');

  // Derive target site directly from URL state
  const targetSiteId = (tenantParam && websites.some((w) => w.id === tenantParam))
    ? tenantParam
    : (isAllSites ? websites[0]?.id : activeWebsiteId);

  // Onboard modal state
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLang, setNewLang] = useState<LanguageCode>('en');
  const [handoverSite, setHandoverSite] = useState<Website | null>(null);
  const [isOnboardSubmitting, setIsOnboardSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Copy & Webhook tester states
  const [copiedKey, setCopiedKey] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookLog, setWebhookLog] = useState<{
    status: number;
    statusText?: string;
    response: string;
    timestamp: string;
    latencyMs?: number;
    success?: boolean;
    url?: string;
    message?: string;
  } | null>(null);

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState('');

  const handleSelectTenant = (id: string) => {
    setParam('tenant', id);
  };

  const handleTabChange = (tab: 'all' | 'general' | 'webhook' | 'audit') => {
    setParam('tab', tab === (isSuperAdmin ? 'all' : 'general') ? null : tab);
  };

  const activeSite = websites.find((w) => w.id === targetSiteId) || websites[0];

  // Editable local states for active tenant settings with adjust-during-render pattern
  const [prevSiteId, setPrevSiteId] = useState(activeSite?.id);
  const [editName, setEditName] = useState(activeSite?.name || '');
  const [editDomain, setEditDomain] = useState(activeSite?.domain || '');
  const [editLogoUrl, setEditLogoUrl] = useState(activeSite?.logoUrl || '');
  const [editWebhookUrl, setEditWebhookUrl] = useState(activeSite?.revalidateWebhookUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  if (activeSite && activeSite.id !== prevSiteId) {
    setPrevSiteId(activeSite.id);
    setEditName(activeSite.name || '');
    setEditDomain(activeSite.domain || '');
    setEditLogoUrl(activeSite.logoUrl || '');
    setEditWebhookUrl(activeSite.revalidateWebhookUrl || '');
  }

  const handleSaveProfile = async () => {
    if (!activeSite) return;
    setIsSaving(true);
    try {
      await updateWebsite(activeSite.id, {
        name: editName.trim(),
        domain: editDomain.trim(),
        logoUrl: editLogoUrl.trim(),
      });
      showNotification('Website profile & domain saved to database!', 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update website', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!activeSite) return;
    setIsSaving(true);
    try {
      await updateWebsite(activeSite.id, {
        revalidateWebhookUrl: editWebhookUrl.trim(),
      });
      showNotification('Webhook endpoint saved to database!', 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update webhook URL', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const [showApiKey, setShowApiKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);

  const copyApiKey = () => {
    if (!activeSite) return;
    navigator.clipboard.writeText(activeSite.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateApiKey = async () => {
    if (!activeSite) return;
    if (!isSuperAdmin) {
      showNotification('Only Super Admin can rotate tenant secret API keys', 'warning');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ Warning: Regenerating the API key for "${activeSite.name}" will immediately invalidate the existing key.\n\nAny client website using this key will need to update its .env.local to continue fetching blogs.\n\nDo you want to proceed?`
    );
    if (!confirmed) return;

    setIsRegeneratingKey(true);
    try {
      const cleanSlug = activeSite.id.replace(/^site-/, '');
      const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
      const newKey = `jup_live_sec_${cleanSlug}_${randomHex}`;
      await updateWebsite(activeSite.id, { apiKey: newKey } as any);
      showNotification(`New API key generated successfully for ${activeSite.name}!`, 'success');
      setShowApiKey(true);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to rotate API key', 'warning');
    } finally {
      setIsRegeneratingKey(false);
    }
  };

  // Auto-fill slug from name in onboarding modal
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newSlug || newSlug === val.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, -1)) {
      setNewSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
  };

  const handleDeleteWebsite = async (id: string, name: string) => {
    if (!isSuperAdmin) {
      showNotification('Only Super Admin can delete website tenants', 'warning');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the website "${name}"?\n\nWARNING: This will cascade and delete all associated blogs, categories, tags, media assets, and redirects for this tenant. This action cannot be undone.`
    );
    if (!confirmed) return;

    await deleteWebsite(id);
    if (targetSiteId === id) {
      const remaining = websites.filter((w) => w.id !== id);
      setParam('tenant', remaining[0]?.id || null);
    }
  };

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim()) {
      showNotification('Please provide both a website name and domain.', 'warning');
      return;
    }

    const cleanSlug = (newSlug.trim() || newName.toLowerCase().replace(/[^a-z0-9]/g, '-')).replace(/^-+|-+$/g, '');
    const cleanDomain = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .split('/')[0]
      .trim();
    const newSiteId = `site-${cleanSlug}`;

    const newWebsite = {
      id: newSiteId,
      name: newName.trim(),
      domain: cleanDomain,
      logoUrl: newLogoUrl.trim() || '/uploads/logos/jupsoft-cloud-logo.webp',
      description: newDescription.trim() || `${newName.trim()} content network.`,
      defaultLanguage: newLang,
      supportedLanguages: ['en', 'hi', 'fr', 'ar'],
      revalidateWebhookUrl: `https://${cleanDomain}/api/revalidate`,
    };

    setIsOnboardSubmitting(true);
    setOnboardError(null);

    try {
      const created = await addWebsite(newWebsite);
      const targetSite = (created as Website) || newWebsite;
      setParam('tenant', targetSite.id);
      setIsOnboardOpen(false);
      setHandoverSite(targetSite);
      setNewName('');
      setNewDomain('');
      setNewSlug('');
      setNewLogoUrl('');
      setNewDescription('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register website';
      setOnboardError(msg);
      showNotification(`❌ ${msg}`, 'warning');
    } finally {
      setIsOnboardSubmitting(false);
    }
  };

    // ─── Real Webhooks & Multi-Endpoint Logic (TRD §13 & §15) ─────────────
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [isAddWebhookOpen, setIsAddWebhookOpen] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [newWhUrl, setNewWhUrl] = useState('');
  const [newWhEvents, setNewWhEvents] = useState<string[]>([
    'blog.published',
    'blog.updated',
    'blog.unpublished',
    'blog.archived',
  ]);
  const [newWhSecret, setNewWhSecret] = useState('');
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);
  const [testingEndpointId, setTestingEndpointId] = useState<string | null>(null);

  // Delivery logs state
  const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLogItem[]>([]);
  const [loadingDeliveryLogs, setLoadingDeliveryLogs] = useState(false);

  const loadWebhookData = async (siteId: string) => {
    if (!siteId) return;
    setLoadingEndpoints(true);
    setLoadingDeliveryLogs(true);
    try {
      const [endpoints, logsRes] = await Promise.all([
        apiClient.getWebhookEndpoints(siteId).catch(() => []),
        apiClient.getWebhookLogs(siteId, 25).catch(() => ({ total: 0, data: [] })),
      ]);
      setWebhookEndpoints(endpoints || []);
      setDeliveryLogs(logsRes?.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingEndpoints(false);
      setLoadingDeliveryLogs(false);
    }
  };

  useEffect(() => {
    if (activeSite?.id && (activeTab === 'webhook' || activeTab === 'all')) {
      loadWebhookData(activeSite.id);
    }
  }, [activeSite?.id, activeTab]);

  // 100% REAL Live Webhook dispatch with HMAC signature (TRD §13 & §15)
  const testWebhookRevalidation = async (targetUrl?: string, endpointId?: string) => {
    if (!activeSite) return;
    const urlToTest = (targetUrl || editWebhookUrl || '').trim();
    if (!urlToTest) {
      showNotification('Please enter or configure a webhook URL to test', 'warning');
      return;
    }

    if (endpointId) {
      setTestingEndpointId(endpointId);
    } else {
      setTestingWebhook(true);
    }

    try {
      const result = await apiClient.testWebhookPing(activeSite.id, urlToTest);
      setWebhookLog({
        status: result.statusCode,
        statusText: result.statusText,
        response: result.responseBody || result.message,
        timestamp: new Date().toLocaleTimeString(),
        latencyMs: result.latencyMs,
        success: result.success,
        url: result.url,
        message: result.message,
      });

      if (result.success) {
        showNotification(`✅ HTTP ${result.statusCode} OK: Remote host acknowledged ping (${result.latencyMs}ms)`, 'success');
      } else if (result.statusCode === 404) {
        showNotification(`⚠️ HTTP 404 Not Found: Target URL does not exist yet (${result.latencyMs}ms)`, 'warning');
      } else if (result.statusCode === 0) {
        showNotification(`❌ Connection Failed: Could not reach ${result.url}`, 'warning');
      } else {
        showNotification(`⚠️ HTTP ${result.statusCode} ${result.statusText} (${result.latencyMs}ms)`, 'warning');
      }

      // Refresh delivery logs
      loadWebhookData(activeSite.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ping request failed';
      setWebhookLog({
        status: 0,
        statusText: 'Connection Error',
        response: msg,
        timestamp: new Date().toLocaleTimeString(),
        latencyMs: 0,
        success: false,
        url: urlToTest,
        message: msg,
      });
      showNotification(`❌ ${msg}`, 'warning');
    } finally {
      setTestingWebhook(false);
      setTestingEndpointId(null);
    }
  };

  const handleAddCustomEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSite) return;
    if (!newWhUrl.trim()) {
      showNotification('Endpoint URL is required', 'warning');
      return;
    }
    if (!newWhUrl.startsWith('http://') && !newWhUrl.startsWith('https://')) {
      showNotification('URL must begin with http:// or https://', 'warning');
      return;
    }
    setIsAddingEndpoint(true);
    try {
      await apiClient.addWebhookEndpoint(activeSite.id, {
        name: newWhName.trim() || 'Custom Webhook',
        url: newWhUrl.trim(),
        events: newWhEvents,
        secret: newWhSecret.trim(),
        isActive: true,
      });
      showNotification('New webhook endpoint registered successfully!', 'success');
      setIsAddWebhookOpen(false);
      setNewWhName('');
      setNewWhUrl('');
      setNewWhSecret('');
      loadWebhookData(activeSite.id);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to register webhook', 'warning');
    } finally {
      setIsAddingEndpoint(false);
    }
  };

  const handleToggleEndpoint = async (ep: WebhookEndpoint) => {
    if (!activeSite) return;
    try {
      await apiClient.updateWebhookEndpoint(activeSite.id, ep.id, {
        isActive: !ep.isActive,
      });
      showNotification(`Webhook "${ep.name}" ${!ep.isActive ? 'Activated' : 'Paused'}`, 'success');
      loadWebhookData(activeSite.id);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update webhook status', 'warning');
    }
  };

  const handleDeleteEndpoint = async (epId: string, epName: string) => {
    if (!activeSite) return;
    if (!confirm(`Are you sure you want to delete webhook "${epName}"?`)) return;
    try {
      await apiClient.deleteWebhookEndpoint(activeSite.id, epId);
      showNotification(`Webhook "${epName}" deleted`, 'success');
      loadWebhookData(activeSite.id);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to delete webhook', 'warning');
    }
  };

  const toggleEventSelection = (eventName: string) => {
    setNewWhEvents((prev) =>
      prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]
    );
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tenant &amp; System Settings
            </h1>
            {activeSite && (
              <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                {activeSite.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {activeSite && (
            <button
              onClick={() => setHandoverSite(activeSite)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              title="Copy 1-command installer or ready message to send to client"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Copy Install / Share Code</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setIsOnboardOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#4c22cf] hover:bg-[#3d1bb0] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Onboard Website</span>
            </button>
          )}
        </div>
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
            Total Blogs
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

      {/* Section Tabs - Smooth mobile scroll */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-[#0f172a] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none w-full sm:w-fit max-w-full">
        {isSuperAdmin && (
          <button
            onClick={() => handleTabChange('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'all'
                ? 'bg-[#4c22cf] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tenants
          </button>
        )}
        <button
          onClick={() => handleTabChange('general')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'general'
              ? 'bg-[#4c22cf] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Identity &amp; API Key
        </button>
        <button
          onClick={() => handleTabChange('webhook')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'webhook'
              ? 'bg-[#4c22cf] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Webhook Revalidation
        </button>
        <button
          onClick={() => handleTabChange('audit')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'audit'
              ? 'bg-[#4c22cf] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Audit Trail ({auditLogs.length})
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
                    <th className="py-3 px-4 font-semibold">Blogs</th>
                    <th className="py-3 px-4 font-semibold">API Key Identifier</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {websites.map((w) => {
                    const blogCount = blogs.filter((b) => b.websiteId === w.id).length;
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
                          {blogCount}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {w.apiKey.slice(0, 16)}...
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setHandoverSite(w)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 shadow-2xs"
                              title={`Copy 1-command installer or HTML embed code for ${w.name}`}
                            >
                              <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>⚡ Copy Install Code</span>
                            </button>
                            <button
                              onClick={() => {
                                handleSelectTenant(w.id);
                                handleTabChange('general');
                              }}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                              Configure
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteWebsite(w.id, w.name)}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                                title={`Delete tenant ${w.name}`}
                              >
                                Remove
                              </button>
                            )}
                          </div>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Production Domain / Hostname</label>
                <input
                  type="text"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value)}
                  placeholder="e.g. localhost:5001 or cloud.jupsoft.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Localhost during testing (e.g. <code className="text-blue-500 font-mono">localhost:5001</code>). When launching live, enter your production domain here without code changes.
                </p>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Logo URL / Brand Mark</label>
                <div className="flex items-center gap-3">
                  {editLogoUrl && (
                    <img
                      src={editLogoUrl}
                      alt={editName}
                      className="w-9 h-9 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                  <input
                    type="url"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
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
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving to Database...' : 'Save Profile & Domain'}</span>
                </button>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                    Tenant Live Secret API Key
                  </label>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleRegenerateApiKey}
                      disabled={isRegeneratingKey}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Roll a new secret API key for this tenant"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRegeneratingKey ? 'animate-spin' : ''}`} />
                      <span>{isRegeneratingKey ? 'Rotating...' : 'Rotate Key'}</span>
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    readOnly
                    value={activeSite.apiKey}
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-700 dark:text-slate-300 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center transition-colors font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors font-medium border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Generated automatically by platform backend &amp; stored in database. Client websites provide this key via <code className="font-mono text-indigo-600 dark:text-indigo-400">Authorization: Bearer &lt;key&gt;</code> to authenticate REST API requests.
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
            </div>
          </div>

          {/* Danger Zone: Super Admin only */}
          {isSuperAdmin && (
            <div className="lg:col-span-2 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Danger Zone: Delete Website Tenant</h4>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-0.5">
                  Permanently delete <strong>{activeSite.name}</strong> ({activeSite.domain}) and all associated blogs, categories, tags, media assets, and redirects. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteWebsite(activeSite.id, activeSite.name)}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Remove This Website
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: WEBHOOK REVALIDATION */}
      {activeTab === 'webhook' && activeSite && (
        <div className="space-y-6 max-w-4xl">
          {/* Main Card: Webhook Overview & Live Real Tester */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Webhooks &amp; Edge Revalidation Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  100% Real Live HTTP Event Dispatcher with cryptographic HMAC SHA-256 signatures and instant cache busting.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  HMAC SHA-256 Verified
                </span>
                <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 font-medium">
                  Multi-Destination
                </span>
              </div>
            </div>

            {/* Primary Endpoint & Live Ping Tester */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-800 dark:text-slate-200 font-semibold block mb-1">
                  Primary Next.js Cache Revalidation Endpoint
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={editWebhookUrl}
                    onChange={(e) => setEditWebhookUrl(e.target.value)}
                    placeholder="e.g. https://digifynext.com/api/revalidate or http://localhost:5002/api/revalidate"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveWebhook}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Primary URL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Target Next.js or edge URL to receive cache busting pings (e.g. <code className="text-emerald-600 dark:text-emerald-400 font-mono">https://yourdomain.com/api/revalidate</code>).
                </p>
              </div>

              {/* Real Live HTTP Ping Tool */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    <span>Live HTTP Ping Verification (Real Network Request)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Timeout: 6s | Replay Protection</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={testingWebhook || !editWebhookUrl.trim()}
                    onClick={() => testWebhookRevalidation(editWebhookUrl)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-50 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                    <span>{testingWebhook ? 'Executing Real HTTP Fetch...' : 'Fire Live Test Ping'}</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Sends actual HMAC-signed POST request to destination server and captures real HTTP status.
                  </span>
                </div>

                {/* Real Response Display Panel */}
                {webhookLog && (
                  <div
                    className={`mt-3 p-4 rounded-xl border text-xs font-mono space-y-2 transition-all ${
                      webhookLog.success
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                        : webhookLog.status === 404
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-current/10">
                      <div className="flex items-center gap-2">
                        {webhookLog.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : webhookLog.status === 404 ? (
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <span className="font-bold text-xs">
                          {webhookLog.status === 0
                            ? 'HTTP 0 (Network / Connection Error)'
                            : `HTTP ${webhookLog.status} ${webhookLog.statusText || (webhookLog.status === 200 ? 'OK' : 'Error')}`}
                        </span>
                        {webhookLog.latencyMs !== undefined && webhookLog.latencyMs > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-medium">
                            {webhookLog.latencyMs}ms roundtrip
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-75 font-sans">{webhookLog.timestamp}</span>
                    </div>

                    <div className="text-[11px] font-sans pt-1">
                      <span className="font-semibold">Target URL:</span> <code className="font-mono underline">{webhookLog.url}</code>
                    </div>

                    {webhookLog.message && (
                      <p className="text-[11px] font-sans font-medium">
                        {webhookLog.message}
                      </p>
                    )}

                    {webhookLog.response && (
                      <div className="mt-2">
                        <div className="text-[10px] font-semibold uppercase opacity-75 mb-1">Server Response Body:</div>
                        <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-100 text-[11px] overflow-x-auto max-h-36 whitespace-pre-wrap font-mono">
                          {webhookLog.response}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Multi-Webhook Endpoints Manager */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  Multi-Webhook Endpoints ({webhookEndpoints.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Broadcast publish events to multiple destinations: Slack alerts, Discord channels, Zapier/Make automation, and secondary CDNs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWebhookOpen(!isAddWebhookOpen)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddWebhookOpen ? 'Close Form' : '+ Add Webhook Endpoint'}</span>
              </button>
            </div>

            {/* Add Webhook Form Accordion */}
            {isAddWebhookOpen && (
              <form onSubmit={handleAddCustomEndpoint} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Register New Webhook Endpoint
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Endpoint Name / Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marketing Slack Channel or Zapier Sync"
                      value={newWhName}
                      onChange={(e) => setNewWhName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Webhook Destination URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://hooks.slack.com/services/... or https://domain.com/api/webhook"
                      value={newWhUrl}
                      onChange={(e) => setNewWhUrl(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1.5">
                      Subscribed Trigger Events:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'blog.published', label: 'Blog Published' },
                        { id: 'blog.updated', label: 'Blog Updated' },
                        { id: 'blog.unpublished', label: 'Blog Unpublished' },
                        { id: 'blog.archived', label: 'Blog Archived' },
                      ].map((evt) => (
                        <label
                          key={evt.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                            newWhEvents.includes(evt.id)
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={newWhEvents.includes(evt.id)}
                            onChange={() => toggleEventSelection(evt.id)}
                          />
                          <span>{evt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                      Custom HMAC Secret <span className="text-slate-400 font-normal">(Optional — defaults to platform secret)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to use default WEBHOOK_DEFAULT_SECRET"
                      value={newWhSecret}
                      onChange={(e) => setNewWhSecret(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddWebhookOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingEndpoint}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isAddingEndpoint ? 'Registering...' : 'Add Endpoint'}
                  </button>
                </div>
              </form>
            )}

            {/* Endpoints Table / Card List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Endpoint Name</th>
                    <th className="py-2.5 px-3 font-semibold">Destination URL</th>
                    <th className="py-2.5 px-3 font-semibold">Subscribed Events</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {webhookEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No webhook endpoints configured. Add your first webhook endpoint above.
                      </td>
                    </tr>
                  ) : (
                    webhookEndpoints.map((ep) => (
                      <tr key={ep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{ep.name}</span>
                            {ep.id === 'primary-isr' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                                PRIMARY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={ep.url}>
                          {ep.url}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {ep.events.map((evt: string) => (
                              <span
                                key={evt}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono"
                              >
                                {evt.replace('blog.', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleEndpoint(ep)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              ep.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                            }`}
                          >
                            {ep.isActive ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={testingEndpointId === ep.id}
                              onClick={() => testWebhookRevalidation(ep.url, ep.id)}
                              title="Send live test ping"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Play className={`w-3 h-3 text-blue-500 ${testingEndpointId === ep.id ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline">Test</span>
                            </button>
                            {ep.id !== 'primary-isr' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEndpoint(ep.id, ep.name)}
                                title="Delete webhook"
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Real Delivery Logs from PostgreSQL database */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Live Webhook Delivery History (Database Logs)
              </h3>
              <button
                type="button"
                onClick={() => activeSite && loadWebhookData(activeSite.id)}
                disabled={loadingDeliveryLogs}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingDeliveryLogs ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold">Event</th>
                    <th className="py-2.5 px-3 font-semibold">Target URL</th>
                    <th className="py-2.5 px-3 font-semibold">Status Code</th>
                    <th className="py-2.5 px-3 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {deliveryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-sans text-xs">
                        No delivery logs recorded yet for this tenant. Trigger a test ping or publish a blog to see live logs.
                      </td>
                    </tr>
                  ) : (
                    deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 text-slate-500 font-sans">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {log.event}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-[220px] truncate" title={log.targetUrl}>
                          {log.targetUrl}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              log.statusCode >= 200 && log.statusCode < 300
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : log.statusCode === 404
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            HTTP {log.statusCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {log.delivered ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Delivered
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                System Audit Logs
              </h3>
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
              {onboardError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{onboardError}</span>
                </div>
              )}
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
                <div>&bull; Pre-configures Next.js revalidation endpoint `https://{newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'domain'}/api/revalidate`</div>
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
                  disabled={isOnboardSubmitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {isOnboardSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision &amp; Save Tenant</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLIENT HANDOVER & INSTALL CODE */}
      {handoverSite && (
        <ClientHandoverModal
          isOpen={!!handoverSite}
          site={handoverSite}
          onClose={() => setHandoverSite(null)}
        />
      )}
    </div>
  );
};
