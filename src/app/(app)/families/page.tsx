"use client"

import React from 'react'
import { FamiliesPage } from '@/components/ui/families-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const FamilyPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <FamiliesPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

FamilyPageComponent.displayName = 'FamilyPage'

export default withErrorBoundary(FamilyPageComponent)
