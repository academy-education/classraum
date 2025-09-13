"use client"

import React from 'react'
import { NotificationsPage } from '@/components/ui/notifications-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const NotificationPageComponent = React.memo(() => {
  const { userId } = usePageWithAuth('userId')
  
  return <NotificationsPage userId={userId} />
})

NotificationPageComponent.displayName = 'NotificationPage'

export default withErrorBoundary(NotificationPageComponent)
