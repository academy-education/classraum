// React Query hooks for API management
export * from './useAcademyQueries'
export * from './useUserQueries'
export * from './useDashboardQueries'
export { 
  useSessionAnalytics,
  useAssignmentAnalytics, 
  useUserGrowthTrends,
  useClassroomUtilization,
  useNotificationAnalytics,
  usePaymentAnalytics,
  useRecurringTemplateAnalytics,
  useRevenueTrends,
  useStudentPaymentBehavior,
  useDashboardData,
  useRefreshMaterializedViews,
  useRefreshPaymentViews,
  useRefreshStatus
} from './useMaterializedViews'

// Re-export query client utilities
export { useQueryClient } from '@tanstack/react-query'