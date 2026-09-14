import React from 'react';
import { RedirectsView } from '../../../components/redirects/RedirectsView';

export const metadata = {
  title: '301 Permanent Redirects Manager | Jupsoft CMS',
  description: 'Manage SEO 301 redirects, track forwarding hit counts, and eliminate 404 broken links.',
};

export default function RedirectsPage() {
  return <RedirectsView />;
}
