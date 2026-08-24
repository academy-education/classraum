import { Metadata } from 'next';
import { SubscriptionUsageMonitoring } from '@/components/admin/subscription-usage/SubscriptionUsageMonitoring';

export const metadata: Metadata = {
  title: 'Usage Monitoring - Classraum Admin',
  description: 'Track subscription usage against plan limits',
};

export default function Page() {
  return <SubscriptionUsageMonitoring />;
}
