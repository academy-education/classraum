"use client"

import React from 'react'
import { ArchivePage } from '@/components/ui/archive-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const ArchivePageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <ArchivePage academyId={authData.academyId} />
    </AuthGuard>
  )
})

ArchivePageComponent.displayName = 'ArchivePage'

export default withErrorBoundary(ArchivePageComponent)