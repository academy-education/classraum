"use client"

import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Generic responsive data table for the dashboard.
 *
 * - Sortable columns (click header to toggle)
 * - Row selection (checkboxes, controlled)
 * - Hover + click navigation
 * - Mobile responsive: collapses to a card stack via `mobileRender`
 * - Sticky header (optional)
 * - Empty + loading states baked in
 *
 * Designed to be the single table primitive for sessions / payments / students /
 * teachers / families / parents / etc. Each consumer page passes its column
 * definitions and a mobileRender function for the card fallback.
 */

export interface DataTableColumn<T> {
  /** Stable id used for sort + key. */
  id: string
  /** Header label. */
  header: React.ReactNode
  /** Cell renderer — receives the row + index. */
  cell: (row: T, index: number) => React.ReactNode
  /** Enable sort on this column. */
  sortable?: boolean
  /** Override the default sort comparator (asc). */
  sortFn?: (a: T, b: T) => number
  /** Tailwind classes for the <th> + <td> (alignment, width, etc.) */
  className?: string
  /** Hide on small screens (consumers can fold these into mobileRender instead). */
  hideOnMobile?: boolean
  /** Right-align numeric columns. */
  align?: 'left' | 'center' | 'right'
}

export type SortDirection = 'asc' | 'desc' | null

export interface DataTableSortState {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface DataTableProps<T> {
  /** Row data. */
  data: T[]
  /** Column definitions. */
  columns: DataTableColumn<T>[]
  /** Stable row id getter — also used for selection. */
  getRowId: (row: T) => string

  /** Loading state — renders skeletons. */
  loading?: boolean
  /** Skeleton row count when loading. Default 5. */
  skeletonRows?: number

  /** Selection (controlled). Pass undefined to disable selection. */
  selection?: {
    selected: Set<string>
    onChange: (selected: Set<string>) => void
  }

  /** Sort (controlled). When sort is provided, the table assumes data is already sorted. */
  sort?: {
    state: DataTableSortState | null
    onChange: (next: DataTableSortState | null) => void
  }

  /** Row click handler — navigate to detail / open sheet. */
  onRowClick?: (row: T) => void

  /** Mobile card-fallback renderer. When provided, table is hidden on mobile and a card stack is shown. */
  mobileRender?: (row: T, index: number) => React.ReactNode

  /** Empty state customization. */
  emptyState?: {
    icon?: React.ComponentType<{ className?: string }>
    title: string
    description?: string
  }

  /** Sticky header (default true). */
  stickyHeader?: boolean

  className?: string
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  loading = false,
  skeletonRows = 5,
  selection,
  sort,
  onRowClick,
  mobileRender,
  emptyState,
  stickyHeader = true,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const allSelected = selection && data.length > 0 && data.every(row => selection.selected.has(getRowId(row)))
  const someSelected = selection && data.some(row => selection.selected.has(getRowId(row))) && !allSelected

  const handleSelectAll = () => {
    if (!selection) return
    if (allSelected) {
      // Deselect all currently visible
      const next = new Set(selection.selected)
      data.forEach(row => next.delete(getRowId(row)))
      selection.onChange(next)
    } else {
      // Select all currently visible
      const next = new Set(selection.selected)
      data.forEach(row => next.add(getRowId(row)))
      selection.onChange(next)
    }
  }

  const handleSelectRow = (rowId: string) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (next.has(rowId)) next.delete(rowId)
    else next.add(rowId)
    selection.onChange(next)
  }

  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!sort || !column.sortable) return
    const currentDir = sort.state?.columnId === column.id ? sort.state.direction : null
    const nextDir: SortDirection =
      currentDir === null ? 'asc' :
      currentDir === 'asc' ? 'desc' :
      null
    sort.onChange(nextDir === null ? null : { columnId: column.id, direction: nextDir })
  }

  // Sort the data if sort state present and consumer hasn't pre-sorted
  // (consumer-pre-sorted: the sort comparator on the column was used externally;
  // we still apply if a sortFn is provided + sort state is set)
  const displayData = React.useMemo(() => {
    if (!sort?.state) return data
    const col = columns.find(c => c.id === sort.state!.columnId)
    if (!col?.sortFn) return data
    const sorted = [...data].sort(col.sortFn)
    if (sort.state.direction === 'desc') sorted.reverse()
    return sorted
  }, [data, sort, columns])

  // ===== Mobile card-stack fallback =====
  if (mobileRender) {
    return (
      <>
        {/* Mobile: card stack */}
        <div className={cn('block md:hidden space-y-2', className)}>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <Card key={i} className="p-4 h-24 animate-pulse" />
            ))
          ) : displayData.length === 0 ? (
            emptyState ? (
              <Card>
                <EmptyState
                  icon={(emptyState.icon ?? (() => null)) as unknown as LucideIcon}
                  title={emptyState.title}
                  description={emptyState.description}
                  size="sm"
                />
              </Card>
            ) : null
          ) : (
            displayData.map((row, i) => (
              <div key={getRowId(row)}>{mobileRender(row, i)}</div>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className={cn('hidden md:block', className)}>
          <DesktopTable
            data={displayData}
            columns={columns}
            getRowId={getRowId}
            loading={loading}
            skeletonRows={skeletonRows}
            selection={selection}
            sort={sort}
            onRowClick={onRowClick}
            emptyState={emptyState}
            stickyHeader={stickyHeader}
            allSelected={allSelected ?? false}
            someSelected={someSelected ?? false}
            handleSelectAll={handleSelectAll}
            handleSelectRow={handleSelectRow}
            handleSortClick={handleSortClick}
            t={t}
          />
        </div>
      </>
    )
  }

  // No mobile fallback: just render the table at all breakpoints
  return (
    <div className={className}>
      <DesktopTable
        data={displayData}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        skeletonRows={skeletonRows}
        selection={selection}
        sort={sort}
        onRowClick={onRowClick}
        emptyState={emptyState}
        stickyHeader={stickyHeader}
        allSelected={allSelected ?? false}
        someSelected={someSelected ?? false}
        handleSelectAll={handleSelectAll}
        handleSelectRow={handleSelectRow}
        handleSortClick={handleSortClick}
        t={t}
      />
    </div>
  )
}

