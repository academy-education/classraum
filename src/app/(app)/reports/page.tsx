"use client"

import React from 'react'
import { default as ReportsPage } from '@/components/ui/reports-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const ReportPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <ReportsPage academyId={academyId} />
})

ReportPageComponent.displayName = 'ReportPage'

export default withErrorBoundary(ReportPageComponent)
