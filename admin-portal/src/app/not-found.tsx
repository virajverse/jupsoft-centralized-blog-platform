'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  Home, 
  FileText, 
  Image as ImageIcon, 
  ShieldAlert, 
  Settings, 
  Code2, 
  ArrowRightLeft, 
  Users, 
  LifeBuoy, 
  FolderTree, 
  LogIn 
} from 'lucide-react';
import { useBlogStore } from '../store/useBlogStore';
import { useShallow } from 'zustand/react/shallow';
import { UserRole } from '../types';

export default function NotFound() {
  const { isAuthenticated, activeRole, currentUser } = useBlogStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      activeRole: s.activeRole,
      currentUser: s.currentUser,
    }))
  );

  // Dynamic quick navigation links tailored strictly to user's assigned role
  const dynamicLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: 'Login to CMS', href: '/login', icon: LogIn },
        { label: 'Forgot Password', href: '/forgot-password', icon: LifeBuoy },
      ];
    }

    switch (activeRole as UserRole) {
      case 'Developer':
        return [
          { label: 'Developer Setting', href: '/settings?tab=developer', icon: Code2, primary: true },
          { label: 'Old Link Redirects (301)', href: '/settings?tab=redirects', icon: ArrowRightLeft },
          { label: 'Browse Articles', href: '/blogs', icon: FileText },
          { label: 'Support Desk', href: '/support', icon: LifeBuoy },
          { label: 'Dashboard', href: '/dashboard', icon: Home },
        ];

      case 'Content Writer':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'Write New Blog', href: '/blogs/new', icon: FileText, primary: true },
          { label: 'My Articles', href: '/blogs', icon: FileText },
          { label: 'Media Library', href: '/media', icon: ImageIcon },
          { label: 'Support Desk', href: '/support', icon: LifeBuoy },
        ];

      case 'Editor':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'Editorial Review', href: '/workflow', icon: FileText, primary: true },
          { label: 'Browse Articles', href: '/blogs', icon: FileText },
          { label: 'Media Library', href: '/media', icon: ImageIcon },
          { label: 'Categories & Tags', href: '/taxonomy', icon: FolderTree },
        ];

      case 'SEO Manager':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'Old Link Redirects (301)', href: '/settings?tab=redirects', icon: ArrowRightLeft, primary: true },
          { label: 'Taxonomy & SEO', href: '/taxonomy', icon: FolderTree },
          { label: 'Article Directory', href: '/blogs', icon: FileText },
          { label: 'Analytics', href: '/analytics', icon: Home },
        ];

      case 'Publisher':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home },
          { label: 'Publishing Queue', href: '/workflow', icon: FileText, primary: true },
          { label: 'Published Articles', href: '/blogs', icon: FileText },
          { label: 'Redirect Rules', href: '/settings?tab=redirects', icon: ArrowRightLeft },
        ];

      case 'Super Admin':
      case 'Website Admin':
      case 'Role Admin':
      default:
        return [
          { label: 'Dashboard', href: '/dashboard', icon: Home, primary: true },
          { label: 'Blogs & Articles', href: '/blogs', icon: FileText },
          { label: 'Media Library', href: '/media', icon: ImageIcon },
          { label: 'Team Roles & Permissions', href: '/users', icon: Users },
          { label: 'Developer Setting', href: '/settings?tab=developer', icon: Code2 },
          { label: 'Website Settings', href: '/settings', icon: Settings },
        ];
    }
  }, [isAuthenticated, activeRole]);

  const primaryAction = useMemo(() => {
    if (!isAuthenticated) {
      return { label: 'Go to Login', href: '/login', icon: LogIn };
    }
    if (activeRole === 'Developer') {
      return { label: 'Go to Developer Setting', href: '/settings?tab=developer', icon: Code2 };
    }
    return { label: 'Return to Dashboard', href: '/dashboard', icon: Home };
  }, [isAuthenticated, activeRole]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#070b14] px-4 py-12 antialiased select-none">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Brand Logo Header */}
        <div className="flex justify-center items-center gap-2.5">
          <img
            src="/logoadminapp.png"
            alt="Jupsoft CMS"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* 404 Hero Illustration Card */}
        <div className="relative bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-2xl overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-500/10 dark:bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-4">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-mono font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ERROR 404 &bull; ROUTE NOT FOUND</span>
            </div>

            {/* Large 404 Display */}
            <h1 className="text-7xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">
              4<span className="text-red-600">0</span>4
            </h1>

            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Page or Resource Does Not Exist
            </h2>

            {/* Dynamic Role Indicator */}
            {isAuthenticated && activeRole && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <span>Active Account:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name || 'User'}</span>
                <span className="text-slate-400">&bull;</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeRole}</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              The page you are looking for might have been moved, deleted, or does not exist on this CMS tenant.
            </p>

            {/* Primary Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={primaryAction.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 transition-all cursor-pointer"
              >
                <primaryAction.icon className="w-4 h-4" />
                <span>{primaryAction.label}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic Quick Module Shortcuts based on user role */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isAuthenticated ? `Available Modules for ${activeRole || 'Your Role'}` : 'Quick Navigation'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            {dynamicLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 transition-colors shadow-2xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer brand label */}
        <p className="text-[11px] text-slate-400 dark:text-slate-600">
          Jupsoft Centralized Multi-Site Editorial Engine &bull; System Status: Active
        </p>
      </div>
    </div>
  );
}
