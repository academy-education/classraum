"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  classroom_name: string
  classroom_color: string
  status: string
  location: string
}

interface TodaysSessionsProps {
  sessions: Session[]
  loading?: boolean
}

export const TodaysSessions = React.memo<TodaysSessionsProps>(function TodaysSessions({ sessions, loading = false }: TodaysSessionsProps) {
  const router = useRouter()
  const { t } = useTranslation()
  
  const handleNavigateToTodaySessions = () => {
    router.push('/sessions')
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div>
                <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t("dashboard.sessionToday")}</h3>
            <p className="text-sm text-gray-600">{t("dashboard.checkYourSchedule")}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleNavigateToTodaySessions}
          className="text-blue-600 hover:text-blue-700"
        >
          {t("dashboard.viewAllSessions")}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Clock className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-base font-medium">{t("dashboard.noSessionsToday")}</p>
          <p className="text-sm mt-1">{t("dashboard.takeABreakOrPlan")}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push('/sessions')}
          >
            {t("dashboard.scheduleSession")}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={handleNavigateToTodaySessions}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: session.classroom_color }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.classroom_name}</p>
                  <p className="text-xs text-gray-500">
                    {session.start_time} - {session.end_time}
                    {session.location && (
                      <span className="ml-2">
                        • {session.location === 'online' ? t("sessions.online") : t("sessions.offline")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  session.status === 'completed' ? 'bg-green-100 text-green-800' :
                  session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {t(`sessions.${session.status}`)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
})