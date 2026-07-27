// React Query hooks for API management.
//
// useAcademyQueries, useDashboardQueries and useMaterializedViews were
// removed: all 25 hooks they exported had zero call sites, and they
// queried a schema that partly never existed in this database
// (`profiles`, `sessions`, `student_payments`, `pg_stat_user_tables`).
// Wiring any of them up would have returned nothing, silently. See the
// commit that deleted them for the full reference list.
//
// NOTE: useUserQueries below is also unreferenced — nothing outside this
// directory imports from '@/hooks/api' at all.
export * from './useUserQueries'

// Re-export query client utilities
export { useQueryClient } from '@tanstack/react-query'
