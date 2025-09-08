import { Metadata } from 'next';
import { AnalyticsDashboard } from '@/components/admin/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - Classraum Admin',
  description: 'Revenue analytics, usage monitoring, and business intelligence',
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}