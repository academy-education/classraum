"use client"

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { StatsCard, TodaysSessions, RecentActivity } from './components'
import { useDashboardStats, useTodaysSessions, useRecentActivities } from './hooks'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const { academyId, userId } = useAuth()
  const router = useRouter()
  const { t, language } = useTranslation()
  
  // Custom hooks for data fetching
  const { stats, trends, loading: statsLoading, error: statsError } = useDashboardStats(academyId)
  const { sessions, loading: sessionsLoading } = useTodaysSessions(academyId)
  const { activities, loading: activitiesLoading } = useRecentActivities(userId, language)

  // Memoized previous month name calculation
  const getPreviousMonthName = useMemo(() => {
    const previousMonth = new Date()
    previousMonth.setMonth(previousMonth.getMonth() - 1)
    return language === 'korean' 
      ? `${previousMonth.getMonth() + 1}월`
      : previousMonth.toLocaleDateString('en-US', { month: 'long' })
  }, [language])

  // Memoized stats cards data
  const statsCardsData = useMemo(() => [
    {
      title: t("dashboard.revenueThisMonth"),
      value: `₩${stats.totalRevenue.toLocaleString()}`,
      growth: {
        percentage: stats.revenueGrowthPercentage,
        isPositive: stats.isRevenueGrowthPositive,
        showGrowth: true,
        period: language === 'korean' 
          ? `${getPreviousMonthName} 대비`
          : `from ${getPreviousMonthName}`
      },
      trendData: trends.monthlyRevenueTrend.map((value, index) => ({
        day: index,
        value
      })),
      trendDataKey: 'value',
      trendColor: '#10B981',
      icon: 'revenue' as const
    },
    {
      title: t("dashboard.allActiveUsers"),
      value: stats.userCount,
      growth: stats.showUsersAdded ? {
        percentage: stats.usersAdded,
        isPositive: stats.isGrowthPositive,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month'
      } : undefined,
      trendData: trends.activeUsersTrend.map((value, index) => ({
        day: index,
        value
      })),
      trendDataKey: 'value',
      trendColor: '#3B82F6',
      icon: 'users' as const
    },
    {
      title: t("dashboard.allClassrooms"),
      value: stats.classroomCount,
      growth: stats.classroomsAdded > 0 ? {
        percentage: stats.classroomsAdded,
        isPositive: true,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month'
      } : undefined,
      trendData: trends.classroomTrend.map((value, index) => ({
        day: index,
        value
      })),
      trendDataKey: 'value',
      trendColor: '#8B5CF6',
      icon: 'classrooms' as const
    },
    {
      title: t("dashboard.activeSessionsThisWeek"),
      value: stats.activeSessionsThisWeek,
      growth: stats.showSessionsGrowth ? {
        percentage: stats.sessionsGrowthPercentage,
        isPositive: stats.isSessionsGrowthPositive,
        showGrowth: true,
        period: language === 'korean' ? '지난 주 대비' : 'from last week'
      } : undefined,
      trendData: trends.weeklySessionData.map((item, index) => ({
        day: index,
        value: item.sessions
      })),
      trendDataKey: 'value',
      trendColor: '#F59E0B',
      icon: 'sessions' as const
    }
  ], [stats, trends, t, language, getPreviousMonthName])

  // Handle activity clicks
  const handleActivityClick = (activity: { navigationData?: { page?: string } | null }) => {
    if (activity.navigationData?.page) {
      router.push(activity.navigationData.page)
    }
  }

  // Show error state
  if (statsError) {
    return (
      <DashboardErrorBoundary>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error Loading Dashboard</h3>
            <p className="text-red-700 text-sm mt-1">{statsError}</p>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
  }

  return (
    <DashboardErrorBoundary>
      <div className={`p-4 ${styles.dashboardContainer}`}>
        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${styles.statsGrid}`}>
          {statsCardsData.map((cardData, index) => (
            <StatsCard
              key={index}
              title={cardData.title}
              value={cardData.value}
              growth={cardData.growth}
              trendData={cardData.trendData}
              trendDataKey={cardData.trendDataKey}
              trendColor={cardData.trendColor}
              icon={cardData.icon}
              loading={statsLoading}
            />
          ))}
        </div>

        {/* Today's Sessions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodaysSessions 
            sessions={sessions}
            loading={sessionsLoading}
          />
          
          <RecentActivity 
            activities={activities}
            loading={activitiesLoading}
            onActivityClick={handleActivityClick}
          />
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}