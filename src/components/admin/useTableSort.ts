'use client'

import { useMemo } from 'react'
import { useUrlState } from './useUrlState'

export type SortDirection = 'asc' | 'desc' | null

/**
 * useTableSort — small hook for click-to-sort table columns. Sort state is
 * mirrored to URL params so refreshing / sharing the page preserves what
 * the admin was looking at.
 *
 *   const { sortKey, sortDir, toggle, sortIndicator, sorted } = useTableSort(
 *     rows,
 *     {
 *       defaultKey: 'createdAt',
 *       defaultDir: 'desc',
 *       getValue: (row, key) => row[key as keyof typeof row],
 *     }
 *   )
 *
 *   <th onClick={() => toggle('name')}>Name {sortIndicator('name')}</th>
 *   {sorted.map(row => ...)}
 *
 * Toggle cycles `asc → desc → null` (back to API order) per column. Clicking
 * a different column starts at `asc`.
 */
export function useTableSort<T>(
  rows: T[],
  opts: {
    defaultKey?: string
    defaultDir?: 'asc' | 'desc' | ''
    getValue: (row: T, key: string) => string | number | Date | null | undefined
  },
) {
  const [sortKey, setSortKey] = useUrlState('sort', opts.defaultKey || '')
  const [sortDir, setSortDir] = useUrlState('dir', opts.defaultDir || '')

  const toggle = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    // Same column tapped again — cycle direction.
    if (sortDir === 'asc') setSortDir('desc')
    else if (sortDir === 'desc') {
      setSortKey('')
      setSortDir('')
    } else {
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows
    const sign = sortDir === 'asc' ? 1 : -1
    // Stable enough for admin tables; clone first so the input array isn't
    // mutated and re-renders behave.
    return [...rows].sort((a, b) => {
      const av = opts.getValue(a, sortKey)
      const bv = opts.getValue(b, sortKey)
      if (av == null && bv == null) return 0
      if (av == null) return sign
      if (bv == null) return -sign
      if (av instanceof Date && bv instanceof Date) return sign * (av.getTime() - bv.getTime())
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv)
      return sign * String(av).localeCompare(String(bv), undefined, { numeric: true })
    })
  }, [rows, sortKey, sortDir, opts])

  /** Returns "▲" / "▼" / "" for the column header. */
  const sortIndicator = (key: string) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? '▲' : sortDir === 'desc' ? '▼' : ''
  }

  return {
    sortKey,
    sortDir: (sortDir || null) as SortDirection,
    toggle,
    sortIndicator,
    sorted,
  }
}
