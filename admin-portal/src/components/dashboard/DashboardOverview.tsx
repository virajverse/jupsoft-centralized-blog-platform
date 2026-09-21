'use client';

import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { ZohoDashboardView } from './ZohoDashboardView';

export const DashboardOverview: React.FC = () => {
  const searchParams = useSearchParams();
  const { 
    blogs, 
    activeWebsiteId, 
    websites, 
    activeRole,
    currentUser,
    fetchBlogs,
    setActiveWebsite,
  } = useBlogStore(
    useShallow((s) => ({
      blogs: s.blogs,
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      activeRole: s.activeRole,
      currentUser: s.currentUser,
      fetchBlogs: s.fetchBlogs,
      setActiveWebsite: s.setActiveWebsite,
    }))
  );

  const siteParam = searchParams.get('site');
  const effectiveSiteId = siteParam && (siteParam === 'all' || websites.some((w) => w.id === siteParam))
    ? siteParam
    : activeWebsiteId;

  const isAllSites = effectiveSiteId === 'all';
  const activeSite = websites.find((w) => w.id === effectiveSiteId) || websites[0];

  useEffect(() => {
    if (siteParam && siteParam !== activeWebsiteId && (siteParam === 'all' || websites.some((w) => w.id === siteParam))) {
      setActiveWebsite(siteParam);
    }
    fetchBlogs(effectiveSiteId);
  }, [effectiveSiteId, siteParam, activeWebsiteId, websites, setActiveWebsite, fetchBlogs]);
  
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
    <ZohoDashboardView
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
    />
  );
};
