"use client"

import React from 'react'
import { UpgradePage } from '@/components/ui/upgrade-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const UpgradePageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <UpgradePage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

UpgradePageComponent.displayName = 'UpgradePage'

export default withErrorBoundary(UpgradePageComponent)
