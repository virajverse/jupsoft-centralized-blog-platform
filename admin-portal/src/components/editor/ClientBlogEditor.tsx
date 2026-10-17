'use client';

import dynamic from 'next/dynamic';
import { BlogEditorSkeleton } from './BlogEditorSkeleton';

const BlogEditor = dynamic(
  () => import('./BlogEditor').then((mod) => mod.BlogEditor),
  {
    loading: () => <BlogEditorSkeleton />,
    ssr: false,
  }
);

interface ClientBlogEditorProps {
  blogId?: string | null;
}

export function ClientBlogEditor({ blogId = null }: ClientBlogEditorProps) {
  return <BlogEditor blogId={blogId} />;
}
