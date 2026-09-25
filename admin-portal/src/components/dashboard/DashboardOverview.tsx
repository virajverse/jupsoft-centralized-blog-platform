'use client';

import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { isGlobalScopeRole } from '../../utils/permissions';
import { JupsoftDashboardView } from './JupsoftDashboardView';

export const DashboardOverview: React.FC = () => {
  const searchParams = useSearchParams();
  const { 
    blogs, 
    activeWebsiteId, 
    websites, 
    activeRole,
    currentUser,
    fetchBlogs,
    fetchWebsites,
    setActiveWebsite,
    isLoading,
  } = useBlogStore(
    useShallow((s) => ({
      blogs: s.blogs,
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      activeRole: s.activeRole,
      currentUser: s.currentUser,
      fetchBlogs: s.fetchBlogs,
      fetchWebsites: s.fetchWebsites,
      setActiveWebsite: s.setActiveWebsite,
      isLoading: s.isLoading,
    }))
  );

  // Guarantee websites list is loaded from API
  useEffect(() => {
    if (websites.length === 0) {
      fetchWebsites();
    }
  }, [websites.length, fetchWebsites]);

  const hasGlobalAll = Boolean(currentUser?.roleAssignments?.['all']);
  const isSuperAdmin = isGlobalScopeRole(activeRole) || hasGlobalAll;
  const userAssignedWebsites = useMemo(() => {
    return isSuperAdmin
      ? websites
      : websites.filter((site) => currentUser?.roleAssignments?.[site.id]);
  }, [isSuperAdmin, websites, currentUser?.roleAssignments]);

  const siteParam = searchParams.get('site');
  const effectiveSiteId = useMemo(() => {
    if (isSuperAdmin) {
      return siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
        ? siteParam
        : activeWebsiteId;
    }
    if (userAssignedWebsites.length === 0) return activeWebsiteId;
    if (siteParam && userAssignedWebsites.some((w) => w.id === siteParam)) {
      return siteParam;
    }
    if (userAssignedWebsites.some((w) => w.id === activeWebsiteId)) {
      return activeWebsiteId;
    }
    return userAssignedWebsites[0]?.id || activeWebsiteId;
  }, [isSuperAdmin, siteParam, websites, activeWebsiteId, userAssignedWebsites]);

  const isAllSites = effectiveSiteId === 'all';
  const activeSite = websites.find((w) => w.id === effectiveSiteId) || userAssignedWebsites[0] || websites[0];

  useEffect(() => {
    if (effectiveSiteId && effectiveSiteId !== activeWebsiteId) {
      setActiveWebsite(effectiveSiteId);
    }
    fetchBlogs(effectiveSiteId);
  }, [effectiveSiteId, activeWebsiteId, setActiveWebsite, fetchBlogs]);
  
  // Isolated vs Global aggregation (Memoized)
  const displayedBlogs = useMemo(() => {
    return isAllSites ? blogs : blogs.filter((b) => b.websiteId === effectiveSiteId);
  }, [isAllSites, blogs, effectiveSiteId]);

  // Single-pass memoized status counts and word count
  const { publishedBlogs, underReviewBlogs, approvedBlogs, draftBlogs, totalWords } = useMemo(() => {
    const pub: typeof displayedBlogs = [];
    const rev: typeof displayedBlogs = [];
    const app: typeof displayedBlogs = [];
    const drf: typeof displayedBlogs = [];
    let words = 0;

    for (const blog of displayedBlogs) {
      if (blog.status === 'Published') pub.push(blog);
      else if (blog.status === 'Under Review') rev.push(blog);
      else if (blog.status === 'Approved') app.push(blog);
      else if (blog.status === 'Draft') drf.push(blog);

      if (blog.translations) {
        for (const trans of Object.values(blog.translations)) {
          if (trans?.content) {
            const plain = trans.content.replace(/<[^>]*>/g, ' ').trim();
            if (plain) {
              words += plain.split(/\s+/).filter(Boolean).length;
            }
          }
        }
      }
    }

    return {
      publishedBlogs: pub,
      underReviewBlogs: rev,
      approvedBlogs: app,
      draftBlogs: drf,
      totalWords: words,
    };
  }, [displayedBlogs]);

  return (
    <JupsoftDashboardView
      blogs={blogs}
      displayedBlogs={displayedBlogs}
      publishedBlogs={publishedBlogs}
      underReviewBlogs={underReviewBlogs}
      approvedBlogs={approvedBlogs}
      draftBlogs={draftBlogs}
      totalWords={totalWords}
      websites={websites}
      activeWebsiteId={activeWebsiteId}
      activeSite={activeSite}
      isAllSites={isAllSites}
      activeRole={activeRole}
      currentUser={currentUser}
      isLoading={isLoading}
    />
  );
};
