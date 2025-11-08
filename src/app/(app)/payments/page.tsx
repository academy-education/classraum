"use client"

import React from 'react'
import { PaymentsPage } from '@/components/ui/payments-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'

const PaymentPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <RoleBasedAuthWrapper
      allowedRoles={['manager']}
      redirectTo="/classrooms"
    >
      <AuthGuard
        isLoading={authData.isLoading}
        hasError={(authData as any).hasError}
        errorMessage={(authData as any).errorMessage}
      >
        {authData.academyId && <PaymentsPage academyId={authData.academyId} />}
      </AuthGuard>
    </RoleBasedAuthWrapper>
  )
})

PaymentPageComponent.displayName = 'PaymentPage'

export default withErrorBoundary(PaymentPageComponent)
