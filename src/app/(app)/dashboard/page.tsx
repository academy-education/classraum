"use client"

import React, { useMemo, useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
// react-grid-layout's bundled .d.ts exports `Layout` and `ResponsiveLayouts`
// (the latter is what older docs call `Layouts`). Type-only import — it
// doesn't pull the runtime into this chunk.
import type { Layout, ResponsiveLayouts as Layouts } from 'react-grid-layout'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { DashboardErrorBoundary } from '@/components/ui/error-boundary'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { LayoutDashboard, AlertCircle } from 'lucide-react'
import { StatsCard, TodaysSessions, RecentActivity, ClassroomRankingsCard, TopStudentsCard } from './components'
import { DashboardEditToggle } from './components/DashboardEditToggle'
import { GettingStartedChecklist } from './components/GettingStartedChecklist'

// Edit-mode-only — defer the bundle until the user enters edit mode. The
// panel is mounted via `{isEditMode && <CardVisibilityPanel ... />}` so
// this dynamic boundary only fires when needed; first paint stays lean.
const CardVisibilityPanel = dynamic(
  () => import('./components/CardVisibilityPanel').then(m => m.CardVisibilityPanel),
  { ssr: false }
)
import { useDashboardStats, useTodaysSessions, useRecentActivities, useClassroomPerformance, useAssignmentsAwaitingGrades } from './hooks'
import { useDashboardLayoutStore, getVisibleLayouts } from '@/stores'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import styles from './dashboard.module.css'

// Import react-grid-layout styles. CSS is fine at module load — it's a
// side-effect import with no JS bundle cost; keeping it eager avoids a
// layout-shift when the dynamic grid chunk lands.
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// Dynamic-import the grid wrapper so the heavy react-grid-layout +
// react-resizable + react-draggable runtime drops out of the dashboard
// page bundle. Loads on first render after the page chunk parses.
const DashboardGrid = dynamic(() => import('./components/DashboardGrid'), {
  ssr: false,
  loading: () => null,
})

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

        // The dashboard is the academy (manager) surface. Non-manager
        // roles that land here — e.g. when middleware redirects the app
        // root '/' → '/dashboard' before the role-aware root page runs —
        // must be bounced to their own home, or a study-only student
        // (no academy) gets stuck in "academy mode". Mirrors the routing
        // in (app)/page.tsx.
        const role = userInfo?.role
        if (role === 'teacher') {
          router.replace('/classrooms')
        } else if (role === 'student') {
          // Study-only students (no active academy membership) go straight
          // to Study; students with an academy get the mobile hub.
          const { count } = await supabase
            .from('students')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('active', true)
          router.replace((count ?? 0) > 0 ? '/mobile/start' : '/mobile/study')
        } else if (role === 'parent') {
          router.replace('/mobile')
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
  const { count: awaitingGradesCount } = useAssignmentsAwaitingGrades(academyId || null)
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
      // ResponsiveLayouts breakpoint values are typed as optional; skip
      // empty entries instead of pushing undefined.
      if (!layout) continue
      result[breakpoint] = layout.map(item => ({
        ...item,
        ...cardConstraints.get(item.i)
      }))
    }
    return result
  }, [layouts, cards])

  // Debug logging

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

  // Dashboard content with react-grid-layout — DashboardGrid is dynamic-
  // imported so the layout library doesn't bloat the page chunk.
  const dashboardContent = (
    <DashboardGrid
      layouts={visibleLayouts}
      breakpoints={breakpoints}
      cols={cols}
      isEditMode={isEditMode}
      onLayoutChange={handleLayoutChange}
      onResizeStop={handleResizeStop}
    >
      {visibleCards.map((card) => (
        <div
          key={card.id}
          // Match the widget chrome's rounded-2xl so the edit-mode ring sits flush
          // around the card instead of clipping its rounded corners.
          className={`${isEditMode ? 'ring-2 ring-primary/20 ring-offset-2 rounded-2xl' : ''}`}
        >
          {isEditMode && (
            <div className="drag-handle absolute -top-2 -left-2 z-10 p-1.5 rounded-lg bg-white ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] cursor-grab active:cursor-grabbing">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
          {renderCardById(card.id)}
        </div>
      ))}
    </DashboardGrid>
  )

  return (
    <DashboardErrorBoundary>
      <div className={`p-4 ${styles.dashboardContainer}`}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.dashboard')}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-500 mt-1">{t('dashboard.description')}</p>
            {/* Top-of-page action chip — surfaces "things you need to do today"
                that aren't tied to a specific session card. The
                pending-attendance chip lives inside Today's Sessions because
                it's session-scoped; this one is academy-wide so it lives at
                the top. Click → /assignments?pending=true (the assignments
                page reads that param and opens with pending-only filter). */}
            {awaitingGradesCount > 0 && (
              <button
                type="button"
                onClick={() => router.push('/assignments?pending=true')}
                className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {String(t('dashboard.assignmentsAwaitingGrades', { count: awaitingGradesCount }))}
              </button>
            )}
          </div>
          {/* Edit controls - hidden when bottom nav is visible */}
          <div className="hidden lg:flex items-center gap-2">
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
        </div>

        {/* Fresh-academy onboarding checklist. Self-hides once any
            classroom exists, or when the user dismisses it. */}
        {academyId && <GettingStartedChecklist academyId={academyId} />}

        {visibleCards.length > 0 ? (
          dashboardContent
        ) : (
          <EmptyState
            icon={LayoutDashboard}
            title={String(t('dashboard.noCardsToDisplay'))}
            description={String(t('dashboard.noCardsToDisplayDescription'))}
            actionLabel={String(t('dashboard.showCards'))}
            onAction={() => setEditMode(true)}
            actionVariant="outline"
            size="lg"
          />
        )}
      </div>
    </DashboardErrorBoundary>
  )
}
