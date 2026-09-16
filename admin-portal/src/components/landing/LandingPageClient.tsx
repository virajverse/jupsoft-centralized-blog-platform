'use client';

import React from 'react';
import { LandingNavbar } from './LandingNavbar';
import { LandingHero } from './LandingHero';
import { LandingMetrics } from './LandingMetrics';
import { LandingBentoGrid } from './LandingBentoGrid';
import { LandingInteractivePlayground } from './LandingInteractivePlayground';
import { LandingArchitecture } from './LandingArchitecture';
import { LandingRbac } from './LandingRbac';
import { LandingTechStack } from './LandingTechStack';
import { LandingFooter } from './LandingFooter';

export const LandingPageClient: React.FC = () => {
  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      <LandingNavbar />
      <main className="relative">
        <LandingHero />
        <LandingMetrics />
        <LandingBentoGrid />
        <LandingInteractivePlayground />
        <LandingArchitecture />
        <LandingRbac />
        <LandingTechStack />
      </main>
      <LandingFooter />
    </div>
  );
};
