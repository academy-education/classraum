"use client"

import React from 'react'
import { SessionsPage } from '@/components/ui/sessions-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { useSearchParams, useRouter } from 'next/navigation'

const SessionPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
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
})

SessionPageComponent.displayName = 'SessionPage'

export default withErrorBoundary(SessionPageComponent)
