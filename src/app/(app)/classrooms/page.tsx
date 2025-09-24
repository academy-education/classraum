"use client"

import React from 'react'
import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useRouter } from 'next/navigation'

const ClassroomPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')
  const router = useRouter()

  const handleNavigateToSessions = (classroomId?: string) => {
    if (classroomId) {
      router.push(`/sessions?classroomId=${classroomId}`)
    } else {
      router.push('/sessions')
    }
  }

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <ClassroomsPage
        academyId={authData.academyId!}
        onNavigateToSessions={handleNavigateToSessions}
      />
    </AuthGuard>
  )
})

ClassroomPageComponent.displayName = 'ClassroomPage'

export default withErrorBoundary(ClassroomPageComponent)
