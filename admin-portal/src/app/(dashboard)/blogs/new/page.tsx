import { BlogEditor } from '../../../../components/editor/BlogEditor';

export const metadata = {
  title: 'New Blog | Jupsoft CMS',
  description: 'Draft a new multi-language blog with real-time SEO auditing',
};

export default function NewBlogPage() {
  return <BlogEditor blogId={null} />;
}
