import { Metadata } from 'next';
import { UserManagement } from '@/components/admin/users/UserManagement';

export const metadata: Metadata = {
  title: 'User Management - Classraum Admin',
  description: 'Manage user accounts, roles, and permissions',
};

export default function UsersPage() {
  return <UserManagement />;
}