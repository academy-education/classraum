"use client"

import { default as ReportsPage } from '@/components/ui/reports-page'
import { useAuth } from '@/contexts/AuthContext'

export default function ReportPage() {
  const { academyId } = useAuth()
  
  return <ReportsPage academyId={academyId} />
}
