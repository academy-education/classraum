import React, { lazy } from 'react'

// ==============================================
// Lazy Component Loading with Fallback UI
// ==============================================

// Direct lazy component without Suspense wrapper
const withLazy = <T = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>
) => {
  return lazy(importFn)
}


// ==============================================
// Dashboard Components (Heavy Components)
// ==============================================

export const LazyClassroomsPage = withLazy<{ academyId: string; onNavigateToSessions?: (classroomId?: string) => void }>(
  () => import('@/components/ui/classrooms-page').then((m) => ({ default: m.ClassroomsPage }))
)

export const LazySessionsPage = withLazy<{ academyId: string; filterClassroomId?: string; filterDate?: string; onNavigateToAssignments?: (sessionId: string) => void; onNavigateToAttendance?: (sessionId: string) => void }>(
  () => import('@/components/ui/sessions-page').then((m) => ({ default: m.SessionsPage }))
)

export const LazyAssignmentsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/assignments-page').then((m) => ({ default: m.AssignmentsPage }))
)

export const LazyAttendancePage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/attendance-page').then((m) => ({ default: m.AttendancePage }))
)

export const LazyPaymentsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/payments-page').then((m) => ({ default: m.PaymentsPage }))
)

export const LazyReportsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/reports-page').then((m) => ({ default: m.ReportsPage }))
)

export const LazyUpgradePage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/upgrade-page').then((m) => ({ default: m.UpgradePage }))
)

export const LazyOrderSummaryPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/order-summary-page').then((m) => ({ default: m.OrderSummaryPage }))
)

export const LazyTeachersPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/teachers-page').then((m) => ({ default: m.TeachersPage }))
)

export const LazyStudentsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/students-page').then((m) => ({ default: m.StudentsPage }))
)

export const LazyParentsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/parents-page').then((m) => ({ default: m.ParentsPage }))
)

export const LazyFamiliesPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/families-page').then((m) => ({ default: m.FamiliesPage }))
)

export const LazySettingsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/settings-page').then((m) => ({ default: m.SettingsPage }))
)

export const LazyNotificationsPage = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/notifications-page').then((m) => ({ default: m.NotificationsPage }))
)

// ==============================================
// Feature Pages (Landing Page Components)
// ==============================================

export const LazyAboutPage = withLazy(
  () => import('@/app/about/page')
)

export const LazyPricingPage = withLazy(
  () => import('@/app/pricing/page')
)

export const LazyFaqsPage = withLazy(
  () => import('@/app/faqs/page')
)

export const LazyAuthPage = withLazy(
  () => import('@/app/auth/page')
)

export const LazyMobilePage = withLazy(
  () => import('@/app/mobile/page')
)

// ==============================================
// Feature Detail Pages
// ==============================================

export const LazyAIReportCardsPage = withLazy(
  () => import('@/app/features/ai-report-cards/page')
)

export const LazyAttendanceRecordingPage = withLazy(
  () => import('@/app/features/attendance-recording/page')
)

export const LazyCustomizedDashboardPage = withLazy(
  () => import('@/app/features/customized-dashboard/page')
)

export const LazyLessonAssignmentPlannerPage = withLazy(
  () => import('@/app/features/lesson-assignment-planner/page')
)

export const LazyPrivacyByDesignPage = withLazy(
  () => import('@/app/features/privacy-by-design/page')
)

export const LazyRealTimeNotificationsPage = withLazy(
  () => import('@/app/features/real-time-notifications/page')
)

export const LazySmartLinkingSystemPage = withLazy(
  () => import('@/app/features/smart-linking-system/page')
)

// ==============================================
// Advanced Dashboard Components
// ==============================================


// ==============================================
// Chart and Visualization Components
// ==============================================

// Chart components should be imported directly, not lazy loaded
// export const LazyRechartsComponents = withLazy<any>(
//   () => import('recharts').then(m => ({
//     default: {
//       LineChart: m.LineChart,
//       Line: m.Line,
//       ResponsiveContainer: m.ResponsiveContainer,
//       XAxis: m.XAxis,
//       YAxis: m.YAxis,
//       CartesianGrid: m.CartesianGrid,
//       Tooltip: m.Tooltip,
//       Legend: m.Legend,
//       BarChart: m.BarChart,
//       Bar: m.Bar,
//       AreaChart: m.AreaChart,
//       Area: m.Area,
//       PieChart: m.PieChart,
//       Pie: m.Pie,
//       Cell: m.Cell
//     }
//   }))
// )

// ==============================================
// Widget Components
// ==============================================

export const LazyChatWidget = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/chat-widget').then((m) => ({ default: m.ChatWidget }))
)

export const LazyNotificationDropdown = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/notification-dropdown').then((m) => ({ default: m.NotificationDropdown }))
)

export const LazyNotificationTester = withLazy(
  // @ts-expect-error - Type inference issue with lazy loading
  () => import('@/components/ui/notification-tester').then((m) => ({ default: m.NotificationTester }))
)

// ==============================================
// Utility Components for Code Splitting
// ==============================================

// Component for preloading other components on user interaction
export const PreloadTrigger: React.FC<{
  component: () => Promise<unknown>
  children: React.ReactNode
  trigger?: 'hover' | 'focus' | 'immediate'
}> = ({ component, children, trigger = 'hover' }) => {
  const preload = React.useCallback(() => {
    component().catch(() => {
      // Silently handle preload errors
    })
  }, [component])

  const props = React.useMemo(() => ({
    [trigger === 'hover' ? 'onMouseEnter' : 'onFocus']: preload
  }), [trigger, preload])

  // Immediate preload
  React.useEffect(() => {
    if (trigger === 'immediate') {
      preload()
    }
  }, [trigger, preload])

  return <div {...props}>{children}</div>
}

// Hook for programmatic component preloading
export const usePreload = () => {
  const preloadComponent = React.useCallback((importFn: () => Promise<unknown>) => {
    return importFn().catch(() => {
      // Silently handle preload errors
    })
  }, [])

  return { preloadComponent }
}

// Component for lazy loading with intersection observer
export const LazyOnVisible: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
}> = ({ children, fallback, rootMargin = '100px', threshold = 0.1 }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  )
}

