import dynamic from 'next/dynamic';
import { BlogEditorSkeleton } from '../../../../components/editor/BlogEditorSkeleton';

const BlogEditor = dynamic(
  () => import('../../../../components/editor/BlogEditor').then((mod) => mod.BlogEditor),
  {
    loading: () => <BlogEditorSkeleton />,
  }
);

export const metadata = {
  title: 'New Blog | Jupsoft CMS',
  description: 'Draft a new multi-language blog with real-time SEO auditing',
};

export default function NewBlogPage() {
  return <BlogEditor blogId={null} />;
}
