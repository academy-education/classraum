"use client"

import { NotificationsPage } from '@/components/ui/notifications-page'
import { useAuth } from '@/contexts/AuthContext'

export default function NotificationPage() {
  const { userId } = useAuth()
  
  return <NotificationsPage userId={userId} />
}
