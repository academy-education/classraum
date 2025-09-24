"use client"

import React from 'react'
import { SessionsPage } from '@/components/ui/sessions-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useSearchParams, useRouter } from 'next/navigation'

const SessionPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')
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
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <SessionsPage
        academyId={authData.academyId!}
        filterClassroomId={classroomId || undefined}
        onNavigateToAssignments={handleNavigateToAssignments}
        onNavigateToAttendance={handleNavigateToAttendance}
      />
    </AuthGuard>
  )
})

SessionPageComponent.displayName = 'SessionPage'

export default withErrorBoundary(SessionPageComponent)
