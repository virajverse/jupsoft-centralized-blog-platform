'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBlogStore } from '../../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { apiClient } from '../../services/apiClient';
import { cleanAvatarUrl } from '../../utils/permissions';
import {
  User as UserIcon,
  Shield,
  Key,
  Globe,
  FileText,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  Sparkles,
  Check,
  Clock,
  Send,
  Briefcase
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

const GoogleIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
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
  }, [fetchBlogs]);

  // Form states for Author Identity
  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [designation, setDesignation] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`profile_desig_${currentUser?.id}`) || (
        activeRole === 'Content Writer' ? 'Content Writer & Specialist' :
        activeRole === 'Website Admin' ? 'Website Administrator' :
        activeRole === 'Super Admin' ? 'Platform Super Administrator' :
        activeRole === 'Editor' ? 'Senior Content Editor' :
        activeRole === 'SEO Manager' ? 'Technical SEO Strategist' :
        'Content Contributor'
      );
    }
    return '';
  });
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

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

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
        localStorage.setItem(`profile_desig_${currentUser.id}`, designation.trim());
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (!currentPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirm password do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('Password updated successfully! Use your new password next time you sign in.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Verify your current password.';
      setPassError(msg);
      showNotification(msg, 'warning');
    } finally {
      setIsChangingPass(false);
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
            Personal identity, Google Workspace sync status, author byline metadata, and security settings.
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
        {/* LEFT COLUMN: Identity Card & Security (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity & Google Sync Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-4">
              <div className="relative">
                {safeAvatar ? (
                  <img
                    src={safeAvatar}
                    alt={currentUser?.name || 'User Avatar'}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-md ring-2 ring-slate-100 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-red-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                    {currentUser?.name?.charAt(0) || activeRole?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Account Active" />
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
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-400" />
                  <span>{designation || 'Staff Contributor'}</span>
                </div>
              </div>
            </div>

            {/* Google Sync Status Banner (100% Automatic) */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <GoogleIcon />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Google Workspace Single Sign-On
                </span>
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Auto-Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Your full name and profile avatar photo are automatically synchronized directly from your Google corporate account on every sign-in.
              </p>
            </div>

            {/* Metadata Chips */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Account Status:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Assigned Site:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block mt-0.5">
                  {activeSite?.name || 'All Tenants'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Security (Change Password) Card */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              <span>Change Account Password</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Set a dedicated password to access the CMS portal directly without Google SSO.
            </p>

            {passError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-9 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPass || !currentPassword || !newPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isChangingPass ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isChangingPass ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Author Identity & Contribution Stats (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
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
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Designation / Role Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Content Specialist"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-medium"
                  />
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
