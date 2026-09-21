'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { useQueryState } from '../../hooks/useQueryState';
import { ZohoBlogListView } from './ZohoBlogListView';

export const BlogList: React.FC = () => {
  const searchParams = useSearchParams();
  const { setParam } = useQueryState();

  const { 
    blogs, 
    activeWebsiteId, 
    setActiveWebsite,
    websites, 
    activeRole,
    deleteBlog,
    fetchBlogs,
    fetchCategories,
    fetchTags,
    isLoading
  } = useBlogStore(
    useShallow((s) => ({
      blogs: s.blogs,
      activeWebsiteId: s.activeWebsiteId,
      setActiveWebsite: s.setActiveWebsite,
      websites: s.websites,
      activeRole: s.activeRole,
      deleteBlog: s.deleteBlog,
      fetchBlogs: s.fetchBlogs,
      fetchCategories: s.fetchCategories,
      fetchTags: s.fetchTags,
      isLoading: s.isLoading,
    }))
  );

  const siteParam = searchParams.get('site');
  const effectiveSiteId = siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
    ? siteParam
    : activeWebsiteId;

  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId && (siteParam === 'all' || websites.some((w) => w.id === siteParam))) {
      setActiveWebsite(siteParam);
    }
    fetchBlogs(effectiveSiteId);
    if (fetchCategories) fetchCategories(effectiveSiteId === 'all' ? undefined : effectiveSiteId);
    if (fetchTags) fetchTags(effectiveSiteId === 'all' ? undefined : effectiveSiteId);
  }, [effectiveSiteId, fetchBlogs, fetchCategories, fetchTags, siteParam, activeWebsiteId, websites, setActiveWebsite]);

  // Read URL query params
  const statusParam = searchParams.get('status') || 'All';
  const tenantParam = searchParams.get('tenant') || 'all';
  const queryParam = searchParams.get('q') || '';

  // Derive status and tenant filters directly from URL state
  const selectedStatus = statusParam;
  const selectedTenantFilter = tenantParam;

  // Search input state with adjust-during-render pattern
  const [searchVal, setSearchVal] = useState<string>(queryParam);
  const [prevQueryParam, setPrevQueryParam] = useState<string>(queryParam);

  if (prevQueryParam !== queryParam) {
    setPrevQueryParam(queryParam);
    setSearchVal(queryParam);
  }

  // Debounce syncing search to URL query parameter (stops router thrashing on keystrokes)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchVal.trim() !== queryParam.trim()) {
        setParam('q', searchVal.trim() || null);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchVal, queryParam, setParam]);

  const handleStatusChange = (status: string) => {
    setParam('status', status === 'All' ? null : status);
  };

  const handleTenantChange = (tenant: string) => {
    setParam('tenant', tenant === 'all' ? null : tenant);
  };

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];

  // Memoized Base Blogs filter
  const baseBlogs = useMemo(() => {
    return isAllSites
      ? (selectedTenantFilter === 'all' ? blogs : blogs.filter((b) => b.websiteId === selectedTenantFilter))
      : blogs.filter((b) => b.websiteId === activeWebsiteId);
  }, [isAllSites, blogs, selectedTenantFilter, activeWebsiteId]);

  // Memoized Filtered Blogs with optimized string lookup
  const filteredBlogs = useMemo(() => {
    const query = queryParam.trim().toLowerCase();
    return baseBlogs.filter((blog) => {
      const matchesStatus = selectedStatus === 'All' || blog.status === selectedStatus;
      if (!matchesStatus) return false;
      if (!query) return true;

      const titleMatch = Object.values(blog.translations || {}).some((t) => 
        t?.title?.toLowerCase().includes(query) || t?.slug?.toLowerCase().includes(query)
      );
      const authorMatch = blog.authorName ? blog.authorName.toLowerCase().includes(query) : false;
      return titleMatch || authorMatch;
    });
  }, [baseBlogs, selectedStatus, queryParam]);

  return (
    <ZohoBlogListView
      blogs={blogs}
      baseBlogs={baseBlogs}
      filteredBlogs={filteredBlogs}
      activeWebsiteId={activeWebsiteId}
      websites={websites}
      activeRole={activeRole}
      isAllSites={isAllSites}
      activeSite={activeSite}
      selectedStatus={selectedStatus}
      selectedTenantFilter={selectedTenantFilter}
      searchVal={searchVal}
      queryParam={queryParam}
      handleStatusChange={handleStatusChange}
      handleTenantChange={handleTenantChange}
      handleSearchChange={(val) => setSearchVal(val)}
      clearSearch={() => {
        setSearchVal('');
        setParam('q', null);
      }}
      deleteBlog={deleteBlog}
      fetchBlogs={fetchBlogs}
      isLoading={isLoading}
    />
  );
};
