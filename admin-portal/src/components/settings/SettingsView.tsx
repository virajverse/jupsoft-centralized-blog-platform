'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
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
  Layers,
  CheckCircle2,
  XCircle,
  History,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  Trash2,
  Settings,
  ArrowRightLeft
} from 'lucide-react';
import { RedirectsView } from '../redirects/RedirectsView';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { apiClient, WebhookDeliveryLogItem } from '../../services/apiClient';

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
    showNotification,
    setActiveWebsite,
  } = useBlogStore(
    useShallow((s) => ({
      websites: s.websites,
      activeWebsiteId: s.activeWebsiteId,
      activeRole: s.activeRole,
      fetchWebsites: s.fetchWebsites,
      fetchBlogs: s.fetchBlogs,
      updateWebsite: s.updateWebsite,
      addWebsite: s.addWebsite,
      deleteWebsite: s.deleteWebsite,
      blogs: s.blogs,
      auditLogs: s.auditLogs,
      fetchAuditLogs: s.fetchAuditLogs,
      showNotification: s.showNotification,
      setActiveWebsite: s.setActiveWebsite,
    }))
  );

  const siteParam = searchParams.get('site');
  const effectiveSiteId = siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
    ? siteParam
    : activeWebsiteId;

  const isSuperAdmin = activeRole === 'Super Admin';
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setIsLoadingSettings(true);
    });
    Promise.all([
      fetchWebsites(),
      fetchBlogs()
    ]).finally(() => {
      if (active) setIsLoadingSettings(false);
    });
    return () => { active = false; };
  }, [fetchWebsites, fetchBlogs]);

  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId && (siteParam === 'all' || websites.some((w) => w.id === siteParam))) {
      queueMicrotask(() => setActiveWebsite(siteParam));
    }
    fetchAuditLogs(effectiveSiteId === 'all' ? undefined : effectiveSiteId);
  }, [siteParam, effectiveSiteId, activeWebsiteId, websites, setActiveWebsite, fetchAuditLogs]);

  const isAllSites = effectiveSiteId === 'all';

  // URL state
  type SettingsTab = 'all' | 'general' | 'redirects' | 'webhook' | 'audit';
  const tenantParam = searchParams.get('tenant');
  const rawTabParam = searchParams.get('tab') as SettingsTab;
  const activeTab: SettingsTab = (rawTabParam && ['all', 'general', 'redirects', 'webhook', 'audit'].includes(rawTabParam))
    ? ((!isSuperAdmin && rawTabParam === 'all') ? 'general' : rawTabParam)
    : (isSuperAdmin ? 'all' : 'general');

  // Derive target site directly from URL state
  const targetSiteId = (tenantParam && websites.some((w) => w.id === tenantParam))
    ? tenantParam
    : (isAllSites ? websites[0]?.id : effectiveSiteId);

  // Onboard modal state
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLang, setNewLang] = useState<LanguageCode>('en');
  const [isOnboardSubmitting, setIsOnboardSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Copy API key state
  const [copiedKey, setCopiedKey] = useState(false);

  // Audit filter state
  const [auditFilter, setAuditFilter] = useState('');

  const handleSelectTenant = (id: string) => {
    setParam('tenant', id);
  };

  const handleTabChange = (tab: SettingsTab) => {
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

  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; message: string; statusCode?: number; latencyMs?: number } | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDeliveryLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const activeSiteId = activeSite?.id;
  const loadWebhookLogs = React.useCallback(async () => {
    if (!activeSiteId) return;
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.getWebhookLogs(activeSiteId, 10);
      setWebhookLogs(res?.data || []);
    } catch {
      // fallback
    } finally {
      setIsLoadingLogs(false);
    }
  }, [activeSiteId]);

  useEffect(() => {
    if (activeTab === 'webhook' && activeSiteId) {
      loadWebhookLogs();
    }
  }, [activeTab, activeSiteId, loadWebhookLogs]);

  const handleTestPing = async () => {
    if (!activeSite || isTestingPing) return;
    setIsTestingPing(true);
    setPingResult(null);
    try {
      const res = await apiClient.testWebhookPing(activeSite.id, editWebhookUrl.trim() || undefined);
      setPingResult({
        success: res.success,
        message: res.message || (res.success ? 'Ping delivered successfully!' : 'Ping delivery failed'),
        statusCode: res.statusCode,
        latencyMs: res.latencyMs,
      });
      if (res.success) {
        showNotification(`Webhook ping succeeded (${res.statusCode || 200}) in ${res.latencyMs || 0}ms`, 'success');
      } else {
        showNotification(res.message || `Webhook ping failed (${res.statusCode || 'error'})`, 'warning');
      }
      loadWebhookLogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send test ping';
      setPingResult({ success: false, message: msg });
      showNotification(msg, 'warning');
    } finally {
      setIsTestingPing(false);
    }
  };

  const [showApiKey, setShowApiKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [regenerateKeyModal, setRegenerateKeyModal] = useState(false);
  const [deleteWebsiteModal, setDeleteWebsiteModal] = useState<{
    isOpen: boolean;
    websiteId?: string;
    websiteName?: string;
  }>({ isOpen: false });
  const [isDeletingWebsite, setIsDeletingWebsite] = useState(false);

  const copyApiKey = () => {
    if (!activeSite) return;
    navigator.clipboard.writeText(activeSite.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateApiKey = () => {
    if (!activeSite) return;
    if (!isSuperAdmin) {
      showNotification('Only Super Admin can rotate tenant secret API keys', 'warning');
      return;
    }
    setRegenerateKeyModal(true);
  };

  const handleConfirmRegenerateApiKey = async () => {
    if (!activeSite) return;
    setIsRegeneratingKey(true);
    try {
      const cleanSlug = activeSite.id.replace(/^site-/, '');
      const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
      const newKey = `jup_live_sec_${cleanSlug}_${randomHex}`;
      await updateWebsite(activeSite.id, { apiKey: newKey });
      showNotification(`New API key generated successfully for ${activeSite.name}!`, 'success');
      setShowApiKey(true);
      setRegenerateKeyModal(false);
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

  const handleDeleteWebsite = (id: string, name: string) => {
    if (!isSuperAdmin) {
      showNotification('Only Super Admin can delete website tenants', 'warning');
      return;
    }
    setDeleteWebsiteModal({
      isOpen: true,
      websiteId: id,
      websiteName: name,
    });
  };

  const handleConfirmDeleteWebsite = async () => {
    if (!deleteWebsiteModal.websiteId) return;
    setIsDeletingWebsite(true);
    try {
      await deleteWebsite(deleteWebsiteModal.websiteId);
      if (targetSiteId === deleteWebsiteModal.websiteId) {
        const remaining = websites.filter((w) => w.id !== deleteWebsiteModal.websiteId);
        setParam('tenant', remaining[0]?.id || null);
      }
      setDeleteWebsiteModal({ isOpen: false });
    } finally {
      setIsDeletingWebsite(false);
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
      supportedLanguages: ['en', 'hi', 'fr', 'ar'] as LanguageCode[],
      revalidateWebhookUrl: `https://${cleanDomain}/api/revalidate`,
    };

    setIsOnboardSubmitting(true);
    setOnboardError(null);

    try {
      const created = await addWebsite(newWebsite);
      const targetSite = (created as Website) || newWebsite;
      setParam('tenant', targetSite.id);
      setIsOnboardOpen(false);
      setNewName('');
      setNewDomain('');
      setNewSlug('');
      setNewLogoUrl('');
      setNewDescription('');
      showNotification(`Tenant "${targetSite.name}" onboarded successfully!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register website';
      setOnboardError(msg);
      showNotification(`❌ ${msg}`, 'warning');
    } finally {
      setIsOnboardSubmitting(false);
    }
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
          {isSuperAdmin && (
            <button
              onClick={() => setIsOnboardOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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

      {/* Section Tabs - Zoho Enterprise Styling */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#0c1322] p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto scrollbar-none w-full sm:w-fit max-w-full">
        {isSuperAdmin && (
          <button
            onClick={() => handleTabChange('all')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'all'
                ? 'bg-red-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Tenants
          </button>
        )}
        <button
          onClick={() => handleTabChange('general')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'general'
              ? 'bg-red-600 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Identity &amp; API Key
        </button>
        <button
          onClick={() => handleTabChange('redirects')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'redirects'
              ? 'bg-red-600 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>301 SEO Redirects</span>
        </button>
        <button
          onClick={() => handleTabChange('webhook')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'webhook'
              ? 'bg-red-600 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Webhook Revalidation
        </button>
        <button
          onClick={() => handleTabChange('audit')}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'audit'
              ? 'bg-red-600 text-white font-bold shadow-xs'
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
                  {isLoadingSettings ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28 mb-1" />
                          <div className="h-2.5 bg-slate-100 dark:bg-slate-850 rounded w-36" />
                        </td>
                        <td className="py-3 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                        <td className="py-3 px-4"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                        <td className="py-3 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" /></td>
                        <td className="py-3 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                        <td className="py-3 px-4 text-right"><div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12 ml-auto" /></td>
                      </tr>
                    ))
                  ) : websites.map((w) => {
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

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end whitespace-nowrap">
                            <button
                              onClick={() => {
                                handleSelectTenant(w.id);
                                handleTabChange('general');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                            >
                              <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                              <span>Configure</span>
                            </button>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteWebsite(w.id, w.name)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer border border-rose-200 dark:border-rose-800 whitespace-nowrap"
                                title={`Delete tenant ${w.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                                <span>Remove</span>
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
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
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

      {/* TAB: 301 SEO REDIRECTS */}
      {activeTab === 'redirects' && (
        <RedirectsView embedded />
      )}

      {/* TAB: WEBHOOK REVALIDATION */}
      {activeTab === 'webhook' && activeSite && (
        <div className="space-y-4 max-w-4xl font-sans">
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-500" />
                  On-Demand Cache Revalidation Webhook
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Target Next.js or edge URL receiving HMAC-SHA256 signed cache busting pings on blog publish, update, and unpublish events.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                HMAC SHA-256 Enabled
              </span>
            </div>

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
                    placeholder="e.g. https://digifynext.com/api/revalidate"
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3.5 py-2 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    disabled={isTestingPing}
                    onClick={handleTestPing}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                    title="Send a real HMAC-signed test ping to verify endpoint reachability"
                  >
                    {isTestingPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{isTestingPing ? 'Testing...' : 'Test Ping'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveWebhook}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isSaving ? 'Saving...' : 'Save Webhook URL'}</span>
                  </button>
                </div>

                {pingResult && (
                  <div className={`mt-2 p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                    pingResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                      <span>{pingResult.message}</span>
                    </div>
                    {pingResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] opacity-75 shrink-0">{pingResult.latencyMs}ms</span>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-500 mt-1">
                  Target Next.js or edge URL to receive cache busting pings (e.g. <code className="text-red-600 dark:text-red-400 font-mono">https://yourdomain.com/api/revalidate</code>).
                </p>
              </div>

              {/* Webhook Signature Secret Display */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Tenant Webhook HMAC Secret:</span>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Secret Copied!' : 'Copy Secret'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0c1322] px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 select-all truncate">
                  {activeSite.apiKey}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Verify incoming webhook requests on consumer server using <code className="font-mono">x-hub-signature-256</code> header.
                </span>
              </div>
            </div>
          </div>

          {/* Recent Webhook Delivery Logs Card */}
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Recent Webhook Delivery Logs</span>
              </h4>
              <button
                type="button"
                onClick={loadWebhookLogs}
                disabled={isLoadingLogs}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading delivery logs...</div>
            ) : webhookLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No webhook deliveries recorded yet. Click &ldquo;Test Ping&rdquo; above to verify live endpoint connectivity.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium">Event</th>
                      <th className="py-2 px-2 font-medium">Target URL</th>
                      <th className="py-2 px-2 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {webhookLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.statusCode && log.statusCode >= 200 && log.statusCode < 300
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}>
                            {log.statusCode || 'ERR'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-800 dark:text-slate-200">
                          {log.event}
                        </td>
                        <td className="py-2 px-2 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={log.targetUrl}>
                          {log.targetUrl}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-400 font-sans">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                {isLoadingSettings ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2.5 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-28" /></td>
                      <td className="py-2.5 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-1" /><div className="h-2 bg-slate-100 dark:bg-slate-850 rounded w-16" /></td>
                      <td className="py-2.5 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                      <td className="py-2.5 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                      <td className="py-2.5 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                      <td className="py-2.5 px-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-48" /></td>
                    </tr>
                  ))
                ) : filteredAuditLogs.length === 0 ? (
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

      {/* Delete Website Tenant Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteWebsiteModal.isOpen}
        title="Delete Website Tenant"
        itemName={deleteWebsiteModal.websiteName}
        itemType="website"
        message="WARNING: This will cascade and delete all associated blogs, categories, tags, media assets, and redirects for this tenant. This action cannot be undone."
        confirmText="Delete Website Tenant"
        isLoading={isDeletingWebsite}
        onConfirm={handleConfirmDeleteWebsite}
        onClose={() => setDeleteWebsiteModal({ isOpen: false })}
      />

      {/* Rotate Secret API Key Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={regenerateKeyModal}
        title="Rotate Secret API Key"
        itemName={activeSite?.name}
        itemType="API key"
        message="Regenerating the API key will immediately invalidate the existing key. Any client website using this key will need to update its .env.local to continue fetching blogs."
        confirmText="Rotate API Key"
        isLoading={isRegeneratingKey}
        onConfirm={handleConfirmRegenerateApiKey}
        onClose={() => setRegenerateKeyModal(false)}
      />
    </div>
  );
};
