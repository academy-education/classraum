"use client"

import { SessionsPage } from '@/components/ui/sessions-page'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'

export default function SessionPage() {
  const { academyId } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const classroomId = searchParams.get('classroomId')
  
  const handleNavigateToAssignments = (sessionId: string) => {
    router.push(`/assignments?sessionId=${sessionId}`)
  }
  
  const handleNavigateToAttendance = (sessionId: string) => {
    router.push(`/attendance?sessionId=${sessionId}`)
  }
  
  return (
    <SessionsPage 
      academyId={academyId} 
      filterClassroomId={classroomId || undefined}
      onNavigateToAssignments={handleNavigateToAssignments}
      onNavigateToAttendance={handleNavigateToAttendance}
    />
  )
}
