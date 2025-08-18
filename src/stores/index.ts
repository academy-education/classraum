// Export all Zustand stores
export { useAcademyStore } from './useAcademyStore'
export { useUserStore } from './useUserStore'
export { useUIStore, showSuccessToast, showErrorToast, showWarningToast } from './useUIStore'
export { useDashboardStore } from './useDashboardStore'
export { useGlobalStore } from './useGlobalStore'
export { useAssignmentStore } from './useAssignmentStore'
export { useStudentStore } from './useStudentStore'

// Re-export types for convenience
export type { Academy, AcademyStats } from './useAcademyStore'
export type { User, UserPreferences } from './useUserStore'
export type { Toast, Modal } from './useUIStore'
export type { DashboardMetrics, DashboardFilters } from './useDashboardStore'