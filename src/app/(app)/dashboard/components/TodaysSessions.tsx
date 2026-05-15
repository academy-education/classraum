"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'

interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  classroom_name: string
  classroom_color: string
  status: string
  location: string
  /** Optional — present when the dashboard hook attaches it. */
  pending_attendance_count?: number
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

  // A session "needs attendance" when its status is `scheduled` AND it has at
  // least one pending attendance row. Cancelled / completed sessions aren't
  // counted even if pending rows exist (cleaning those up is a different flow).
  const needsAttendance = (s: Session) =>
    s.status === 'scheduled' && (s.pending_attendance_count ?? 0) > 0
  const sessionsNeedingAttendance = sessions.filter(needsAttendance)
  const totalPendingSessions = sessionsNeedingAttendance.length

  const handleNavigateToSession = (sessionId: string) => {
    // /attendance accepts filterSessionId as a URL param — narrows the view
    // to that single session's row, one click from the manager opening it.
    router.push(`/attendance?filterSessionId=${sessionId}`)
  }

  if (loading) {
    return (
      <Card className="p-4 sm:p-6 h-full">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
              <div>
                <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
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
    <Card className="h-full flex flex-col overflow-hidden py-0 gap-0">
      {/* Header — eyebrow style (small uppercase label + 7x7 icon) to match
          the four graph cards (StatsCard) on the same dashboard. */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
          </div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 truncate">{t("dashboard.sessionToday")}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Summary chip — visible only when there's actually unmarked
              attendance, jumps straight into the first such session. */}
          {totalPendingSessions > 0 && (
            <button
              type="button"
              onClick={() => handleNavigateToSession(sessionsNeedingAttendance[0].id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {String(t('dashboard.pendingAttendanceSummary', { count: totalPendingSessions }))}
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNavigateToTodaySessions}
            className="text-primary hover:text-primary/80"
          >
            {t("dashboard.viewAllSessions")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={String(t("dashboard.noSessionsToday"))}
            description={String(t("dashboard.takeABreakOrPlan"))}
            actionLabel={String(t("dashboard.scheduleSession"))}
            onAction={() => router.push('/sessions')}
            actionVariant="outline"
            size="sm"
            variant="subtle"
          />
        ) : (
          <div className="space-y-2 p-4 sm:px-6 sm:pt-5 sm:pb-5">
          {sessions.map((session) => {
            const pending = needsAttendance(session) ? (session.pending_attendance_count ?? 0) : 0
            // Click target depends on whether attendance still needs taking.
            // If yes → jump straight to that session in the attendance flow.
            // If no → existing behavior, /sessions list.
            const onCardClick = pending > 0
              ? () => handleNavigateToSession(session.id)
              : handleNavigateToTodaySessions
            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 ring-1 ring-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={onCardClick}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: session.classroom_color }}
                  ></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.classroom_name}</p>
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
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Pending-attendance pill — only on scheduled sessions
                      with at least one unmarked student. Renders before the
                      status pill so the eye catches the actionable bit first. */}
                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      {String(t('dashboard.pendingAttendanceCount', { count: pending }))}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    session.status === 'scheduled' ? 'bg-sky-50 text-sky-700' :
                    session.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {t(`sessions.${session.status}`)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>
    </Card>
  )
})