'use client';

import React, { useEffect, useMemo } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { ZohoDashboardView } from './ZohoDashboardView';

export const DashboardOverview: React.FC = () => {
  const { 
    blogs, 
    activeWebsiteId, 
    websites, 
    activeRole,
    currentUser,
    fetchBlogs,
  } = useBlogStore();

  useEffect(() => {
    // Populate all blogs on mount for metrics & connected tenants counts
    fetchBlogs('all');
  }, [fetchBlogs]);

  const isAllSites = activeWebsiteId === 'all';
  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  
  // Isolated vs Global aggregation (Memoized)
  const displayedBlogs = useMemo(() => {
    return isAllSites ? blogs : blogs.filter((b) => b.websiteId === activeWebsiteId);
  }, [isAllSites, blogs, activeWebsiteId]);

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
