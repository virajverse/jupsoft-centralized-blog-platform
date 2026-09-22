'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const startGlobalProgress = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:nav-start'));
  }
};

export const finishGlobalProgress = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:nav-finish'));
  }
};

export const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 85;
        }
        return prev + Math.floor(Math.random() * 15 + 10);
      });
    }, 150);
  };

  const finish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
  };

  // When pathname or searchParams change, finish loading
  useEffect(() => {
    queueMicrotask(finish);
  }, [pathname, searchParams]);

  // Global event listeners and link click interception
  useEffect(() => {
    const handleNavStart = () => start();
    const handleNavFinish = () => finish();

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const targetAttr = anchor.getAttribute('target');

      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || targetAttr === '_blank') {
        return;
      }

      // If clicked link is different from current full URL, start progress immediately
      const current = window.location.pathname + window.location.search;
      if (href !== current && !href.startsWith('javascript:')) {
        start();
      }
    };

    window.addEventListener('app:nav-start', handleNavStart);
    window.addEventListener('app:nav-finish', handleNavFinish);
    document.addEventListener('click', handleAnchorClick);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('app:nav-start', handleNavStart);
      window.removeEventListener('app:nav-finish', handleNavFinish);
      document.removeEventListener('click', handleAnchorClick);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-all duration-200"
      style={{
        opacity: visible ? 1 : 0,
        height: '2.5px',
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
