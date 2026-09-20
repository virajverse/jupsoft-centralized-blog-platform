'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { canAccessModule, AppModule } from '../../utils/permissions';
import { ShieldAlert } from 'lucide-react';

const emptySubscribe = () => () => {};

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, activeRole, modules } = useBlogStore();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const getActiveToken = () => {
    if (typeof window === 'undefined') return null;
    const cookieToken = document.cookie
      .split('; ')
      .find((c) => c.startsWith('jupsoft_auth_token='))
      ?.split('=')[1];
    return cookieToken || localStorage.getItem('jupsoft_auth_token');
  };

  const initialDataLoadedRef = React.useRef(false);

  useEffect(() => {
    const token = getActiveToken();
    if (!token) {
      if (isAuthenticated) {
        useBlogStore.getState().logout();
      }
      const loginUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(loginUrl);
    } else {
      if (!initialDataLoadedRef.current) {
        initialDataLoadedRef.current = true;
        useBlogStore.getState().loadInitialData();
      }
    }
  }, [isAuthenticated, router, pathname]);

  // Prevent flash of protected dashboard content before hydration / auth check
  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-[#070a12]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verifying authorization...</span>
        </div>
      </div>
    );
  }

  const token = getActiveToken();
  if (!isAuthenticated && !token) {
    return null;
  }

  const getModuleForPath = (path: string): AppModule | null => {
    if (path.startsWith('/blogs')) return 'blogs';
    if (path.startsWith('/workflow')) return 'workflow';
    if (path.startsWith('/media')) return 'media';
    if (path.startsWith('/taxonomy')) return 'taxonomy';
    if (path.startsWith('/redirects')) return 'redirects';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/plugins')) return 'plugins';
    if (path.startsWith('/dashboard') || path === '/') return 'dashboard';
    return null;
  };

  const moduleForPath = getModuleForPath(pathname);
  if (moduleForPath && !canAccessModule(activeRole, moduleForPath)) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Module Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Your assigned role (<span className="font-semibold text-slate-800 dark:text-slate-200">{activeRole}</span>) does not include access to the <span className="font-semibold text-slate-800 dark:text-slate-200">{moduleForPath}</span> module.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Admin module authority toggle check
  const moduleConfig = modules?.find((m) => m.id === moduleForPath);
  if (moduleConfig && !moduleConfig.enabled && moduleForPath !== 'plugins' && moduleForPath !== 'dashboard') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Module Disabled by Platform Admin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            The <span className="font-semibold text-slate-800 dark:text-slate-200">{moduleConfig.name}</span> module is currently turned off in this environment.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
