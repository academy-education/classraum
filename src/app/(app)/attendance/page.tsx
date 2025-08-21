"use client"

import { AttendancePage } from '@/components/ui/attendance-page'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'

export default function AttendancePageComponent() {
  const { academyId } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  
  return (
    <AttendancePage 
      academyId={academyId} 
      filterSessionId={sessionId || undefined}
    />
  )
}
