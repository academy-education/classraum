import { Metadata } from 'next';
import { AcademyManagement } from '@/components/admin/academies/AcademyManagement';

export const metadata: Metadata = {
  title: 'Academy Management - Classraum Admin',
  description: 'Manage academy accounts and settings',
};

export default function AcademiesPage() {
  return <AcademyManagement />;
}