import { SettingsView } from '../../../components/settings/SettingsView';

export const metadata = {
  title: 'Tenant Settings & Webhooks | Jupsoft CMS',
  description: 'Manage website API keys, domains, S3 prefixes, and ISR revalidation webhooks',
};

export default function SettingsPage() {
  return <SettingsView />;
}
