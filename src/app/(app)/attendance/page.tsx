"use client"

import React from 'react'
import { AttendancePage } from '@/components/ui/attendance-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { useSearchParams } from 'next/navigation'

const AttendancePageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <AttendancePage
        academyId={authData.academyId!}
        filterSessionId={sessionId || undefined}
      />
    </AuthGuard>
  )
})

AttendancePageComponent.displayName = 'AttendancePage'

export default withErrorBoundary(AttendancePageComponent)
