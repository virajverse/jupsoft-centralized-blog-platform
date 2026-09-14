import { BlogList } from '../../../components/blogs/BlogList';

export const metadata = {
  title: 'Articles Repository | Jupsoft CMS',
  description: 'Manage, search, and filter multi-tenant articles across all connected websites',
};

export default function BlogsPage() {
  return <BlogList />;
}
