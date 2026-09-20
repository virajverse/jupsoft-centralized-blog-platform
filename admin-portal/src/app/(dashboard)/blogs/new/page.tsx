import dynamic from 'next/dynamic';

const BlogEditor = dynamic(
  () => import('../../../../components/editor/BlogEditor').then((mod) => mod.BlogEditor),
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
  title: 'New Blog | Jupsoft CMS',
  description: 'Draft a new multi-language blog with real-time SEO auditing',
};

export default function NewBlogPage() {
  return <BlogEditor blogId={null} />;
}
