import { Metadata } from 'next';
import { ActivityLogsManagement } from '@/components/admin/activity-logs/ActivityLogsManagement';

export const metadata: Metadata = {
  title: 'Activity Logs - Classraum Admin',
  description: 'Audit trail of admin actions across the platform',
};

export default function Page() {
  return <ActivityLogsManagement />;
}
