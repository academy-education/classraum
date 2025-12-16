"use client"

import React from 'react'
import { AnnouncementsPage } from '@/components/ui/announcements-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const AnnouncementsPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <AnnouncementsPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

AnnouncementsPageComponent.displayName = 'AnnouncementsPage'

export default withErrorBoundary(AnnouncementsPageComponent)
