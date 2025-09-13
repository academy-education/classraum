"use client"

import React from 'react'
import { UpgradePage } from '@/components/ui/upgrade-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const UpgradePageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <UpgradePage academyId={academyId} />
})

UpgradePageComponent.displayName = 'UpgradePage'

export default withErrorBoundary(UpgradePageComponent)
