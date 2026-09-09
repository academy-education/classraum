"use client"

import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useIsNarrowViewport } from '@/hooks/useResponsiveViewMode'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  /** Search field first, then one child per filter control. */
  children: React.ReactNode
  /** How many filters are set, for the badge on the collapsed button. */
  activeCount?: number
  className?: string
}

/**
 * A list page's search + filter row.
 *
 * Unchanged from `md` up: one flex-wrap row, exactly what these pages had.
 *
 * Below `md` the filters fold behind a button and only the search stays
 * visible. The row was measured at 288px on a 390px screen — /sessions spent
 * 916px, more than a full screen, before its first record, and the filter
 * row was the largest single part of that. Every control wrapped to its own
 * line because a 390px viewport cannot place two of them side by side.
 *
 * The search stays out because it is the one control used on every visit;
 * the rest are occasional and now cost one tap instead of a screen of scroll.
 */
export function FilterBar({ children, activeCount = 0, className }: FilterBarProps) {
  const narrow = useIsNarrowViewport()
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)

  const items = React.Children.toArray(children).filter(Boolean)
  const [search, ...filters] = items

  if (!narrow || filters.length === 0) {
    return <div className={cn('flex flex-wrap gap-4 mb-4', className)}>{children}</div>
  }

  return (
    <div className={cn('mb-4', className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 [&>div]:w-full [&>div]:max-w-none">{search}</div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={String(t('common.filter'))}
          className={cn(
            'relative h-11 w-11 flex-shrink-0 rounded-lg border flex items-center justify-center transition-colors',
            open ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-white text-gray-600'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={2} />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center">
              {activeCount > 9 ? '9+' : activeCount}
            </span>
          )}
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-col gap-2 [&>*]:w-full [&>*]:max-w-none [&_button[role=combobox]]:w-full">
          {filters}
        </div>
      )}
    </div>
  )
}
