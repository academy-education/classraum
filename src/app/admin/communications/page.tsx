import { Metadata } from 'next';
import { CommunicationsDashboard } from '@/components/admin/communications/CommunicationsDashboard';

export const metadata: Metadata = {
  title: 'Communications - Classraum Admin',
  description: 'Manage system announcements, notifications, and messaging',
};

export default function CommunicationsPage() {
  return <CommunicationsDashboard />;
}