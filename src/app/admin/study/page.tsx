import { Metadata } from 'next';
import { StudyAdmin } from '@/components/admin/study/StudyAdmin';

export const metadata: Metadata = {
  title: 'Study — Classraum Admin',
  description: 'Study-mode user lookup and question-report review queue',
};

export default function StudyAdminPage() {
  return <StudyAdmin />;
}
