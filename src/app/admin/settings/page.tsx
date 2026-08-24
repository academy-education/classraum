import { Metadata } from 'next';
import { SettingsDashboard } from '@/components/admin/settings/SettingsDashboard';

export const metadata: Metadata = {
  title: 'My account - Classraum Admin',
  description: 'Your admin profile and the permissions granted to your role',
};

export default function SettingsPage() {
  return <SettingsDashboard />;
}