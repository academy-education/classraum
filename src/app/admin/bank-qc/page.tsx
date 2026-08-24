import { Metadata } from 'next';
import { BankQcDashboard } from '@/components/admin/bank-qc/BankQcDashboard';

export const metadata: Metadata = {
  title: 'Bank QC - Classraum Admin',
  description: 'How question batches are built, checked and signed off',
};

export default function BankQcPage() {
  return <BankQcDashboard />;
}
