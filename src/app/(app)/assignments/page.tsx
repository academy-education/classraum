"use client"

import { AssignmentsPage } from '@/components/ui/assignments-page'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'

export default function AssignmentPage() {
  const { academyId } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  
  return (
    <AssignmentsPage 
      academyId={academyId} 
      filterSessionId={sessionId || undefined}
    />
  )
}
