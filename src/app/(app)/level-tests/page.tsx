"use client"

import React from 'react'
import { LevelTestsPage } from '@/components/ui/level-tests-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'

const LevelTestsPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <RoleBasedAuthWrapper
      allowedRoles={['manager']}
      redirectTo="/classrooms"
    >
      <AuthGuard
        isLoading={authData.isLoading}
        hasError={(authData as { hasError?: boolean }).hasError}
        errorMessage={(authData as { errorMessage?: string }).errorMessage}
      >
        {authData.academyId && <LevelTestsPage academyId={authData.academyId} />}
      </AuthGuard>
    </RoleBasedAuthWrapper>
  )
})

LevelTestsPageComponent.displayName = 'LevelTestsPage'

export default withErrorBoundary(LevelTestsPageComponent)
