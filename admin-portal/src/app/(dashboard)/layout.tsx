import React, { Suspense } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Navbar } from '../../components/layout/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-[#090d16] font-sans">
      {/* Full-Height Left Sidebar */}
      <Suspense fallback={<div className="w-64 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14]" />}>
        <Sidebar />
      </Suspense>

      {/* Right-Hand Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Pinned Top Navbar */}
        <Suspense fallback={<div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080c14]" />}>
          <Navbar />
        </Suspense>

        {/* Dynamic Route Workspace */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
