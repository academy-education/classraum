"use client"

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sticky toolbar that slides up from the top of the table area whenever
 * one or more rows are selected. Replaces the inlined "N selected + buttons"
 * patterns that exist on payments / families / parents / students today.
 *
 * Usage:
 *   <BulkActionBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
 *     <Button variant="outline" size="sm" onClick={handleArchive}>Archive</Button>
 *     <Button variant="outline" size="sm" className="text-rose-600" onClick={handleDelete}>Delete</Button>
 *   </BulkActionBar>
 */

export interface BulkActionBarProps {
  /** Number of selected items. The bar only renders when this is > 0. */
  selectedCount: number

  /** Called when the user clicks the X / "Clear selection" button. */
  onClear: () => void

  /** Action buttons (typically <Button> components). */
  children?: React.ReactNode

  /** Override the auto-generated label (default: t('common.itemsSelected', { count })). */
  label?: React.ReactNode

  /** Sticky positioning (default true). When false, renders inline. */
  sticky?: boolean

  className?: string
}

export function BulkActionBar({
  selectedCount,
  onClear,
  children,
  label,
  sticky = true,
  className,
}: BulkActionBarProps) {
  const { t } = useTranslation()

  if (selectedCount <= 0) return null

  return (
    <div
      className={cn(
        'bg-primary/5 ring-1 ring-primary/20 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3',
        sticky && 'sticky top-2 z-20 backdrop-blur-sm',
        className
      )}
      role="toolbar"
      aria-label={String(t('common.bulkActions') || 'Bulk actions')}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onClear}
          aria-label={String(t('common.clearSelection') || 'Clear selection')}
          className="w-7 h-7 rounded-md hover:bg-primary/10 flex items-center justify-center text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 flex-shrink-0"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-primary truncate">
          {label ?? t('common.itemsSelected', { count: selectedCount })}
        </span>
      </div>

      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}

// Re-export with a default Button helper for the most common destructive case.
export function BulkActionDeleteButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
    >
      {children ?? t('common.delete')}
    </Button>
  )
}
