"use client"

import React from 'react'
import { SettingsPage } from '@/components/ui/settings-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const SettingPageComponent = React.memo(() => {
  const authData = usePageWithAuth('userId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <SettingsPage userId={authData.userId!} />
    </AuthGuard>
  )
})

SettingPageComponent.displayName = 'SettingPage'

export default withErrorBoundary(SettingPageComponent)
