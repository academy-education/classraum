"use client"

import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Layout, Layouts } from 'react-grid-layout'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { StatsCard, TodaysSessions, RecentActivity, ClassroomRankingsCard, TopStudentsCard } from './components'
import { DashboardEditToggle } from './components/DashboardEditToggle'
import { CardVisibilityPanel } from './components/CardVisibilityPanel'
import { useDashboardStats, useTodaysSessions, useRecentActivities, useClassroomPerformance } from './hooks'
import { useDashboardLayoutStore, getVisibleLayouts } from '@/stores'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import styles from './dashboard.module.css'

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Use legacy wrapper for v1 API compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Responsive, WidthProvider } = require('react-grid-layout/legacy')
const ResponsiveGridLayout = WidthProvider(Responsive)

export default function DashboardPage() {
  const { academyId, userId, user, isLoading: authLoading, isInitialized, userDataLoading } = useAuth()
  const router = useRouter()
  const { t, language } = useTranslation()

  // Dashboard layout store
  const {
    isEditMode,
    cards,
    layouts,
    saving,
    setEditMode,
    toggleCardVisibility,
    updateLayouts,
    fetchLayout,
    saveLayout,
    resetToDefault
  } = useDashboardLayoutStore()

  // Breakpoints and column configuration for react-grid-layout
  const breakpoints = useMemo(() => ({ lg: 1200, md: 996, sm: 768, xs: 480 }), [])
  const cols = useMemo(() => ({ lg: 12, md: 10, sm: 6, xs: 4 }), [])

  // Track if component has mounted to ensure skeletons show on first render
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted immediately to show cached data without delay
    setHasMounted(true)
  }, [])

  // Fetch layout on mount
  useEffect(() => {
    if (userId) {
      fetchLayout(userId)
    }
  }, [userId, fetchLayout])

  // Additional authentication check at page level
  useEffect(() => {
    // Wait for complete initialization including user data loading
    if (!isInitialized || authLoading || userDataLoading) {
      return
    }

    // Only redirect if there's no user after everything is loaded
    if (!user) {
      router.replace('/auth')
      return
    }

    // Check user role and redirect teachers to classrooms
    const checkUserRole = async () => {
      if (!user?.id) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('[Dashboard] Error fetching user role:', error)
          return
        }

        // Teachers should not access dashboard - redirect to classrooms
        if (userInfo?.role === 'teacher') {
          console.log('[Dashboard] Teacher detected, redirecting to classrooms')
          router.replace('/classrooms')
        }
      } catch (error) {
        console.error('[Dashboard] Error checking user role:', error)
      }
    }

    checkUserRole()
  }, [user, isInitialized, authLoading, userDataLoading, router])


  // Custom hooks for data fetching
  const { stats, trends, loading: statsLoading, error: statsError } = useDashboardStats(academyId || null)
  const { sessions, loading: sessionsLoading } = useTodaysSessions(academyId || null)
  const { activities, loading: activitiesLoading } = useRecentActivities(userId || null, language)
  const {
    highestScoreClassroom,
    lowestScoreClassroom,
    highestAttendanceClassroom,
    lowestAttendanceClassroom,
    topStudents,
    bottomStudents,
    loading: performanceLoading
  } = useClassroomPerformance(academyId || null)

  // Memoized previous month name calculation
  const getPreviousMonthName = useMemo(() => {
    const previousMonth = new Date()
    previousMonth.setMonth(previousMonth.getMonth() - 1)
    return language === 'korean'
      ? `${previousMonth.getMonth() + 1}월`
      : previousMonth.toLocaleDateString('en-US', { month: 'long' })
  }, [language])

  // Memoized stats cards data
  const statsCardsData = useMemo(() => ({
    'stats-revenue': {
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
    'stats-users': {
      title: String(t("dashboard.allActiveUsers")),
      value: stats.userCount,
      growth: stats.showUsersAdded ? {
        percentage: stats.usersAdded,
        isPositive: stats.isGrowthPositive,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month',
        isUserCount: true
      } : undefined,
      trendData: trends.activeUsersTrend.map((value, index) => ({
        day: index,
        value
      })),
      trendDataKey: 'value',
      trendColor: '#3B82F6',
      icon: 'users' as const
    },
    'stats-classrooms': {
      title: String(t("dashboard.allClassrooms")),
      value: stats.classroomCount,
      growth: stats.classroomsAdded > 0 ? {
        percentage: stats.classroomsAdded,
        isPositive: true,
        showGrowth: true,
        period: language === 'korean' ? '이번 달' : 'this month',
        isUserCount: true
      } : undefined,
      trendData: trends.classroomTrend.map((value, index) => ({
        day: index,
        value
      })),
      trendDataKey: 'value',
      trendColor: '#8B5CF6',
      icon: 'classrooms' as const
    },
    'stats-sessions': {
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
  }), [stats, trends, t, language, getPreviousMonthName])

  // Handle activity clicks
  const handleActivityClick = (activity: { navigationData?: { page?: string } | null }) => {
    if (activity.navigationData?.page) {
      router.push(activity.navigationData.page)
    }
  }

  // Handle save
  const handleSave = useCallback(() => {
    if (userId) {
      saveLayout(userId)
    }
  }, [userId, saveLayout])

  // Handle toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    setEditMode(!isEditMode)
  }, [isEditMode, setEditMode])

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = useCallback((currentLayout: Layout[], allLayouts: Layouts) => {
    // Only update if we have valid layouts
    if (allLayouts && Object.keys(allLayouts).length > 0) {
      updateLayouts(allLayouts)
    }
  }, [updateLayouts])

  // Handle resize stop to ensure size is captured
  const handleResizeStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout, e: MouseEvent, element: HTMLElement) => {
    // Layout change will be handled by onLayoutChange
    console.log('[Dashboard] Resize stopped:', { oldItem, newItem })
  }, [])

  // Mark app as loaded when auth and data are loaded
  useEffect(() => {
    if (user && isInitialized && !authLoading && !userDataLoading) {
      simpleTabDetection.markAppLoaded()
    }
  }, [user, isInitialized, authLoading, userDataLoading])

  // Show skeleton during initial auth loading or data loading
  const hasAnyData = stats.userCount > 0 || stats.classroomCount > 0 ||
    stats.totalRevenue > 0 || sessions.length > 0 || activities.length > 0

  const isLoadingData = !hasMounted || statsLoading ||
    ((!hasAnyData) && (authLoading || userDataLoading || !isInitialized ||
     academyId === undefined || userId === undefined))

  // Get visible cards and their layouts with constraints merged
  const visibleCards = useMemo(() => cards.filter(c => c.visible), [cards])
  const visibleLayouts = useMemo(() => {
    const filtered = getVisibleLayouts(layouts, cards)
    // Merge card constraints (minW, minH, maxW, maxH) into layout items
    // Only include defined constraints to avoid overwriting valid values with undefined
    const cardConstraints = new Map(cards.map(c => {
      const constraints: Record<string, number> = {}
      if (c.minW !== undefined) constraints.minW = c.minW
      if (c.minH !== undefined) constraints.minH = c.minH
      if (c.maxW !== undefined) constraints.maxW = c.maxW
      if (c.maxH !== undefined) constraints.maxH = c.maxH
      return [c.id, constraints]
    }))
    const result: Layouts = {}
    for (const [breakpoint, layout] of Object.entries(filtered)) {
      result[breakpoint] = layout.map(item => ({
        ...item,
        ...cardConstraints.get(item.i)
      }))
    }
    return result
  }, [layouts, cards])

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] Debug:', {
      visibleCardsCount: visibleCards.length,
      visibleCards: visibleCards.map(c => c.id),
      layoutsKeys: Object.keys(visibleLayouts),
      lgLayout: visibleLayouts.lg?.length,
      isEditMode
    })
  }, [visibleCards, visibleLayouts, isEditMode])

  // Render card by ID - handles all card types
  const renderCardById = (cardId: string) => {
    // Stats cards
    if (cardId.startsWith('stats-')) {
      const cardData = statsCardsData[cardId as keyof typeof statsCardsData]
      if (cardData) {
        return (
          <StatsCard
            title={cardData.title}
            value={cardData.value}
            growth={cardData.growth}
            trendData={cardData.trendData}
            trendDataKey={cardData.trendDataKey}
            trendColor={cardData.trendColor}
            icon={cardData.icon}
            loading={isLoadingData || statsLoading}
          />
        )
      }
    }

    switch (cardId) {
      case 'todays-sessions':
        return (
          <TodaysSessions
            sessions={sessions}
            loading={isLoadingData || sessionsLoading}
          />
        )
      case 'recent-activity':
        return (
          <RecentActivity
            activities={activities}
            loading={isLoadingData || activitiesLoading}
            onActivityClick={handleActivityClick}
          />
        )
      case 'classroom-rankings':
        return (
          <ClassroomRankingsCard
            highestScore={highestScoreClassroom}
            lowestScore={lowestScoreClassroom}
            highestAttendance={highestAttendanceClassroom}
            lowestAttendance={lowestAttendanceClassroom}
            loading={isLoadingData || performanceLoading}
          />
        )
      case 'top-students':
        return (
          <TopStudentsCard
            title={String(t('dashboard.topStudents'))}
            students={topStudents}
            type="top"
            loading={isLoadingData || performanceLoading}
          />
        )
      case 'bottom-students':
        return (
          <TopStudentsCard
            title={String(t('dashboard.bottomStudents'))}
            students={bottomStudents}
            type="bottom"
            loading={isLoadingData || performanceLoading}
          />
        )
      default:
        return null
    }
  }

  // Dashboard content with react-grid-layout
  const dashboardContent = (
    <ResponsiveGridLayout
      className="layout"
      layouts={visibleLayouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={80}
      margin={[16, 16]}
      containerPadding={[0, 0]}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={handleLayoutChange}
      onResizeStop={handleResizeStop}
      draggableHandle=".drag-handle"
      useCSSTransforms={true}
      compactType="vertical"
      preventCollision={false}
    >
      {visibleCards.map((card) => (
        <div
          key={card.id}
          className={`${isEditMode ? 'ring-2 ring-primary/20 ring-offset-2 rounded-lg' : ''}`}
        >
          {isEditMode && (
            <div className="drag-handle absolute -top-2 -left-2 z-10 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm cursor-grab active:cursor-grabbing">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          {renderCardById(card.id)}
        </div>
      ))}
    </ResponsiveGridLayout>
  )

  return (
    <DashboardErrorBoundary>
      <div className={`p-4 ${styles.dashboardContainer}`}>
        {/* Header with Edit Controls - hidden when bottom nav is visible */}
        <div className="hidden lg:flex items-center justify-end gap-2 mb-6">
          <CardVisibilityPanel
            cards={cards}
            onToggleVisibility={toggleCardVisibility}
            isEditMode={isEditMode}
          />
          <DashboardEditToggle
            isEditMode={isEditMode}
            saving={saving}
            onToggleEditMode={handleToggleEditMode}
            onSave={handleSave}
            onReset={resetToDefault}
          />
        </div>

        {visibleCards.length > 0 ? (
          dashboardContent
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="text-lg mb-2">
              {language === 'korean' ? '표시할 카드가 없습니다' : 'No cards to display'}
            </p>
            <p className="text-sm">
              {language === 'korean'
                ? '카드 표시 설정에서 카드를 활성화하세요'
                : 'Enable cards from the visibility settings'}
            </p>
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  )
}
