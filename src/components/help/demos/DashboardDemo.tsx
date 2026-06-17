"use client"

import { StatsCard, TodaysSessions, RecentActivity } from '@/app/(app)/dashboard/components'
import { NonFunctional } from './NonFunctional'

/**
 * Renders the real Dashboard sub-components (StatsCard, TodaysSessions,
 * RecentActivity) with sample data, wrapped in NonFunctional so clicks
 * don't navigate away. This is the same layout the live Dashboard uses
 * for managers/owners — visually identical, just powered by stub data
 * instead of supabase hooks.
 *
 * Maintenance: when StatsCard/TodaysSessions/RecentActivity grow new
 * props, TypeScript will flag this file.
 */

const SAMPLE_SESSIONS = [
  {
    id: 'demo-s1',
    date: new Date().toISOString().slice(0, 10),
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
    date: new Date().toISOString().slice(0, 10),
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
    date: new Date().toISOString().slice(0, 10),
    start_time: '18:30',
    end_time: '20:00',
    classroom_name: 'Grade 5 English',
    classroom_color: '#f59e0b',
    status: 'scheduled',
    location: 'online',
    pending_attendance_count: 0,
  },
]

const SAMPLE_ACTIVITIES = [
  {
    id: 'demo-a1',
    title: 'New payment received',
    description: 'Alice Park — ₩320,000 (March tuition)',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    type: 'billing',
    navigationData: null,
  },
  {
    id: 'demo-a2',
    title: 'Pending attendance',
    description: 'Grade 4 Math — 3 students still need a status',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    type: 'attendance',
    navigationData: null,
  },
  {
    id: 'demo-a3',
    title: 'New announcement posted',
    description: 'Holiday closure — Mar 1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    type: 'alert',
    navigationData: null,
  },
]

const TREND = Array.from({ length: 14 }, (_, i) => ({
  day: i,
  value: 30 + Math.round(20 * Math.sin(i / 2) + i * 2),
}))

export function DashboardDemo() {
  return (
    <NonFunctional>
      <div className="my-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard
            title="Revenue (this month)"
            value="₩ 8,420,000"
            growth={{ percentage: 12, isPositive: true, showGrowth: true, period: 'vs. last month' }}
            trendData={TREND}
            trendColor="#3b82f6"
            icon="revenue"
          />
          <StatsCard
            title="Active students"
            value="47"
            growth={{ percentage: 4, isPositive: true, showGrowth: true, period: 'vs. last month', isUserCount: true }}
            trendData={TREND}
            trendColor="#10b981"
            icon="users"
          />
          <StatsCard
            title="Classrooms"
            value="8"
            icon="classrooms"
          />
          <StatsCard
            title="Sessions this week"
            value="24"
            growth={{ percentage: 2, isPositive: false, showGrowth: true, period: 'vs. last week' }}
            trendData={TREND.map(t => ({ ...t, value: t.value / 2 }))}
            trendColor="#f59e0b"
            icon="sessions"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TodaysSessions sessions={SAMPLE_SESSIONS} />
          <RecentActivity activities={SAMPLE_ACTIVITIES} />
        </div>
      </div>
    </NonFunctional>
  )
}
