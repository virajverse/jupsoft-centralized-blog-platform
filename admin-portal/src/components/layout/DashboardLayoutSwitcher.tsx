'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ZohoDashboardLayout } from './zoho/ZohoDashboardLayout';

const AdminGuideModal = dynamic(
  () => import('../guide/AdminGuideModal').then((m) => m.AdminGuideModal),
  { ssr: false }
);

export const DashboardLayoutSwitcher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEditorRoute = pathname === '/blogs/new' || (pathname?.startsWith('/blogs/') && pathname !== '/blogs');

  // Dedicated Full-Page Immersive Studio for Blog Writing (Medium / Ghost style)
  if (isEditorRoute) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white dark:bg-[#070b14] font-sans antialiased text-slate-900 dark:text-slate-100">
        {children}
      </div>
    );
  }

  // Pre-hydration clean shell placeholder
  if (!mounted) {
    return (
      <div className="h-screen w-screen overflow-hidden flex bg-[#f1f5f9] dark:bg-[#060a12] font-sans antialiased text-slate-800 dark:text-slate-200">
        <div className="w-16 h-full bg-[#0d1527] shrink-0" />
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <div className="h-[50px] bg-white dark:bg-[#0a0f1d] border-b border-slate-200 dark:border-slate-800" />
          <main className="flex-1 h-full overflow-y-auto p-4 sm:p-5">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminGuideModal />
      <ZohoDashboardLayout>{children}</ZohoDashboardLayout>
    </>
  );
};
