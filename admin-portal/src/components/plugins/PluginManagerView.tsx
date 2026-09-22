'use client';

import React, { useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { PlatformModuleConfig, UserRole } from '../../types';
import {
  Boxes,
  Plus,
  Trash2,
  Sliders,
  Search,
  Check,
  X,
  Layers,
  Sparkles,
  LayoutDashboard,
  FileText,
  Kanban,
  Image as ImageIcon,
  Tags,
  BarChart3,
  ArrowRightLeft,
  Users,
  Settings,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FileText,
  Kanban,
  Image: ImageIcon,
  Tags,
  BarChart3,
  ArrowRightLeft,
  Users,
  Settings,
  Boxes,
  Layers,
  Sparkles,
};

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Website Admin',
  'Role Admin',
  'Editor',
  'Content Writer',
  'Publisher',
  'SEO Manager',
];

export const PluginManagerView: React.FC = () => {
  const {
    modules,
    websites,
    toggleModule,
    updateModulePermissions,
    addCustomPlugin,
    deleteCustomPlugin,
    resetModulesToDefault,
  } = useBlogStore(
    useShallow((s) => ({
      modules: s.modules,
      websites: s.websites,
      toggleModule: s.toggleModule,
      updateModulePermissions: s.updateModulePermissions,
      addCustomPlugin: s.addCustomPlugin,
      deleteCustomPlugin: s.deleteCustomPlugin,
      resetModulesToDefault: s.resetModulesToDefault,
    }))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<PlatformModuleConfig | null>(null);

  // New Plugin Form State
  const [newPlugin, setNewPlugin] = useState({
    id: '',
    name: '',
    description: '',
    category: 'system' as PlatformModuleConfig['category'],
    route: '',
    icon: 'Boxes',
    version: '1.0.0',
    author: '',
    allowedRoles: ['Super Admin', 'Website Admin'] as UserRole[],
    allowedWebsites: ['all'] as string[],
  });

  // Edit Permissions State
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editWebsites, setEditWebsites] = useState<string[]>([]);

  // Filtering
  const filteredModules = modules.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'custom' && m.isCustomPlugin) ||
      (selectedCategory !== 'custom' && m.category === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const totalCount = modules.length;
  const enabledCount = modules.filter((m) => m.enabled).length;
  const customCount = modules.filter((m) => m.isCustomPlugin).length;
  const disabledCount = totalCount - enabledCount;

  const handleOpenEdit = (mod: PlatformModuleConfig) => {
    setEditingModule(mod);
    setEditRoles([...mod.allowedRoles]);
    setEditWebsites([...mod.allowedWebsites]);
  };

  const handleSavePermissions = () => {
    if (!editingModule) return;
    updateModulePermissions(
      editingModule.id,
      editRoles,
      editWebsites.length === 0 ? ['all'] : editWebsites
    );
    setEditingModule(null);
  };

  const handleCreatePlugin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlugin.id.trim() || !newPlugin.name.trim()) return;

    // Normalize slug ID
    const cleanId = newPlugin.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    addCustomPlugin({
      id: cleanId,
      name: newPlugin.name.trim(),
      description: newPlugin.description.trim() || 'Custom platform extension',
      category: newPlugin.category,
      enabled: true,
      allowedRoles: newPlugin.allowedRoles.length > 0 ? newPlugin.allowedRoles : ['Super Admin', 'Website Admin'],
      allowedWebsites: newPlugin.allowedWebsites.length > 0 ? newPlugin.allowedWebsites : ['all'],
      icon: newPlugin.icon || 'Boxes',
      route: newPlugin.route.trim() || `/plugins/${cleanId}`,
      version: newPlugin.version.trim() || '1.0.0',
      author: newPlugin.author.trim() || 'Custom Extension',
    });

    setIsAddModalOpen(false);
    setNewPlugin({
      id: '',
      name: '',
      description: '',
      category: 'system',
      route: '',
      icon: 'Boxes',
      version: '1.0.0',
      author: '',
      allowedRoles: ['Super Admin', 'Website Admin'],
      allowedWebsites: ['all'],
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Modular Platform & Plugin Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized authority to toggle platform modules ON/OFF, govern role access, and deploy custom feature extensions.
              </p>
            </div>
          </div>
        </div>

        {/* Global Admin Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all modules, permissions, and custom plugins to system defaults?')) {
                resetModulesToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Restore system default modules"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Custom Plugin</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Functions</span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            10 Core Functions + {customCount} Custom
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active / Live</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            {enabledCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Available across enabled workspaces
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Custom Plugins</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
            {customCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            User-defined modular extensions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Disabled Modules</span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
            {disabledCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Hidden from navigation & routes
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'content', label: 'Content Studio' },
            { id: 'marketing', label: 'SEO & Growth' },
            { id: 'operations', label: 'Operations' },
            { id: 'system', label: 'System & Security' },
            { id: 'custom', label: 'Custom Plugins' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search modules & plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map((mod) => {
          const IconComponent = ICON_MAP[mod.icon] || Boxes;
          const isEnabled = mod.enabled;

          return (
            <div
              key={mod.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200 flex flex-col justify-between shadow-xs ${
                isEnabled
                  ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  : 'border-slate-200 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isEnabled
                          ? mod.isCustomPlugin
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {mod.name}
                        </h3>
                        {mod.isCustomPlugin ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Custom Plugin
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Core Function
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          id: {mod.id}
                        </span>
                        {mod.version && (
                          <span className="text-[10px] text-slate-400">
                            v{mod.version}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id, !isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      isEnabled ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={isEnabled}
                    title={isEnabled ? 'Click to disable module' : 'Click to enable module'}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>

                {/* Meta details & permissions badges */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 dark:text-slate-500 font-medium">Tenant Scope:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {mod.allowedWebsites.includes('all')
                        ? 'All Websites (Global)'
                        : `${mod.allowedWebsites.length} specific site(s)`}
                    </span>
                  </div>

                  <div className="flex items-start justify-between text-[11px] gap-2">
                    <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">Roles:</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {mod.allowedRoles.slice(0, 3).map((r) => (
                        <span
                          key={r}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {r}
                        </span>
                      ))}
                      {mod.allowedRoles.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                          +{mod.allowedRoles.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between rounded-b-xl text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(mod)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium hover:bg-slate-200/60 dark:hover:bg-slate-700/50 rounded-md transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Access</span>
                </button>

                {mod.isCustomPlugin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to uninstall custom plugin "${mod.name}"?`)) {
                        deleteCustomPlugin(mod.id);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors font-medium cursor-pointer"
                    title="Uninstall custom plugin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Uninstall</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No modules match your query</h3>
          <p className="text-xs text-slate-500 mt-1">Try searching with a different term or clear category filters.</p>
        </div>
      )}

      {/* Modal: Register Custom Plugin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Register Custom Feature Plugin
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define an extensible modular capability with RBAC and site isolation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlugin} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Plugin ID / Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. newsletter-sync"
                    value={newPlugin.id}
                    onChange={(e) => setNewPlugin({ ...newPlugin, id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Newsletter Sync"
                    value={newPlugin.name}
                    onChange={(e) => setNewPlugin({ ...newPlugin, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain what this modular plugin does..."
                  value={newPlugin.description}
                  onChange={(e) => setNewPlugin({ ...newPlugin, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={newPlugin.category}
                    onChange={(e) => setNewPlugin({ ...newPlugin, category: e.target.value as PlatformModuleConfig['category'] })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="content">Content Studio</option>
                    <option value="marketing">SEO & Marketing</option>
                    <option value="operations">Operations</option>
                    <option value="system">System & Security</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Custom Route
                  </label>
                  <input
                    type="text"
                    placeholder="/plugins/custom-tool"
                    value={newPlugin.route}
                    onChange={(e) => setNewPlugin({ ...newPlugin, route: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    placeholder="1.0.0"
                    value={newPlugin.version}
                    onChange={(e) => setNewPlugin({ ...newPlugin, version: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Author / Team
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Growth Team"
                    value={newPlugin.author}
                    onChange={(e) => setNewPlugin({ ...newPlugin, author: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Roles Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Allowed Roles
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((role) => {
                    const isSelected = newPlugin.allowedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewPlugin({
                              ...newPlugin,
                              allowedRoles: newPlugin.allowedRoles.filter((r) => r !== role),
                            });
                          } else {
                            setNewPlugin({
                              ...newPlugin,
                              allowedRoles: [...newPlugin.allowedRoles, role],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tenant Scope Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Tenant Scope
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewPlugin({ ...newPlugin, allowedWebsites: ['all'] })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      newPlugin.allowedWebsites.includes('all')
                        ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Websites
                  </button>
                  {websites.map((site) => {
                    const isSelected =
                      !newPlugin.allowedWebsites.includes('all') &&
                      newPlugin.allowedWebsites.includes(site.id);
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => {
                          const base = newPlugin.allowedWebsites.filter((s) => s !== 'all');
                          if (isSelected) {
                            setNewPlugin({
                              ...newPlugin,
                              allowedWebsites: base.filter((s) => s !== site.id),
                            });
                          } else {
                            setNewPlugin({
                              ...newPlugin,
                              allowedWebsites: [...base, site.id],
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {site.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Register Plugin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Module Permissions */}
      {editingModule && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Configure Access: {editingModule.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Adjust role visibility and tenant restrictions for this module
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Role Multi-Select */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Authorized User Roles
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((role) => {
                    const isSelected = editRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditRoles(editRoles.filter((r) => r !== role));
                          } else {
                            setEditRoles([...editRoles, role]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-medium text-[11px]">{role}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tenant Scope */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Tenant Scope (Websites)
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setEditWebsites(['all'])}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                      editWebsites.includes('all')
                        ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="font-medium text-[11px]">All Websites (Network-Wide Access)</span>
                    {editWebsites.includes('all') && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {websites.map((site) => {
                      const isSelected =
                        !editWebsites.includes('all') && editWebsites.includes(site.id);
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => {
                            const base = editWebsites.filter((s) => s !== 'all');
                            if (isSelected) {
                              setEditWebsites(base.filter((s) => s !== site.id));
                            } else {
                              setEditWebsites([...base, site.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="font-medium text-[11px] truncate">{site.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSavePermissions}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Apply Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
