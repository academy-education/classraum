"use client"

import React, { use } from 'react'
import { LevelTestDetail } from '@/components/ui/level-tests/LevelTestDetail'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'

interface PageProps {
  params: Promise<{ id: string }>
}

const LevelTestDetailPageComponent = React.memo(({ params }: PageProps) => {
  const { id } = use(params)
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
        {authData.academyId && <LevelTestDetail academyId={authData.academyId} testId={id} />}
      </AuthGuard>
    </RoleBasedAuthWrapper>
  )
})

LevelTestDetailPageComponent.displayName = 'LevelTestDetailPage'

export default withErrorBoundary(LevelTestDetailPageComponent)
