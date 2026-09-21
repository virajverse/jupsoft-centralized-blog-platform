import dynamic from 'next/dynamic';
import { BlogEditorSkeleton } from '../../../../components/editor/BlogEditorSkeleton';

const BlogEditor = dynamic(
  () => import('../../../../components/editor/BlogEditor').then((mod) => mod.BlogEditor),
  {
    loading: () => <BlogEditorSkeleton />,
  }
);

export const metadata = {
  title: 'Edit Blog | Jupsoft CMS',
  description: 'Edit and optimize an existing article',
};

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const resolvedParams = await params;
  return <BlogEditor blogId={resolvedParams.id} />;
}
