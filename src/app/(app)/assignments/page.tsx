"use client"

import React from 'react'
import { AssignmentsPage } from '@/components/ui/assignments-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useSearchParams } from 'next/navigation'

const AssignmentPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <AssignmentsPage
        academyId={authData.academyId!}
        filterSessionId={sessionId || undefined}
      />
    </AuthGuard>
  )
})

AssignmentPageComponent.displayName = 'AssignmentPage'

export default withErrorBoundary(AssignmentPageComponent)
