"use client"

import React from 'react'
import { TeachersPage } from '@/components/ui/teachers-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const TeacherPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  
  return <TeachersPage academyId={academyId} />
})

TeacherPageComponent.displayName = 'TeacherPage'

export default withErrorBoundary(TeacherPageComponent)
