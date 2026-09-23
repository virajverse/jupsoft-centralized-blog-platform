import { ClientBlogEditor } from '../../../../components/editor/ClientBlogEditor';

export const metadata = {
  title: 'New Blog | Jupsoft CMS',
  description: 'Draft a new multi-language blog with real-time SEO auditing',
};

export default function NewBlogPage() {
  return <ClientBlogEditor blogId={null} />;
}
