"use client"

import { SessionsPage } from '@/components/ui/sessions-page'
import { useAuth } from '@/contexts/AuthContext'

export default function SessionPage() {
  const { academyId } = useAuth()
  
  return <SessionsPage academyId={academyId} />
}
