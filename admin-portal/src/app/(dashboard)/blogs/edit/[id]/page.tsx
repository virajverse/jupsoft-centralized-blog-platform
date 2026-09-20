import dynamic from 'next/dynamic';

const BlogEditor = dynamic(
  () => import('../../../../../components/editor/BlogEditor').then((mod) => mod.BlogEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading Editor Workspace...</span>
        </div>
      </div>
    ),
  }
);

export const metadata = {
  title: 'Edit Blog | Jupsoft CMS',
  description: 'Edit and optimize an existing article',
};

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyEditBlogPage({ params }: EditBlogPageProps) {
  const resolvedParams = await params;
  return <BlogEditor blogId={resolvedParams.id} />;
}
