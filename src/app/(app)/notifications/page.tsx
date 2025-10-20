"use client"

import React, { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { NotificationsPage } from '@/components/ui/notifications-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const NotificationPageComponent = React.memo(() => {
  const authData = usePageWithAuth('userId')
  const router = useRouter()

  const handleNavigate = useCallback((page: string, filters?: { classroomId?: string; sessionId?: string }) => {
    if (page) {
      router.push(`/${page}`)
    }
  }, [router])

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <NotificationsPage
        userId={authData.userId!}
        onNavigate={handleNavigate}
      />
    </AuthGuard>
  )
})

NotificationPageComponent.displayName = 'NotificationPage'

export default withErrorBoundary(NotificationPageComponent)
