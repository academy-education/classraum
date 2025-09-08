import { Metadata } from 'next';
import { SettingsDashboard } from '@/components/admin/settings/SettingsDashboard';

export const metadata: Metadata = {
  title: 'Settings - Classraum Admin',
  description: 'Configure system settings, integrations, and preferences',
};

export default function SettingsPage() {
  return <SettingsDashboard />;
}