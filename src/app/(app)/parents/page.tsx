"use client"

import React from 'react'
import { ParentsPage } from '@/components/ui/parents-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const ParentPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <ParentsPage academyId={academyId} />
})

ParentPageComponent.displayName = 'ParentPage'

export default withErrorBoundary(ParentPageComponent)
