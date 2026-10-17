'use client';

import React, { Suspense } from 'react';
import { JupsoftSidebar } from './JupsoftSidebar';
import { JupsoftNavbar } from './JupsoftNavbar';
import { TopProgressBar } from '../TopProgressBar';

export const JupsoftDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f1f5f9] dark:bg-[#060a12] font-sans antialiased text-slate-800 dark:text-slate-200">
      {/* 0ms Instant Top Route Progress Bar */}
      <TopProgressBar />

      {/* Jupsoft Signature Two-Tier Sidebar (Tier 1 Rail + Tier 2 Context Drawer) */}
      <Suspense fallback={<div className="w-16 h-full bg-[#0d1527]" />}>
        <JupsoftSidebar />
      </Suspense>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Jupsoft 50px Compact Top Navbar */}
        <Suspense fallback={<div className="h-[50px] bg-white dark:bg-[#0a0f1d] border-b border-slate-200 dark:border-slate-800" />}>
          <JupsoftNavbar />
        </Suspense>

        {/* Dynamic Route View */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <Suspense fallback={<div className="p-6 text-xs text-slate-400">Loading workspace...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};
