'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Check,
  Camera,
  Lock,
  Wifi,
  KeyRound,
  Eye,
  EyeOff
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
    return currentUser?.bio || (typeof window !== 'undefined' && currentUser?.id ? localStorage.getItem(`profile_bio_${currentUser.id}`) : '') || '';
  });
  const [linkedinUrl, setLinkedinUrl] = useState(() => {
    return currentUser?.linkedinUrl || (typeof window !== 'undefined' && currentUser?.id ? localStorage.getItem(`profile_linkedin_${currentUser.id}`) : '') || '';
  });
  const [twitterUrl, setTwitterUrl] = useState(() => {
    return currentUser?.twitterUrl || (typeof window !== 'undefined' && currentUser?.id ? localStorage.getItem(`profile_twitter_${currentUser.id}`) : '') || '';
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real Public IP Detection & Verification State
  const [detectedPublicIp, setDetectedPublicIp] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('jupsoft_client_public_ip') : '') || '';
  });
  const [isFetchingIp, setIsFetchingIp] = useState(false);

  // Security / Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Detect and verify Real Client Public IP
  const fetchRealPublicIp = async (manual = false) => {
    setIsFetchingIp(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const cleanIp = (data?.ip || '').replace(/^::ffff:/, '').trim();
        if (cleanIp) {
          setDetectedPublicIp(cleanIp);
          if (typeof window !== 'undefined') {
            localStorage.setItem('jupsoft_client_public_ip', cleanIp);
          }
          const currentIp = currentUser?.lastLoginIp?.replace(/^::ffff:/, '').trim();
          if (manual || !currentIp || currentIp === '127.0.0.1' || currentIp === '::1' || currentIp.startsWith('192.168.') || currentIp.startsWith('10.')) {
            apiClient.syncClientIp(cleanIp).then(() => {
              useBlogStore.setState((prev) => ({
                currentUser: prev.currentUser ? { ...prev.currentUser, lastLoginIp: cleanIp } : null,
              }));
            }).catch(() => {});
          }
          if (manual) {
            showNotification(`Real public IP verified: ${cleanIp}`, 'success');
          }
          return;
        }
      }
    } catch {
      // Fallback service
      try {
        const res2 = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        if (res2.ok) {
          const data2 = await res2.json();
          const cleanIp2 = (data2?.ip || '').replace(/^::ffff:/, '').trim();
          if (cleanIp2) {
            setDetectedPublicIp(cleanIp2);
            if (typeof window !== 'undefined') {
              localStorage.setItem('jupsoft_client_public_ip', cleanIp2);
            }
            const currentIp = currentUser?.lastLoginIp?.replace(/^::ffff:/, '').trim();
            if (manual || !currentIp || currentIp === '127.0.0.1' || currentIp === '::1') {
              apiClient.syncClientIp(cleanIp2).then(() => {
                useBlogStore.setState((prev) => ({
                  currentUser: prev.currentUser ? { ...prev.currentUser, lastLoginIp: cleanIp2 } : null,
                }));
              }).catch(() => {});
            }
            if (manual) {
              showNotification(`Real public IP verified: ${cleanIp2}`, 'success');
            }
          }
        }
      } catch {
        if (manual) {
          showNotification('Could not resolve public IP (check internet connection)', 'warning');
        }
      }
    } finally {
      setIsFetchingIp(false);
    }
  };

  useEffect(() => {
    fetchRealPublicIp();
  }, []);

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
    if (currentUser) {
      if (currentUser.name) setDisplayName(currentUser.name);
      if (currentUser.bio !== undefined) setBio(currentUser.bio || '');
      if (currentUser.linkedinUrl !== undefined) setLinkedinUrl(currentUser.linkedinUrl || '');
      if (currentUser.twitterUrl !== undefined) setTwitterUrl(currentUser.twitterUrl || '');
    }
  }, [currentUser]);

  const activeSite = websites.find((w) => w.id === activeWebsiteId) || websites[0];
  const safeAvatar = cleanAvatarUrl(currentUser?.avatar);

  // Compute dynamic assigned websites
  const isGlobalAccess = useMemo(() => {
    if (!currentUser) return false;
    const roles = currentUser.roleAssignments || {};
    return Boolean(roles['all']) || activeRole === 'Super Admin';
  }, [currentUser, activeRole]);

  const assignedWebsitesList = useMemo(() => {
    if (!currentUser) return [];
    if (isGlobalAccess) return websites;
    const roles = currentUser.roleAssignments || {};
    const assignedIds = Object.keys(roles);
    return websites.filter((w) => assignedIds.includes(w.id));
  }, [currentUser, isGlobalAccess, websites]);

  // Dynamic IP display info (never raw ::ffff:127.0.0.1)
  const displayIpInfo = useMemo(() => {
    const rawLast = currentUser?.lastLoginIp ? currentUser.lastLoginIp.replace(/^::ffff:/, '').trim() : '';
    const isLocal = !rawLast || rawLast === '127.0.0.1' || rawLast === '::1' || rawLast.startsWith('192.168.') || rawLast.startsWith('10.');

    if (detectedPublicIp) {
      return {
        ip: detectedPublicIp,
        badge: 'Live Public IP',
        isLive: true,
      };
    }
    if (rawLast && !isLocal) {
      return {
        ip: rawLast,
        badge: 'Recorded Sign-In IP',
        isLive: true,
      };
    }
    return {
      ip: rawLast || 'Resolving...',
      badge: isLocal ? 'Localhost' : 'Network IP',
      isLive: false,
    };
  }, [currentUser?.lastLoginIp, detectedPublicIp]);

  // Filter user articles
  const userAuthoredArticles = useMemo(() => {
    return blogs.filter((b) => {
      if (currentUser?.id && b.authorId === currentUser.id) return true;
      if (currentUser?.name && b.authorName && b.authorName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) return true;
      return false;
    });
  }, [blogs, currentUser]);

  const displayArticles = useMemo(() => {
    if (userAuthoredArticles.length > 0) return userAuthoredArticles;
    // Fallback for Admins / Editors: show scope articles if no directly authored blogs exist under this exact name
    if (activeRole === 'Super Admin' || activeRole === 'Role Admin' || activeRole === 'Editor') {
      return blogs.filter((b) => activeWebsiteId === 'all' || b.websiteId === activeWebsiteId);
    }
    return [];
  }, [userAuthoredArticles, blogs, activeRole, activeWebsiteId]);

  const isScopeFallback = userAuthoredArticles.length === 0 && displayArticles.length > 0;

  const relevantArticles = userAuthoredArticles.length > 0 ? userAuthoredArticles : displayArticles;
  const draftCount = relevantArticles.filter((b) => b.status === 'Draft').length;
  const reviewCount = relevantArticles.filter((b) => b.status === 'Under Review').length;
  const publishedCount = relevantArticles.filter((b) => b.status === 'Published').length;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const cleanName = displayName.trim() || currentUser?.name || '';
      const cleanBio = bio.trim();
      const cleanLinkedin = linkedinUrl.trim();
      const cleanTwitter = twitterUrl.trim();

      const updated = await apiClient.updateProfile({
        name: cleanName,
        bio: cleanBio,
        linkedinUrl: cleanLinkedin,
        twitterUrl: cleanTwitter,
      });

      // Update state in store
      useBlogStore.setState((prev) => ({
        currentUser: prev.currentUser
          ? {
              ...prev.currentUser,
              name: updated.name || cleanName,
              bio: updated.bio !== undefined ? updated.bio : cleanBio,
              linkedinUrl: updated.linkedinUrl !== undefined ? updated.linkedinUrl : cleanLinkedin,
              twitterUrl: updated.twitterUrl !== undefined ? updated.twitterUrl : cleanTwitter,
            }
          : null,
      }));

      if (typeof window !== 'undefined' && currentUser?.id) {
        localStorage.setItem(`profile_bio_${currentUser.id}`, cleanBio);
        localStorage.setItem(`profile_linkedin_${currentUser.id}`, cleanLinkedin);
        localStorage.setItem(`profile_twitter_${currentUser.id}`, cleanTwitter);
      }
      showNotification('Profile & Author details saved successfully in database!', 'success');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to update profile', 'warning');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showNotification('Please enter your current password', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showNotification('New password must be at least 8 characters long', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('New password and confirmation do not match', 'warning');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      showNotification('Account password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!currentUser?.email) {
      showNotification('User email address not found', 'warning');
      return;
    }
    setIsSendingReset(true);
    try {
      await apiClient.forgotPassword(currentUser.email);
      showNotification(`Password reset link sent to ${currentUser.email}`, 'info');
    } catch (err: unknown) {
      showNotification(err instanceof Error ? err.message : 'Failed to send reset link', 'error');
    } finally {
      setIsSendingReset(false);
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
            <span>Scope: {activeSite?.name || 'All Websites'}</span>
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
                    {currentUser?.name || currentUser?.email?.split('@')[0] || 'CMS User'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                    {activeRole}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                  {currentUser?.email || '—'}
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
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Account Status</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>

              {/* Dynamic Assigned Websites */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 text-[11px] shrink-0 pt-0.5">Assigned Website</span>
                <div className="text-right flex flex-col items-end gap-1">
                  {isGlobalAccess ? (
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      All Websites (Global Access)
                    </span>
                  ) : assignedWebsitesList.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                      {assignedWebsitesList.map((site) => (
                        <span
                          key={site.id}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[150px]"
                          title={site.name}
                        >
                          {site.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      {activeSite?.name || 'All Websites'}
                    </span>
                  )}
                </div>
              </div>

              {/* Real Client Public IP (Never fake ::ffff:127.0.0.1) */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100/60 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400 text-[11px]">Public IP</span>
                  {displayIpInfo.isLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Connection" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      {displayIpInfo.ip}
                    </span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider block">
                      {displayIpInfo.badge}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchRealPublicIp(true)}
                    disabled={isFetchingIp}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Verify & Refresh Public IP"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingIp ? 'animate-spin text-blue-500' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Security Trigger */}
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Security &amp; Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {showPasswordSection ? 'Hide' : 'Update Password'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage account authentication credentials and login password security.
            </p>

            {showPasswordSection && (
              <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Current Password
                    </label>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={isSendingReset}
                      className="text-[11px] font-medium text-red-600 hover:text-red-500 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {isSendingReset ? 'Sending link...' : 'Forgot current password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 pr-8 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-mono text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-mono text-xs"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 font-mono text-xs"
                    required
                    minLength={8}
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isChangingPassword ? 'Updating...' : 'Save New Password'}</span>
                  </button>
                </div>
              </form>
            )}
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
                    <span className="text-[10px] text-slate-400 font-normal">Managed by Super Admin</span>
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
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  {isScopeFallback
                    ? `Recent Articles (${activeSite?.name || 'Active Website Scope'}):`
                    : 'Recent Authored Articles:'}
                </span>
                {isScopeFallback && (
                  <span className="text-[10px] font-normal text-slate-400">Active Website Scope</span>
                )}
              </h4>

              {displayArticles.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  No articles authored yet on this website. Click &quot;Write New Article&quot; to begin your first draft!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {displayArticles.slice(0, 5).map((article) => {
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
