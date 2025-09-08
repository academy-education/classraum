import { Metadata } from 'next';
import { AdminLayout } from '@/components/admin/AdminLayout';

export const metadata: Metadata = {
  title: 'Classraum Admin Dashboard',
  description: 'Admin dashboard for managing Classraum platform',
};

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}