// Re-import the polished checkbox from the shared primitive — single source of truth.
import { TableCheckbox } from './TableCheckbox'

// ===== Internal desktop table renderer =====

interface DesktopTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  loading: boolean
  skeletonRows: number
  selection?: DataTableProps<T>['selection']
  sort?: DataTableProps<T>['sort']
  onRowClick?: (row: T) => void
  emptyState?: DataTableProps<T>['emptyState']
  stickyHeader: boolean
  allSelected: boolean
  someSelected: boolean
  handleSelectAll: () => void
  handleSelectRow: (rowId: string) => void
  handleSortClick: (column: DataTableColumn<T>) => void
  t: (key: string) => string | string[]
}

function DesktopTable<T>({
  data,
  columns,
  getRowId,
  loading,
  skeletonRows,
  selection,
  sort,
  onRowClick,
  emptyState,
  stickyHeader,
  allSelected,
  someSelected,
  handleSelectAll,
  handleSelectRow,
  handleSortClick,
  t,
}: DesktopTableProps<T>) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn(
            'bg-gray-50/60',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {selection && (
                <th scope="col" className="w-10 px-4 py-3 text-left">
                  <TableCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    ariaLabel={String(t('common.selectAll') || 'Select all')}
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sort?.state?.columnId === col.id
                const dir = isSorted ? sort?.state?.direction : null
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={
                      !col.sortable ? undefined :
                      dir === 'asc' ? 'ascending' :
                      dir === 'desc' ? 'descending' :
                      'none'
                    }
                    className={cn(
                      'px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500',
                      col.align === 'right' ? 'text-right' :
                      col.align === 'center' ? 'text-center' :
                      'text-left',
                      col.hideOnMobile && 'hidden lg:table-cell',
                      col.className
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(col)}
                        className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                      >
                        {col.header}
                        {dir === 'asc' ? <ChevronUp className="w-3 h-3" /> :
                         dir === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                         <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  {selection && <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-100 rounded" /></td>}
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-4 py-3',
                        col.hideOnMobile && 'hidden lg:table-cell'
                      )}
                    >
                      <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7) % 30)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection ? 1 : 0)} className="px-4 py-10">
                  {emptyState ? (
                    <EmptyState
                      icon={(emptyState.icon ?? (() => null)) as unknown as LucideIcon}
                      title={emptyState.title}
                      description={emptyState.description}
                      size="sm"
                    />
                  ) : (
                    <p className="text-center text-sm text-gray-500">{String(t('common.noResults') || 'No results')}</p>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row)
                const isSelected = selection?.selected.has(rowId) ?? false
                return (
                  <tr
                    key={rowId}
                    onClick={(e) => {
                      // Don't fire row click when clicking the checkbox or interactive elements inside cells
                      const target = e.target as HTMLElement
                      if (target.closest('button, a, input, [role="button"]')) return
                      onRowClick?.(row)
                    }}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
                    )}
                  >
                    {selection && (
                      <td className="px-4 py-3">
                        <TableCheckbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          onClick={(e) => e.stopPropagation()}
                          ariaLabel={String(t('common.selectRow') || 'Select row')}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          'px-4 py-3 text-gray-900',
                          col.align === 'right' ? 'text-right' :
                          col.align === 'center' ? 'text-center' :
                          'text-left',
                          col.hideOnMobile && 'hidden lg:table-cell',
                          col.className
                        )}
                      >
                        {col.cell(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
