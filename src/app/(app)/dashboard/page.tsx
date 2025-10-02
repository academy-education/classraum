"use client"

import React, { useMemo, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'
import { StatsCard, TodaysSessions, RecentActivity } from './components'
import { useDashboardStats, useTodaysSessions, useRecentActivities } from './hooks'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const { academyId, userId, user, isLoading: authLoading, isInitialized, userDataLoading } = useAuth()
  const router = useRouter()
  const { t, language } = useTranslation()

  // Add initial loading state to show skeleton on navigation (consistent with other pages)
  const [initialLoading, setInitialLoading] = useState(true)

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

  // Clear initial loading after a brief moment (like AuthGuard does)
  useEffect(() => {
    if (initialLoading && user && isInitialized && !authLoading && !userDataLoading) {
      const timer = setTimeout(() => {
        setInitialLoading(false)
      }, 100) // Brief delay to show skeleton
      return () => clearTimeout(timer)
    }
  }, [initialLoading, user, isInitialized, authLoading, userDataLoading])

  // Mark app as loaded when auth and data are loaded
  useEffect(() => {
    if (user && isInitialized && !authLoading && !userDataLoading) {
      simpleTabDetection.markAppLoaded()
    }
  }, [user, isInitialized, authLoading, userDataLoading])

  // Show loading while auth is loading or user data is loading
  // Show skeleton during navigation to be consistent with other pages
  const shouldShowLoading = (authLoading || userDataLoading || !isInitialized) || statsLoading || initialLoading

  if (shouldShowLoading) {
    console.log('📄 [DashboardPage] Showing skeleton loading state')
    return (
      <DashboardErrorBoundary>
        <div className={`p-4 ${styles.dashboardContainer}`}>
          {/* Stats Cards Skeleton */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 ${styles.statsGrid}`}>
            {[...Array(4)].map((_, index) => (
              <StatsCard key={index} title="" value="" loading={true} />
            ))}
          </div>

          {/* Today's Sessions & Recent Activity Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Sessions Skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardErrorBoundary>
    )
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
    <RoleBasedAuthWrapper
      allowedRoles={['manager']}
      redirectTo="/classrooms"
    >
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
    </RoleBasedAuthWrapper>
  )
}