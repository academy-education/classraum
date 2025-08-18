"use client"

import { ParentsPage } from '@/components/ui/parents-page'
import { useAuth } from '@/contexts/AuthContext'

export default function ParentPage() {
  const { academyId } = useAuth()
  
  return <ParentsPage academyId={academyId} />
}
