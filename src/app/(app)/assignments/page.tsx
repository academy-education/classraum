"use client"

import React from 'react'
import { AssignmentsPage } from '@/components/ui/assignments-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { useSearchParams } from 'next/navigation'

const AssignmentPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  
  return (
    <AssignmentsPage 
      academyId={academyId} 
      filterSessionId={sessionId || undefined}
    />
  )
})

AssignmentPageComponent.displayName = 'AssignmentPage'

export default withErrorBoundary(AssignmentPageComponent)
