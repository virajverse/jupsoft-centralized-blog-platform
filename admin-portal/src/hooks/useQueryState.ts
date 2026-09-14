'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useQueryState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const getParam = useCallback((key: string, defaultValue: string = ''): string => {
    return searchParams.get(key) || defaultValue;
  }, [searchParams]);

  const setParam = useCallback((key: string, value: string | null, replace: boolean = false) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === null || value === '' || value === undefined) {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : '';
    const url = `${pathname}${query}`;
    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const setParams = useCallback((params: Record<string, string | null>, replace: boolean = false) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === '' || value === undefined) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    const search = current.toString();
    const query = search ? `?${search}` : '';
    const url = `${pathname}${query}`;
    if (replace) {
      router.replace(url, { scroll: false });
    } else {
      router.push(url, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  return {
    searchParams,
    pathname,
    getParam,
    setParam,
    setParams,
  };
}
