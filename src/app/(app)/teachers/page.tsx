"use client"

import { TeachersPage } from '@/components/ui/teachers-page'
import { useAuth } from '@/contexts/AuthContext'

export default function TeacherPage() {
  const { academyId } = useAuth()
  
  return <TeachersPage academyId={academyId} />
}
