"use client"

import React from 'react'
import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'
import { useRouter } from 'next/navigation'

const ClassroomPageComponent = React.memo(() => {
  const { academyId } = usePageWithAuth('academyId')
  const router = useRouter()
  
  const handleNavigateToSessions = (classroomId?: string) => {
    if (classroomId) {
      router.push(`/sessions?classroomId=${classroomId}`)
    } else {
      router.push('/sessions')
    }
  }
  
  return (
    <ClassroomsPage 
      academyId={academyId} 
      onNavigateToSessions={handleNavigateToSessions}
    />
  )
})

ClassroomPageComponent.displayName = 'ClassroomPage'

export default withErrorBoundary(ClassroomPageComponent)
