"use client"

import { StudentsPage } from '@/components/ui/students-page'
import { useAuth } from '@/contexts/AuthContext'

export default function StudentPage() {
  const { academyId } = useAuth()
  
  return <StudentsPage academyId={academyId} />
}