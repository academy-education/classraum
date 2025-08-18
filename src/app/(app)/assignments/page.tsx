"use client"

import { AssignmentsPage } from '@/components/ui/assignments-page'
import { useAuth } from '@/contexts/AuthContext'

export default function AssignmentPage() {
  const { academyId } = useAuth()
  
  return <AssignmentsPage academyId={academyId} />
}
