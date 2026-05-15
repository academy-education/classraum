/**
 * Shared dashboard primitives. Use these to build new dashboard pages or
 * refactor existing ones away from inlined card / table / toolbar patterns.
 *
 * The pattern is "structural skeleton + consumer-supplied content" — each
 * primitive defines the shell, accent, spacing, and chrome; the consumer
 * fills in icons, copy, columns, actions, etc.
 */

export { DashboardCard } from './DashboardCard'
export type { DashboardCardProps, DashboardCardMetric } from './DashboardCard'

export { DataTable } from './DataTable'
export type {
  DataTableProps,
  DataTableColumn,
  DataTableSortState,
  SortDirection,
} from './DataTable'

export { BulkActionBar } from './BulkActionBar'
export type { BulkActionBarProps } from './BulkActionBar'

export { TableCheckbox } from './TableCheckbox'
export type { TableCheckboxProps } from './TableCheckbox'
