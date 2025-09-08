import { Metadata } from 'next';
import { SupportManagement } from '@/components/admin/support/SupportManagement';

export const metadata: Metadata = {
  title: 'Support Management - Classraum Admin',
  description: 'Manage customer support tickets and communications',
};

export default function SupportPage() {
  return <SupportManagement />;
}