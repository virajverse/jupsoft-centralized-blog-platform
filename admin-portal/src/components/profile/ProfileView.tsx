'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { apiClient } from '../../services/apiClient';
import { cleanAvatarUrl } from '../../utils/permissions';
import {
  User as UserIcon,
  Shield,
  Globe,
  FileText,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  Check,
  Clock,
  Send,
  Camera
} from 'lucide-react';

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2m1.4 10.24v-8.37H5.06v8.37h2.8z" />
  </svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    activeRole,
    activeWebsiteId,
    websites,
    blogs,
    fetchBlogs,
    showNotification,
  } = useBlogStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      activeRole: s.activeRole,
      activeWebsiteId: s.activeWebsiteId,
      websites: s.websites,
      blogs: s.blogs,
      fetchBlogs: s.fetchBlogs,
      showNotification: s.showNotification,
    }))
  );

  useEffect(() => {
    fetchBlogs();
    useBlogStore.getState().loadInitialData();
  }, [fetchBlogs]);

  // Form states for Author Identity
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`profile_bio_${currentUser?.id}`) || 
        'Author & content contributor crafting engaging, SEO-optimized articles and educational guides for the platform.';
    }
    return '';
  });
  const [linkedinUrl, setLinkedinUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`profile_linkedin_${currentUser?.id}`) || '';
    }
    return '';
  });
  const [twitterUrl, setTwitterUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`profile_twitter_${currentUser?.id}`) || '';
    }
    return '';
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showNotification('Image size exceeds 8MB. Please select a smaller photo.', 'warning');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await apiClient.uploadAvatar(file);
      if (res.success && res.avatar) {
        useBlogStore.setState((prev) => ({
          currentUser: prev.currentUser ? { ...prev.currentUser, avatar: res.avatar } : null,
        }));
        setAvatarLoadError(false);
        showNotification('Profile photo uploaded and converted to WebP successfully!', 'success');
      }
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.name) {
      setDisplayName(currentUser.name);
    }
  }, [currentUser?.name]);

  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  const safeAvatar = cleanAvatarUrl(currentUser?.avatar);

  // Filter user articles
  const userArticles = blogs.filter((b) => {
    if (currentUser?.id && b.authorId === currentUser.id) return true;
    if (b.authorName?.toLowerCase().includes(currentUser?.name?.toLowerCase() || '')) return true;
    if (activeRole === 'Content Writer' && (b.websiteId === activeWebsiteId || activeWebsiteId === 'all')) return true;
    return false;
  });

  const draftCount = userArticles.filter((b) => b.status === 'Draft').length;
  const reviewCount = userArticles.filter((b) => b.status === 'Under Review').length;
  const publishedCount = userArticles.filter((b) => b.status === 'Published').length;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      if (displayName.trim() && displayName.trim() !== currentUser?.name) {
        await apiClient.updateProfile({ name: displayName.trim() });
      }
      if (typeof window !== 'undefined' && currentUser?.id) {
        localStorage.setItem(`profile_bio_${currentUser.id}`, bio.trim());
        localStorage.setItem(`profile_linkedin_${currentUser.id}`, linkedinUrl.trim());
        localStorage.setItem(`profile_twitter_${currentUser.id}`, twitterUrl.trim());
      }
      showNotification('Profile & Author details saved successfully!', 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update profile', 'warning');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50 dark:bg-[#090d16]">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <UserIcon className="w-6 h-6 text-red-600 dark:text-red-500" />
            <span>My Account &amp; Author Profile</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Personal identity, Google Workspace sync status, author byline metadata, and contribution overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Scope: {activeSite?.name || 'All Sites'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Identity Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                {safeAvatar && !avatarLoadError ? (
                  <img
                    src={safeAvatar}
                    alt={currentUser?.name || 'User Avatar'}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setAvatarLoadError(true)}
                    className="w-18 h-18 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md ring-2 ring-slate-100 dark:ring-slate-700 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-2xl bg-red-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'U'}
                  </div>
                )}

                {/* Camera Click Overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-xs text-[10px] font-bold gap-1"
                  title="Upload profile photo (auto-converts to WebP)"
                >
                  {isUploadingAvatar ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Change</span>
                    </>
                  )}
                </button>

                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 z-10" title="Account Active" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {currentUser?.name || 'CMS User'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                    {activeRole}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentUser?.email || 'user@jupsoft.com'}
                </div>
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-500" />
                  <span>Assigned Role: {activeRole}</span>
                </div>

                {/* Upload Button */}
                <div className="mt-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                    disabled={isUploadingAvatar}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                        <span>Converting to WebP...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>Upload Photo (WebP)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Metadata Chips */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Assigned Site</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                  {activeSite?.name || 'All Tenants'}
                </span>
              </div>
              {currentUser?.lastLoginIp && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Last Sign-In IP</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {currentUser.lastLoginIp}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Author Identity & Contribution Stats (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Author Byline & Bio Form */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>Author Byline &amp; Public Bio</span>
              </h3>
              <span className="text-[11px] text-slate-400">Renders on published blogs</span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Display Name (Author Signature)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Preeti Sharma"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Assigned CMS Role</span>
                    <span className="text-[10px] text-slate-400 font-normal">Only Admin can change</span>
                  </label>
                  <div className="flex items-center gap-2 w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-700 dark:text-slate-300 font-medium select-none">
                    <Shield className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="flex-1 font-semibold">{activeRole}</span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-medium">System Role</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Author Bio (Shown on &quot;About the Author&quot; Card)
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a brief 2-3 sentence overview of your writing expertise, industry focus, and background..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <LinkedinIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>LinkedIn Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                    <TwitterIcon className="w-3.5 h-3.5 text-sky-500" />
                    <span>Twitter / X Profile URL</span>
                  </label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://x.com/username"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Author Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Author Contribution & Articles Stats */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>My Writing &amp; Editorial Portfolio</span>
              </h3>
              <Link
                href="/blogs/new"
                className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
              >
                <span>Write New Article</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Metric Counter Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-center">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {draftCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Drafts
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-center">
                <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                  {reviewCount}
                </div>
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                  Under Review
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {publishedCount}
                </div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Live Published
                </div>
              </div>
            </div>

            {/* Recent Articles List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Recent Authored Articles:
              </h4>

              {userArticles.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No articles authored yet on this site. Click &quot;Write New Article&quot; to begin your first draft!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {userArticles.slice(0, 5).map((article) => {
                    const title = article.translations?.en?.title || 'Untitled Article';
                    const slug = article.translations?.en?.slug || '';
                    return (
                      <div
                        key={article.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/blogs/edit/${article.id}`}
                            className="font-semibold text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 truncate block"
                          >
                            {title}
                          </Link>
                          <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                            /{slug}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              article.status === 'Published'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                : article.status === 'Under Review'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {article.status}
                          </span>

                          <Link
                            href={`/blogs/edit/${article.id}`}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
