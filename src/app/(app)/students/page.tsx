"use client"

import React from 'react'
import { StudentsPage } from '@/components/ui/students-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const StudentPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <StudentsPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

StudentPageComponent.displayName = 'StudentPage'

export default withErrorBoundary(StudentPageComponent)