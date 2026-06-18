"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatsCard, TodaysSessions, RecentActivity } from '@/app/(app)/dashboard/components'
import { Button } from '@/components/ui/button'
import { AlertCircle, Settings2 } from 'lucide-react'
import { getTodaysSessions, getClassrooms } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Renders the real Dashboard sub-components (StatsCard, TodaysSessions,
 * RecentActivity) with sample data, wrapped in NonFunctional so clicks
 * don't navigate away. This is the same layout the live Dashboard uses
 * for managers/owners — visually identical, just powered by stub data
 * instead of supabase hooks.
 *
 * Stat titles, growth period strings, and activity entries all flow
 * through t() so the demo flips to Korean whenever the rest of the app
 * does. Sample names ("Grade 4 Math", "Alice Park") and money amounts
 * stay literal — same as the live dashboard would when those records
 * happened to be named in that language.
 *
 * Maintenance: when StatsCard/TodaysSessions/RecentActivity grow new
 * props, TypeScript will flag this file.
 */

const TREND = Array.from({ length: 14 }, (_, i) => ({
  day: i,
  value: 30 + Math.round(20 * Math.sin(i / 2) + i * 2),
}))

export function DashboardDemo() {
  const { t, language } = useTranslation()

  const sessions = useMemo(() => getTodaysSessions(language), [language])

  // Stable demo timestamps relative to the most recent 6/18/2026 anchor
  // (the date the rest of the demo data is fixed to). Computing once
  // keeps server + client renders identical.
  const activities = useMemo(() => {
    const base = new Date(2026, 5, 18, 12, 0, 0).getTime()
    const c = getClassrooms(language)
    const studentName = language === 'korean' ? '박앨리스' : 'Alice Park'
    return [
      {
        id: 'demo-a1',
        title: String(t('dashboard.paymentReceived')),
        description: `${studentName} — ₩320,000`,
        timestamp: new Date(base - 1000 * 60 * 12).toISOString(),
        type: 'billing',
        navigationData: null,
      },
      {
        id: 'demo-a2',
        title: String(t('dashboard.pendingAttendanceCount', { count: 3 })),
        description: c[0].name,
        timestamp: new Date(base - 1000 * 60 * 60).toISOString(),
        type: 'attendance',
        navigationData: null,
      },
      {
        id: 'demo-a3',
        title: String(t('navigation.announcements')),
        description: language === 'korean' ? '3월 1일 휴원 안내' : 'Holiday closure — Mar 1',
        timestamp: new Date(base - 1000 * 60 * 60 * 4).toISOString(),
        type: 'alert',
        navigationData: null,
      },
    ]
  }, [t, language])

  // Match the real dashboard's period strings (see app/(app)/dashboard/page.tsx).
  const monthPeriod = language === 'korean' ? '지난달 대비' : 'from last month'
  const weekPeriod = language === 'korean' ? '지난 주 대비' : 'from last week'
  const thisMonth = language === 'korean' ? '이번 달' : 'this month'

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] space-y-4">
        {/* Page Header — mirrors app/(app)/dashboard/page.tsx:406 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
              {String(t('eyebrows.dashboard'))}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              {String(t('dashboard.title'))}
            </h1>
            <p className="text-gray-500 mt-1">{String(t('dashboard.description'))}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {String(t('dashboard.assignmentsAwaitingGrades', { count: 29 }))}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <Settings2 className="w-4 h-4" />
            {String(t('dashboard.editMode.customize'))}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            title={String(t('dashboard.revenueThisMonth'))}
            value="₩ 8,420,000"
            growth={{ percentage: 12, isPositive: true, showGrowth: true, period: monthPeriod }}
            trendData={TREND}
            trendColor="#3b82f6"
            icon="revenue"
          />
          <StatsCard
            title={String(t('dashboard.allActiveUsers'))}
            value="47"
            growth={{ percentage: 4, isPositive: true, showGrowth: true, period: thisMonth, isUserCount: true }}
            trendData={TREND}
            trendColor="#10b981"
            icon="users"
          />
          <StatsCard
            title={String(t('dashboard.allClassrooms'))}
            value="8"
            icon="classrooms"
          />
          <StatsCard
            title={String(t('dashboard.activeSessionsThisWeek'))}
            value="24"
            growth={{ percentage: 2, isPositive: false, showGrowth: true, period: weekPeriod }}
            trendData={TREND.map(p => ({ ...p, value: p.value / 2 }))}
            trendColor="#f59e0b"
            icon="sessions"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TodaysSessions sessions={sessions} />
          <RecentActivity activities={activities} />
        </div>
      </div>
    </NonFunctional>
  )
}
