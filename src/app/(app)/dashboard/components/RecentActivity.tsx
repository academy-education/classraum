"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Activity, 
  ChevronRight, 
  Calendar, 
  Users, 
  CreditCard, 
  AlertCircle, 
  BookOpen, 
  Bell 
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'

interface RecentActivityItem {
  id: string
  title: string
  description: string
  timestamp: string
  type?: string
  navigationData?: {
    page?: string
    filters?: Record<string, unknown>
  } | null
}

interface RecentActivityProps {
  activities: RecentActivityItem[]
  loading?: boolean
  onActivityClick?: (activity: RecentActivityItem) => void
}

// Get notification icon based on type - Updated to match notifications page styling
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'session':
      return <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
    case 'attendance':
      return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
    case 'billing':
      return <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
    case 'alert':
      return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
    case 'assignment':
      return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
    default:
      return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
  }
}

export const RecentActivity = React.memo<RecentActivityProps>(function RecentActivity({ 
  activities, 
  loading = false, 
  onActivityClick 
}: RecentActivityProps) {
  const router = useRouter()
  const { t } = useTranslation()
  
  const handleActivityClick = (activity: RecentActivityItem) => {
    if (onActivityClick) {
      onActivityClick(activity)
    } else if (activity.navigationData?.page) {
      router.push(activity.navigationData.page)
    }
  }

  if (loading) {
    return (
      <Card className="p-4 sm:p-6 h-full">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden py-0 gap-0">
      {/* Header — eyebrow style to match the four graph cards. */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
          </div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 truncate">{t("dashboard.recentActivity")}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/notifications')}
          className="text-primary hover:text-primary/80"
        >
          {t("dashboard.viewAll")}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={String(t("dashboard.noRecentActivity"))}
            size="sm"
            variant="subtle"
          />
        ) : (
          <div className="space-y-3 p-4 sm:px-6 sm:pt-5 sm:pb-5">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleActivityClick(activity)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(activity.type || 'default')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
})