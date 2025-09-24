"use client"

import React from 'react'
import { NotificationsPage } from '@/components/ui/notifications-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const NotificationPageComponent = React.memo(() => {
  const authData = usePageWithAuth('userId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <NotificationsPage userId={authData.userId!} />
    </AuthGuard>
  )
})

NotificationPageComponent.displayName = 'NotificationPage'

export default withErrorBoundary(NotificationPageComponent)
