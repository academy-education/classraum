"use client"

import { UpgradePage } from '@/components/ui/upgrade-page'
import { useAuth } from '@/contexts/AuthContext'

export default function UpgradePageComponent() {
  const { academyId } = useAuth()
  
  return <UpgradePage academyId={academyId} />
}
