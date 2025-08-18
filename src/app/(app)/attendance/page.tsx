"use client"

import { AttendancePage } from '@/components/ui/attendance-page'
import { useAuth } from '@/contexts/AuthContext'

export default function AttendancePageComponent() {
  const { academyId } = useAuth()
  
  return <AttendancePage academyId={academyId} />
}
