import { BlogEditor } from '../../../../components/editor/BlogEditor';

export const metadata = {
  title: 'Edit Article | Jupsoft CMS',
  description: 'Edit and optimize an existing article',
};

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const resolvedParams = await params;
  return <BlogEditor blogId={resolvedParams.id} />;
}
