"use client"

import React from 'react'
import { ArchivePage } from '@/components/ui/archive-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const ArchivePageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <ArchivePage academyId={academyId} />
})

ArchivePageComponent.displayName = 'ArchivePage'

export default withErrorBoundary(ArchivePageComponent)