import { Metadata } from 'next';
import { SettlementManagement } from '@/components/admin/settlements/SettlementManagement';

export const metadata: Metadata = {
  title: 'Settlement Management - Classraum Admin',
  description: 'Track and manage partner settlements',
};

export default function SettlementsPage() {
  return <SettlementManagement />;
}
