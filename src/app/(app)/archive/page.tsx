"use client"

import { ArchivePage } from '@/components/ui/archive-page'
import { useAuth } from '@/contexts/AuthContext'

export default function Archive() {
  const { academyId } = useAuth()
  
  return <ArchivePage academyId={academyId} />
}