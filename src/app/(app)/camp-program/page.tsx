"use client"

// NOTE: this app page lives at /camp-program, not /camp — /camp is the
// public marketing page (src/app/camp/page.tsx), and route groups do not
// add a URL segment, so (app)/camp would collide with it at build time.

import React from 'react'
import { CampPage } from '@/components/ui/camp/CampPage'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const CampProgramPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as { hasError?: boolean }).hasError}
      errorMessage={(authData as { errorMessage?: string }).errorMessage}
    >
      <CampPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

CampProgramPageComponent.displayName = 'CampProgramPage'

export default withErrorBoundary(CampProgramPageComponent)
