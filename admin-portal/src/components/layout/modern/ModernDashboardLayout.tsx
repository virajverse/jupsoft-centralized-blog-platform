'use client';

import React, { Suspense } from 'react';
import { ModernSidebar } from './ModernSidebar';
import { ModernNavbar } from './ModernNavbar';

export const ModernDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f0f2f8] font-sans antialiased text-slate-800">
      {/* Signature Modern Indigo/Purple Sidebar */}
      <Suspense fallback={<div className="w-64 h-full bg-[#4c22cf]" />}>
        <ModernSidebar />
      </Suspense>

      {/* Right Canvas Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f0f2f8] min-w-0">
        {/* Modern Top Navbar */}
        <Suspense fallback={<div className="h-20 bg-[#f0f2f8]" />}>
          <ModernNavbar />
        </Suspense>

        {/* Dynamic Route Content */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden px-6 sm:px-8 pb-8">
          <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading Modern portal...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};
