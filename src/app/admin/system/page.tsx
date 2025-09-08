import { Metadata } from 'next';
import { SystemDashboard } from '@/components/admin/system/SystemDashboard';

export const metadata: Metadata = {
  title: 'System Management - Classraum Admin',
  description: 'Monitor system health, logs, and maintenance tools',
};

export default function SystemPage() {
  return <SystemDashboard />;
}