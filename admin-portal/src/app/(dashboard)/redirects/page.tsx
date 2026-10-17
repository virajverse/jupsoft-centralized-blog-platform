import { redirect } from 'next/navigation';

export default function RedirectsPage() {
  redirect('/settings?tab=redirects');
}
