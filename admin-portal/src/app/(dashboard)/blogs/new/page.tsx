import { BlogEditor } from '../../../../components/editor/BlogEditor';

export const metadata = {
  title: 'New Article | Jupsoft CMS',
  description: 'Draft a new multi-language article with real-time SEO auditing',
};

export default function NewBlogPage() {
  return <BlogEditor blogId={null} />;
}
