"use client"

import React from 'react'
import { PaymentsPage } from '@/components/ui/payments-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { AuthGuard } from '@/components/ui/auth-guard'

const PaymentPageComponent = React.memo(() => {
  const authData = usePageWithAuth('academyId')

  return (
    <AuthGuard
      isLoading={authData.isLoading}
      hasError={(authData as any).hasError}
      errorMessage={(authData as any).errorMessage}
    >
      <PaymentsPage academyId={authData.academyId!} />
    </AuthGuard>
  )
})

PaymentPageComponent.displayName = 'PaymentPage'

export default withErrorBoundary(PaymentPageComponent)
