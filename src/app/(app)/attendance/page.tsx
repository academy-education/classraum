"use client"

import React from 'react'
import { AttendancePage } from '@/components/ui/attendance-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { useSearchParams } from 'next/navigation'

const AttendancePageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  
  return (
    <AttendancePage 
      academyId={academyId} 
      filterSessionId={sessionId || undefined}
    />
  )
})

AttendancePageComponent.displayName = 'AttendancePage'

export default withErrorBoundary(AttendancePageComponent)
