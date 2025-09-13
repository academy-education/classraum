"use client"

import React from 'react'
import { FamiliesPage } from '@/components/ui/families-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const FamilyPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <FamiliesPage academyId={academyId} />
})

FamilyPageComponent.displayName = 'FamilyPage'

export default withErrorBoundary(FamilyPageComponent)
