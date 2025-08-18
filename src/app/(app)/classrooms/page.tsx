"use client"

import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { useAuth } from '@/contexts/AuthContext'

export default function ClassroomPage() {
  const { academyId } = useAuth()
  
  return <ClassroomsPage academyId={academyId} />
}
