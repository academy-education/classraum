"use client"

import { SettingsPage } from '@/components/ui/settings-page'
import { useAuth } from '@/contexts/AuthContext'

export default function SettingPage() {
  const { userId } = useAuth()
  
  return <SettingsPage userId={userId} />
}
