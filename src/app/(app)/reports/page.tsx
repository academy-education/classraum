"use client"

import React from 'react'
import { default as ReportsPage } from '@/components/ui/reports-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const ReportPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <ReportsPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

ReportPageComponent.displayName = 'ReportPage'

export default withErrorBoundary(ReportPageComponent)
