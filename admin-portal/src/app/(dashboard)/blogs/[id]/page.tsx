import { ClientBlogEditor } from '../../../../components/editor/ClientBlogEditor';

export const metadata = {
  title: 'Edit Blog | Jupsoft CMS',
  description: 'Edit and optimize an existing article',
};

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  const resolvedParams = await params;
  return <ClientBlogEditor blogId={resolvedParams.id} />;
}
