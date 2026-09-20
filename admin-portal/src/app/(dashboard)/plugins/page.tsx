import { PluginManagerView } from '../../../components/plugins/PluginManagerView';

export const metadata = {
  title: 'Plugins & Modular Functions | Jupsoft CMS',
  description: 'Centralized admin authority to toggle platform modules and manage custom plugins',
};

export default function PluginsPage() {
  return <PluginManagerView />;
}
