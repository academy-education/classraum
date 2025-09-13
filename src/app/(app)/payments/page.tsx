"use client"

import React from 'react'
import { PaymentsPage } from '@/components/ui/payments-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const PaymentPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <PaymentsPage academyId={academyId} />
})

PaymentPageComponent.displayName = 'PaymentPage'

export default withErrorBoundary(PaymentPageComponent)
