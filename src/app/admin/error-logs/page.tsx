import { Metadata } from 'next';
import { ErrorLogsDashboard } from '@/components/admin/error-logs/ErrorLogsDashboard';

export const metadata: Metadata = {
  title: 'Error Logs - Classraum Admin',
  description: 'Monitor and triage captured application errors',
};

export default function Page() {
  return <ErrorLogsDashboard />;
}
