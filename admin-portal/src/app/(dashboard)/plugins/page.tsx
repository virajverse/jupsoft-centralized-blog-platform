import { redirect } from 'next/navigation';

export default function PluginsPage() {
  redirect('/users?tab=matrix');
}
