"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatsCard, TodaysSessions, RecentActivity } from '@/app/(app)/dashboard/components'
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

const SAMPLE_SESSIONS = [
  {
    id: 'demo-s1',
    date: new Date(2026, 5, 18).toISOString().slice(0, 10),
    start_time: '16:00',
    end_time: '17:30',
    classroom_name: 'Grade 4 Math',
    classroom_color: '#3b82f6',
    status: 'scheduled',
    location: 'offline',
    pending_attendance_count: 0,
  },
  {
    id: 'demo-s2',
    date: new Date(2026, 5, 18).toISOString().slice(0, 10),
    start_time: '17:30',
    end_time: '19:00',
    classroom_name: 'SAT Prep',
    classroom_color: '#10b981',
    status: 'scheduled',
    location: 'offline',
    pending_attendance_count: 3,
  },
  {
    id: 'demo-s3',
    date: new Date(2026, 5, 18).toISOString().slice(0, 10),
    start_time: '18:30',
    end_time: '20:00',
    classroom_name: 'Grade 5 English',
    classroom_color: '#f59e0b',
    status: 'scheduled',
    location: 'online',
    pending_attendance_count: 0,
  },
]

export function DashboardDemo() {
  const { t, language } = useTranslation()

  // Stable demo timestamps relative to the most recent 6/18/2026 anchor
  // (the date the rest of the demo data is fixed to). Computing once
  // keeps server + client renders identical.
  const activities = useMemo(() => {
    const base = new Date(2026, 5, 18, 12, 0, 0).getTime()
    return [
      {
        id: 'demo-a1',
        title: String(t('dashboard.paymentReceived')),
        description: 'Alice Park — ₩320,000',
        timestamp: new Date(base - 1000 * 60 * 12).toISOString(),
        type: 'billing',
        navigationData: null,
      },
      {
        id: 'demo-a2',
        title: String(t('dashboard.pendingAttendanceCount', { count: 3 })),
        description: 'Grade 4 Math',
        timestamp: new Date(base - 1000 * 60 * 60).toISOString(),
        type: 'attendance',
        navigationData: null,
      },
      {
        id: 'demo-a3',
        title: String(t('navigation.announcements')),
        description: 'Holiday closure — Mar 1',
        timestamp: new Date(base - 1000 * 60 * 60 * 4).toISOString(),
        type: 'alert',
        navigationData: null,
      },
    ]
  }, [t])

  // Match the real dashboard's period strings (see app/(app)/dashboard/page.tsx).
  const monthPeriod = language === 'korean' ? '지난달 대비' : 'from last month'
  const weekPeriod = language === 'korean' ? '지난 주 대비' : 'from last week'
  const thisMonth = language === 'korean' ? '이번 달' : 'this month'

  return (
    <NonFunctional>
      <div className="my-6 space-y-4">
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
          <TodaysSessions sessions={SAMPLE_SESSIONS} />
          <RecentActivity activities={activities} />
        </div>
      </div>
    </NonFunctional>
  )
}
