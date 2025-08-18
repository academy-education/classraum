import { lazy } from 'react'

// ==============================================
// Lazy Component Loading with Fallback UI
// ==============================================

// Direct lazy component without Suspense wrapper
const withLazy = <T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>
) => {
  return lazy(importFn)
}


// ==============================================
// Dashboard Components (Heavy Components)
// ==============================================

export const LazyClassroomsPage = withLazy(
  () => import('@/components/ui/classrooms-page').then(m => ({ default: m.ClassroomsPage }))
)

export const LazySessionsPage = withLazy(
  () => import('@/components/ui/sessions-page').then(m => ({ default: m.SessionsPage }))
)

export const LazyAssignmentsPage = withLazy(
  () => import('@/components/ui/assignments-page').then(m => ({ default: m.AssignmentsPage }))
)

export const LazyAttendancePage = withLazy(
  () => import('@/components/ui/attendance-page').then(m => ({ default: m.AttendancePage }))
)

export const LazyPaymentsPage = withLazy(
  () => import('@/components/ui/payments-page').then(m => ({ default: m.PaymentsPage }))
)

export const LazyReportsPage = withLazy(
  () => import('@/components/ui/reports-page')
)

export const LazyUpgradePage = withSuspense(
  lazy(() => import('@/components/ui/upgrade-page').then(m => ({ default: m.UpgradePage })))
)

export const LazyOrderSummaryPage = withSuspense(
  lazy(() => import('@/components/ui/order-summary-page').then(m => ({ default: m.OrderSummaryPage })))
)

export const LazyTeachersPage = withSuspense(
  lazy(() => import('@/components/ui/teachers-page').then(m => ({ default: m.TeachersPage })))
)

export const LazyStudentsPage = withSuspense(
  lazy(() => import('@/components/ui/students-page').then(m => ({ default: m.StudentsPage })))
)

export const LazyParentsPage = withSuspense(
  lazy(() => import('@/components/ui/parents-page').then(m => ({ default: m.ParentsPage })))
)

export const LazyFamiliesPage = withSuspense(
  lazy(() => import('@/components/ui/families-page').then(m => ({ default: m.FamiliesPage })))
)

export const LazySettingsPage = withSuspense(
  lazy(() => import('@/components/ui/settings-page').then(m => ({ default: m.SettingsPage })))
)

export const LazyNotificationsPage = withSuspense(
  lazy(() => import('@/components/ui/notifications-page').then(m => ({ default: m.NotificationsPage })))
)

// ==============================================
// Feature Pages (Landing Page Components)
// ==============================================

export const LazyAboutPage = withSuspense(
  lazy(() => import('@/app/about/page'))
)

export const LazyPricingPage = withSuspense(
  lazy(() => import('@/app/pricing/page'))
)

export const LazyFaqsPage = withSuspense(
  lazy(() => import('@/app/faqs/page'))
)

export const LazyAuthPage = withSuspense(
  lazy(() => import('@/app/auth/page'))
)

export const LazyMobilePage = withSuspense(
  lazy(() => import('@/app/mobile/page'))
)

// ==============================================
// Feature Detail Pages
// ==============================================

export const LazyAIReportCardsPage = withSuspense(
  lazy(() => import('@/app/features/ai-report-cards/page'))
)

export const LazyAttendanceRecordingPage = withSuspense(
  lazy(() => import('@/app/features/attendance-recording/page'))
)

export const LazyCustomizedDashboardPage = withSuspense(
  lazy(() => import('@/app/features/customized-dashboard/page'))
)

export const LazyLessonAssignmentPlannerPage = withSuspense(
  lazy(() => import('@/app/features/lesson-assignment-planner/page'))
)

export const LazyPrivacyByDesignPage = withSuspense(
  lazy(() => import('@/app/features/privacy-by-design/page'))
)

export const LazyRealTimeNotificationsPage = withSuspense(
  lazy(() => import('@/app/features/real-time-notifications/page'))
)

export const LazySmartLinkingSystemPage = withSuspense(
  lazy(() => import('@/app/features/smart-linking-system/page'))
)

// ==============================================
// Advanced Dashboard Components
// ==============================================

export const LazyDashboardWithStore = withSuspense(
  lazy(() => import('@/app/dashboard/DashboardWithStore').then(m => ({ default: m.DashboardWithStore })))
)

export const LazyDashboardWithReactQuery = withSuspense(
  lazy(() => import('@/app/dashboard/DashboardWithReactQuery').then(m => ({ default: m.DashboardWithReactQuery })))
)

export const LazyDashboardWithMaterializedViews = withSuspense(
  lazy(() => import('@/app/dashboard/DashboardWithMaterializedViews').then(m => ({ default: m.DashboardWithMaterializedViews })))
)

// ==============================================
// Chart and Visualization Components
// ==============================================

export const LazyRechartsComponents = withSuspense(
  lazy(() => import('recharts').then(m => ({
    default: {
      LineChart: m.LineChart,
      Line: m.Line,
      ResponsiveContainer: m.ResponsiveContainer,
      XAxis: m.XAxis,
      YAxis: m.YAxis,
      CartesianGrid: m.CartesianGrid,
      Tooltip: m.Tooltip,
      Legend: m.Legend,
      BarChart: m.BarChart,
      Bar: m.Bar,
      AreaChart: m.AreaChart,
      Area: m.Area,
      PieChart: m.PieChart,
      Pie: m.Pie,
      Cell: m.Cell
    }
  })))
)

// ==============================================
// Widget Components
// ==============================================

export const LazyChatWidget = withSuspense(
  lazy(() => import('@/components/ui/chat-widget').then(m => ({ default: m.ChatWidget })))
)

export const LazyNotificationDropdown = withSuspense(
  lazy(() => import('@/components/ui/notification-dropdown').then(m => ({ default: m.NotificationDropdown })))
)

export const LazyNotificationTester = withSuspense(
  lazy(() => import('@/components/ui/notification-tester'))
)

// ==============================================
// Utility Components for Code Splitting
// ==============================================

// Component for preloading other components on user interaction
export const PreloadTrigger: React.FC<{
  component: () => Promise<any>
  children: React.ReactNode
  trigger?: 'hover' | 'focus' | 'immediate'
}> = ({ component, children, trigger = 'hover' }) => {
  const preload = () => {
    component().catch(() => {
      // Silently handle preload errors
    })
  }

  const props = {
    [trigger === 'hover' ? 'onMouseEnter' : 'onFocus']: preload
  }

  // Immediate preload
  if (trigger === 'immediate') {
    React.useEffect(() => {
      preload()
    }, [])
  }

  return <div {...props}>{children}</div>
}

// Hook for programmatic component preloading
export const usePreload = () => {
  const preloadComponent = React.useCallback((importFn: () => Promise<any>) => {
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

// Export React for JSX
import React from 'react'