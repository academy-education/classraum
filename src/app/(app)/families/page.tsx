"use client"

import { FamiliesPage } from '@/components/ui/families-page'
import { useAuth } from '@/contexts/AuthContext'

export default function FamilyPage() {
  const { academyId } = useAuth()
  
  return <FamiliesPage academyId={academyId} />
}
