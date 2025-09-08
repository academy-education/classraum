import { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Classraum',
  description: 'Classraum admin dashboard with platform overview and key metrics',
};

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}