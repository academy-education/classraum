"use client"

import React from 'react'
import { StudentsPage } from '@/components/ui/students-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const StudentPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <StudentsPage academyId={academyId} />
})

StudentPageComponent.displayName = 'StudentPage'

export default withErrorBoundary(StudentPageComponent)