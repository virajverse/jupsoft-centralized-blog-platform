'use client';

import React, { useEffect, useState } from 'react';
import { useBlogStore } from '../../store/useBlogStore';
import { ModernDashboardLayout } from './modern/ModernDashboardLayout';
import { ZohoDashboardLayout } from './zoho/ZohoDashboardLayout';
import { ThemeTransitionOverlay } from './ThemeTransitionOverlay';
import { AdminGuideModal } from '../guide/AdminGuideModal';

export const DashboardLayoutSwitcher: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uiTheme } = useBlogStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration, render modern shell as default
  if (!mounted) {
    return (
      <div className="h-screen w-screen overflow-hidden flex bg-[#f0f2f8] font-sans antialiased text-slate-800">
        <div className="w-64 h-full bg-[#4c22cf]" />
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f0f2f8]">
          <div className="h-20 bg-[#f0f2f8]" />
          <main className="flex-1 h-full overflow-y-auto px-6 sm:px-8 pb-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <ThemeTransitionOverlay />
      <AdminGuideModal />
      {uiTheme === 'zoho' ? (
        <ZohoDashboardLayout>{children}</ZohoDashboardLayout>
      ) : (
        <ModernDashboardLayout>{children}</ModernDashboardLayout>
      )}
    </>
  );
};
