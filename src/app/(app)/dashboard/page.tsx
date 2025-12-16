"use client"

import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { StatsCard, TodaysSessions, RecentActivity, ClassroomRankingsCard, TopStudentsCard } from './components'
import { DraggableCard } from './components/DraggableCard'
import { SortableGrid } from './components/SortableGrid'
import { DashboardEditToggle } from './components/DashboardEditToggle'
import { CardVisibilityPanel } from './components/CardVisibilityPanel'
import { useDashboardStats, useTodaysSessions, useRecentActivities, useClassroomPerformance } from './hooks'
import { useDashboardLayoutStore, getVisibleCardsBySection } from '@/stores'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const { academyId, userId, user, isLoading: authLoading, isInitialized, userDataLoading } = useAuth()
  const router = useRouter()
  const { t, language } = useTranslation()

  // Dashboard layout store
  const {
    isEditMode,
    cards,
    saving,
    setEditMode,
    toggleCardVisibility,
    reorderCards,
    fetchLayout,
    saveLayout,
    resetToDefault
  } = useDashboardLayoutStore()

  // Track active drag item for DragOverlay
  const [activeId, setActiveId] = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

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

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      reorderCards(active.id as string, over.id as string)
    }
  }, [reorderCards])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
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

  // Get visible cards by section
  const visibleStatsCards = getVisibleCardsBySection(cards, 'stats')
  const visibleMainCards = getVisibleCardsBySection(cards, 'main')
  const visiblePerformanceCards = getVisibleCardsBySection(cards, 'performance')

  // All visible card IDs for unified sortable context
  const allVisibleCardIds = useMemo(() => [
    ...visibleStatsCards.map(c => c.id),
    ...visibleMainCards.map(c => c.id),
    ...visiblePerformanceCards.map(c => c.id)
  ], [visibleStatsCards, visibleMainCards, visiblePerformanceCards])

  // Get the active card for overlay
  const activeCard = activeId ? cards.find(c => c.id === activeId) : null

  // Render card by ID
  const renderCardById = (cardId: string) => {
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

  // Render overlay content for drag
  const renderOverlayContent = () => {
    if (!activeId || !activeCard) return null

    // Stats cards
    if (activeCard.section === 'stats') {
      const cardData = statsCardsData[activeId as keyof typeof statsCardsData]
      if (!cardData) return null
      return (
        <div className="w-[280px] opacity-90">
          <StatsCard
            title={cardData.title}
            value={cardData.value}
            growth={cardData.growth}
            trendData={cardData.trendData}
            trendDataKey={cardData.trendDataKey}
            trendColor={cardData.trendColor}
            icon={cardData.icon}
            loading={false}
          />
        </div>
      )
    }

    // Other cards
    return (
      <div className="w-[400px] opacity-90">
        {renderCardById(activeId)}
      </div>
    )
  }

  // Content to render inside DndContext
  const dashboardContent = (
    <div className="space-y-8">
      {/* Stats Cards Section */}
      {visibleStatsCards.length > 0 && (
        <SortableGrid
          className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${styles.statsGrid}`}
        >
          {isLoadingData ? (
            [...Array(visibleStatsCards.length || 4)].map((_, index) => (
              <div key={`skeleton-${index}`} className="h-full">
                <StatsCard title="" value="" loading={true} />
              </div>
            ))
          ) : (
            visibleStatsCards.map((card) => {
              const cardData = statsCardsData[card.id as keyof typeof statsCardsData]
              if (!cardData) return null
              return (
                <DraggableCard key={card.id} id={card.id} isEditMode={isEditMode}>
                  <StatsCard
                    title={cardData.title}
                    value={cardData.value}
                    growth={cardData.growth}
                    trendData={cardData.trendData}
                    trendDataKey={cardData.trendDataKey}
                    trendColor={cardData.trendColor}
                    icon={cardData.icon}
                    loading={false}
                  />
                </DraggableCard>
              )
            })
          )}
        </SortableGrid>
      )}

      {/* Main Section - Today's Sessions & Recent Activity */}
      {visibleMainCards.length > 0 && (
        <SortableGrid
          className="grid gap-6 grid-cols-1 lg:grid-cols-2"
        >
          {visibleMainCards.map((card) => (
            <DraggableCard key={card.id} id={card.id} isEditMode={isEditMode}>
              {renderCardById(card.id)}
            </DraggableCard>
          ))}
        </SortableGrid>
      )}

      {/* Performance Section - Classroom Performance & Top Students */}
      {visiblePerformanceCards.length > 0 && (
        <SortableGrid
          className="grid gap-6 grid-cols-1 lg:grid-cols-3"
        >
          {visiblePerformanceCards.map((card) => (
            <DraggableCard key={card.id} id={card.id} isEditMode={isEditMode}>
              {renderCardById(card.id)}
            </DraggableCard>
          ))}
        </SortableGrid>
      )}
    </div>
  )

  return (
    <DashboardErrorBoundary>
      <div className={`p-4 ${styles.dashboardContainer}`}>
        {/* Header with Edit Controls */}
        <div className="flex items-center justify-end gap-2 mb-6">
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

        {isEditMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={allVisibleCardIds} strategy={rectSortingStrategy}>
              {dashboardContent}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {renderOverlayContent()}
            </DragOverlay>
          </DndContext>
        ) : (
          dashboardContent
        )}

        {/* Empty State - All cards hidden */}
        {visibleStatsCards.length === 0 && visibleMainCards.length === 0 && visiblePerformanceCards.length === 0 && (
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
