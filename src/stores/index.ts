// Export all Zustand stores
export { useAcademyStore } from './useAcademyStore'
export { useUserStore } from './useUserStore'
export { useUIStore, showSuccessToast, showErrorToast, showWarningToast } from './useUIStore'
export { useDashboardStore } from './useDashboardStore'
export { useDashboardLayoutStore, getCardsBySection, getVisibleCardsBySection } from './useDashboardLayoutStore'
export { useGlobalStore } from './useGlobalStore'
export { useAssignmentStore } from './useAssignmentStore'
export { useStudentStore } from './useStudentStore'

// Re-export types for convenience
// Note: Commented out until types are properly exported from their respective stores
// export type { Academy, AcademyStats } from './useAcademyStore'
// export type { User, UserPreferences } from './useUserStore'
// export type { Toast, Modal } from './useUIStore'
// export type { DashboardMetrics, DashboardFilters } from './useDashboardStore'