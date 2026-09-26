'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { useQueryState } from '../../hooks/useQueryState';
import { 
  FolderTree, 
  Hash, 
  CornerDownRight,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Category, Tag } from '../../types';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

export const TaxonomyView: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    blogs,
    categories, 
    tags, 
    activeWebsiteId, 
    websites, 
    fetchCategories, 
    fetchTags,
    addCategory, 
    deleteCategory,
    addTag,
    deleteTag,
    setActiveWebsite,
  } = useBlogStore(
    useShallow((s) => ({
      blogs: s.blogs,
      categories: s.categories,
      tags: s.tags,
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      fetchCategories: s.fetchCategories,
      fetchTags: s.fetchTags,
      addCategory: s.addCategory,
      deleteCategory: s.deleteCategory,
      addTag: s.addTag,
      deleteTag: s.deleteTag,
      setActiveWebsite: s.setActiveWebsite,
    }))
  );

  // URL state
  const siteParam = searchParams.get('site');
  const tenantParam = searchParams.get('tenant');
  const tabParam = (searchParams.get('tab') as 'all' | 'categories' | 'tags') || 'all';
  const activeTab = ['all', 'categories', 'tags'].includes(tabParam) ? tabParam : 'all';

  const effectiveSiteId = siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
    ? siteParam
    : activeWebsiteId;

  const isAllSites = effectiveSiteId === 'all';

  // Derive target site directly from URL state
  const targetSiteId = (tenantParam && websites.some((w) => w.id === tenantParam))
    ? tenantParam
    : (isAllSites ? websites[0]?.id : effectiveSiteId);

  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  useEffect(() => {
    let active = true;
    if (siteParam && siteParam !== activeWebsiteId && (siteParam === 'all' || websites.some((w) => w.id === siteParam))) {
      queueMicrotask(() => setActiveWebsite(siteParam));
    }
    if (targetSiteId) {
      queueMicrotask(() => {
        if (active) setIsLoadingTaxonomy(true);
      });
      Promise.all([
        fetchCategories(targetSiteId),
        fetchTags(targetSiteId)
      ]).finally(() => {
        if (active) setIsLoadingTaxonomy(false);
      });
    }
    return () => { active = false; };
  }, [siteParam, activeWebsiteId, websites, setActiveWebsite, fetchCategories, fetchTags, targetSiteId]);

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
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'category' | 'tag';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'category',
    id: '',
    name: '',
  });

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isSubmittingCat) return;
    setIsSubmittingCat(true);
    const slug = newCatSlug.trim() || newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      await addCategory({
        websiteId: targetSiteId,
        name: newCatName.trim(),
        slug,
        parentId: newCatParentId || null,
        description: newCatDesc.trim() || undefined,
      });
      setNewCatName('');
      setNewCatSlug('');
      setNewCatParentId('');
      setNewCatDesc('');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (deletingCatId) return;
    setDeleteModal({
      isOpen: true,
      type: 'category',
      id: catId,
      name: catName,
    });
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim() || isSubmittingTag) return;
    setIsSubmittingTag(true);
    try {
      await addTag({
        websiteId: targetSiteId,
        name: newTagName.trim(),
        slug: newTagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      });
      setNewTagName('');
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleDeleteTag = (tagId: string, tagName: string) => {
    if (deletingTagId) return;
    setDeleteModal({
      isOpen: true,
      type: 'tag',
      id: tagId,
      name: tagName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    if (deleteModal.type === 'category') {
      setDeletingCatId(deleteModal.id);
      try {
        await deleteCategory(deleteModal.id, targetSiteId);
        setDeleteModal({ isOpen: false, type: 'category', id: '', name: '' });
      } finally {
        setDeletingCatId(null);
      }
    } else {
      setDeletingTagId(deleteModal.id);
      try {
        await deleteTag(deleteModal.id, targetSiteId);
        setDeleteModal({ isOpen: false, type: 'tag', id: '', name: '' });
      } finally {
        setDeletingTagId(null);
      }
    }
  };

  return (
    <div className="p-4 sm:p-5 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Taxonomy
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
            {activeSite?.name || 'Website'}
          </span>
        </div>

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
                  disabled={isSubmittingCat}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmittingCat && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isSubmittingCat ? 'Creating...' : '+ Create Category'}</span>
                </button>
              </div>
            </form>

            {/* Hierarchical Categories List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {isLoadingTaxonomy ? (
                <div className="space-y-2 py-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50/75 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 animate-pulse">
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-850 rounded w-1/4" />
                      </div>
                      <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : siteCategories.length === 0 ? (
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          {blogs.filter((b) => b.categoryIds?.includes(cat.id)).length} posts
                        </span>
                        <button
                          type="button"
                          disabled={deletingCatId === cat.id}
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          title={`Delete category "${cat.name}"`}
                        >
                          <Trash2 className={`w-3.5 h-3.5 ${deletingCatId === cat.id ? 'animate-spin text-rose-500' : ''}`} />
                        </button>
                      </div>
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
                disabled={isSubmittingTag}
                className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isSubmittingTag && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{isSubmittingTag ? 'Adding...' : 'Add'}</span>
              </button>
            </form>

            {/* Tags Cloud */}
            <div className="flex flex-wrap gap-2 pt-2">
              {isLoadingTaxonomy ? (
                <div className="flex flex-wrap gap-2 w-full py-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : siteTags.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 w-full">No tags created yet.</div>
              ) : (
                siteTags.map((tag) => {
                  const tagCount = blogs.filter((b) => b.tagIds?.includes(tag.id)).length;
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span>#{tag.name}</span>
                      <span className="text-[10px] text-slate-400">({tagCount})</span>
                      <button
                        type="button"
                        disabled={deletingTagId === tag.id}
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ml-1 disabled:opacity-50"
                        title={`Delete tag "#${tag.name}"`}
                      >
                        <Trash2 className={`w-3 h-3 ${deletingTagId === tag.id ? 'animate-spin text-rose-500' : ''}`} />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Taxonomy Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'category' ? 'Delete Category' : 'Delete Tag'}
        itemName={deleteModal.type === 'category' ? deleteModal.name : `#${deleteModal.name}`}
        itemType={deleteModal.type}
        message={`Are you sure you want to permanently delete this ${deleteModal.type}? It will be removed from all associated blogs.`}
        confirmText={`Delete ${deleteModal.type === 'category' ? 'Category' : 'Tag'}`}
        isLoading={Boolean(deletingCatId || deletingTagId)}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteModal({ isOpen: false, type: 'category', id: '', name: '' })}
      />
    </div>
  );
};
