"use client"

import React, { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { StatsCard, TodaysSessions, RecentActivity } from './components'
import { useDashboardStats, useTodaysSessions, useRecentActivities } from './hooks'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const { academyId, userId, user, isLoading: authLoading, isInitialized, userDataLoading } = useAuth()
  const router = useRouter()
  const { t, language } = useTranslation()

  // Track if component has mounted to ensure skeletons show on first render
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted immediately to show cached data without delay
    setHasMounted(true)
  }, [])

  // Additional authentication check at page level
  useEffect(() => {
    // Wait for complete initialization including user data loading
    if (!isInitialized || authLoading || userDataLoading) {
      return
    }

    // Only redirect if there's no user after everything is loaded
    if (!user) {
      router.replace('/auth')
    }
  }, [user, isInitialized, authLoading, userDataLoading, router])


  // Custom hooks for data fetching
  const { stats, trends, loading: statsLoading, error: statsError } = useDashboardStats(academyId || null)
  const { sessions, loading: sessionsLoading } = useTodaysSessions(academyId || null)
  const { activities, loading: activitiesLoading } = useRecentActivities(userId || null, language)

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
      title: String(t("dashboard.revenueThisMonth")),
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
      title: String(t("dashboard.allActiveUsers")),
      value: stats.userCount,
      growth: stats.showUsersAdded ? {
        percentage: stats.usersAdded,
        isPositive: stats.isGrowthPositive,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month',
        isUserCount: true  // Show actual user count instead of percentage
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
      title: String(t("dashboard.allClassrooms")),
      value: stats.classroomCount,
      growth: stats.classroomsAdded > 0 ? {
        percentage: stats.classroomsAdded,
        isPositive: true,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month',
        isUserCount: true  // Show actual count instead of percentage
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
      title: String(t("dashboard.activeSessionsThisWeek")),
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

  // Mark app as loaded when auth and data are loaded
  useEffect(() => {
    if (user && isInitialized && !authLoading && !userDataLoading) {
      simpleTabDetection.markAppLoaded()
    }
  }, [user, isInitialized, authLoading, userDataLoading])

  // Show skeleton during initial auth loading or data loading
  // Only show skeleton if we're loading AND don't have any cached data to display
  // This prevents skeleton flash on page reload when cached data exists
  const hasAnyData = stats.userCount > 0 || stats.classroomCount > 0 ||
    stats.totalRevenue > 0 || sessions.length > 0 || activities.length > 0

  const isLoadingData = !hasMounted || statsLoading ||
    ((!hasAnyData) && (authLoading || userDataLoading || !isInitialized ||
     academyId === undefined || userId === undefined))

  return (
    <DashboardErrorBoundary>
      <div className={`p-4 ${styles.dashboardContainer}`}>
        {/* Stats Cards - always render structure, show skeleton when loading */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${styles.statsGrid}`}>
          {isLoadingData ? (
            // Show skeleton cards during loading
            [...Array(4)].map((_, index) => (
              <StatsCard key={index} title="" value="" loading={true} />
            ))
          ) : (
            // Show actual data when loaded
            statsCardsData.map((cardData, index) => (
              <StatsCard
                key={index}
                title={cardData.title}
                value={cardData.value}
                growth={cardData.growth}
                trendData={cardData.trendData}
                trendDataKey={cardData.trendDataKey}
                trendColor={cardData.trendColor}
                icon={cardData.icon}
                loading={false}
              />
            ))
          )}
        </div>

        {/* Today's Sessions & Recent Activity - always render structure */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodaysSessions
            sessions={sessions}
            loading={isLoadingData || sessionsLoading}
          />

          <RecentActivity
            activities={activities}
            loading={isLoadingData || activitiesLoading}
            onActivityClick={handleActivityClick}
          />
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}