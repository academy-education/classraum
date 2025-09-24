"use client"

import React from 'react'
import { TeachersPage } from '@/components/ui/teachers-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const TeacherPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <TeachersPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

TeacherPageComponent.displayName = 'TeacherPage'

export default withErrorBoundary(TeacherPageComponent)
