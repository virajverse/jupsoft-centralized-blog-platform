'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  FolderTree, 
  Hash, 
  CornerDownRight
} from 'lucide-react';
import { Category, Tag } from '../../types';

export const TaxonomyView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    categories, 
    tags, 
    activeWebsiteId, 
    websites, 
    fetchCategories, 
    fetchTags,
    addCategory, 
    addTag 
  } = useBlogStore();

  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  const isAllSites = activeWebsiteId === 'all';

  // URL state
  const tenantParam = searchParams.get('tenant');
  const tabParam = (searchParams.get('tab') as 'all' | 'categories' | 'tags') || 'all';
  const activeTab = ['all', 'categories', 'tags'].includes(tabParam) ? tabParam : 'all';

  // Derive target site directly from URL state
  const targetSiteId = (tenantParam && websites.some((w) => w.id === tenantParam))
    ? tenantParam
    : (isAllSites ? websites[0]?.id : activeWebsiteId);

  const handleSelectTenant = (id: string) => {
    setParam('tenant', id);
  };

  const handleTabChange = (tab: 'all' | 'categories' | 'tags') => {
    setParam('tab', tab === 'all' ? null : tab);
  };

  const activeSite = websites.find((w) => w.id === targetSiteId) || websites[0];
  const siteCategories = categories[targetSiteId] || [];
  const siteTags = tags[targetSiteId] || [];

  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const slug = newCatSlug.trim() || newCatName.toLowerCase().replace(/\s+/g, '-');
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      websiteId: targetSiteId,
      name: newCatName.trim(),
      slug,
      parentId: newCatParentId || null,
      description: newCatDesc.trim() || undefined,
      count: 0,
    };
    addCategory(newCat);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatParentId('');
    setNewCatDesc('');
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      websiteId: targetSiteId,
      name: newTagName.trim(),
      slug: newTagName.toLowerCase().replace(/\s+/g, '-'),
      count: 0,
    };
    addTag(newTag);
    setNewTagName('');
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Categories &amp; Tags
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
            {activeSite.name}
          </span>
        </div>

        {/* Tenant Selector Tabs if in All Websites mode */}
        {isAllSites && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2">Managing Taxonomy for:</span>
            {websites.map((w) => (
              <button
                key={w.id}
                onClick={() => handleSelectTenant(w.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  targetSiteId === w.id
                    ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}

        {/* Section Filter Tabs - URL bound (?tab=all|categories|tags) */}
        <div className="flex items-center gap-1 mt-4 bg-white dark:bg-[#0f172a] p-1 rounded-lg w-fit border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Taxonomy ({siteCategories.length + siteTags.length})
          </button>
          <button
            onClick={() => handleTabChange('categories')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Categories ({siteCategories.length})
          </button>
          <button
            onClick={() => handleTabChange('tags')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'tags'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tags ({siteTags.length})
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
        {/* Categories Manager */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-slate-500" />
                Categories ({siteCategories.length})
              </h3>
            </div>

            {/* Add Category Form (TRD Section 9: parent_id, description) */}
            <form onSubmit={handleCreateCategory} className="space-y-2.5 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Category name (e.g. Cloud ERP)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  type="text"
                  placeholder="Slug (optional, e.g. cloud-erp)"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="">None (Top-Level Category)</option>
                  {siteCategories.filter((c) => !c.parentId).map((c) => (
                    <option key={c.id} value={c.id}>
                      Parent: {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  + Create Category
                </button>
              </div>
            </form>

            {/* Hierarchical Categories List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {siteCategories.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No categories added yet.</div>
              ) : (
                siteCategories.map((cat) => {
                  const parent = cat.parentId ? siteCategories.find((p) => p.id === cat.parentId) : null;
                  const isChild = Boolean(cat.parentId);
                  return (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-colors ${
                        isChild
                          ? 'ml-6 bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/60'
                          : 'bg-slate-50/75 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isChild && (
                          <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{cat.name}</span>
                            {parent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Sub of {parent.name}
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cat.slug}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {cat.count || 0} posts
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tags Manager */}
        {(activeTab === 'all' || activeTab === 'tags') && (
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-500" />
                Tags ({siteTags.length})
              </h3>
            </div>

            {/* Add Tag Form */}
            <form onSubmit={handleCreateTag} className="flex gap-2">
              <input
                type="text"
                placeholder="New tag label (e.g. ERP, SaaS, Web3)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Add
              </button>
            </form>

            {/* Tags Cloud */}
            <div className="flex flex-wrap gap-2 pt-2">
              {siteTags.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 w-full">No tags created yet.</div>
              ) : (
                siteTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-700 dark:text-slate-300"
                  >
                    <span>#{tag.name}</span>
                    <span className="text-[10px] text-slate-400">({tag.count})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
