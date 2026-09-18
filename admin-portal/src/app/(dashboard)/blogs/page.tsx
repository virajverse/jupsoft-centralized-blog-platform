import { BlogList } from '../../../components/blogs/BlogList';

export const metadata = {
  title: 'Blogs | Jupsoft CMS',
  description: 'Manage, search, and filter multi-tenant blogs across all connected websites',
};

export default function BlogsPage() {
  return <BlogList />;
}
