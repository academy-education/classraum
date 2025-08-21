"use client"

import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function ClassroomPage() {
  const { academyId } = useAuth()
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
}
