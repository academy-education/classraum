import { Metadata } from 'next';
import { SubscriptionManagement } from '@/components/admin/subscriptions/SubscriptionManagement';

export const metadata: Metadata = {
  title: 'Subscription Management - Classraum Admin',
  description: 'Manage subscriptions, billing, and revenue analytics',
};

export default function SubscriptionsPage() {
  return <SubscriptionManagement />;
}