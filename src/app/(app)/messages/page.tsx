"use client"

import React from 'react'
import { MessagesPage } from '@/components/ui/messages/MessagesPage'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'

const MessagesPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <RoleBasedAuthWrapper
      allowedRoles={['manager', 'teacher', 'student', 'parent']}
      redirectTo="/dashboard"
    >
      <AuthGuard
        isLoading={authData.isLoading}
        hasError={(authData as any).hasError}
        errorMessage={(authData as any).errorMessage}
      >
        <MessagesPage />
      </AuthGuard>
    </RoleBasedAuthWrapper>
  )
})

MessagesPageComponent.displayName = 'MessagesPageComponent'

export default withErrorBoundary(MessagesPageComponent)
