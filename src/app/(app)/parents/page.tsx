"use client"

import React from 'react'
import { ParentsPage } from '@/components/ui/parents-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const ParentPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <ParentsPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

ParentPageComponent.displayName = 'ParentPage'

export default withErrorBoundary(ParentPageComponent)
