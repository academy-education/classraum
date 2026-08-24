import { Metadata } from 'next';
import { WebhookEventViewer } from '@/components/admin/webhooks/WebhookEventViewer';

export const metadata: Metadata = {
  title: 'Webhook Events - Classraum Admin',
  description: 'Inspect PortOne webhook deliveries and their payloads',
};

export default function Page() {
  return <WebhookEventViewer />;
}
