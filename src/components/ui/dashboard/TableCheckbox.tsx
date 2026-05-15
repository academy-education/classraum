"use client"

import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Polished checkbox shared across every dashboard surface — table headers,
 * table rows, bulk-select lists, modal forms, etc.
 *
 * Visual contract:
 * - 16px square, white fill, gray-300 border at rest
 * - Hovers to primary/60 border
 * - Filled with primary + white Check icon when `checked`
 * - Filled with primary + white Minus icon when `indeterminate` (header partial-select)
 * - 2px primary/40 focus ring with offset
 *
 * Why one component: payments / sessions / students / teachers / families /
 * parents / notifications / reports each used to ship their own inline copy
 * of this; consolidating here is the source of truth so visual changes
 * propagate everywhere.
 */

export interface TableCheckboxProps {
  checked: boolean
  /** Header "select all" partial state. Ignored when `checked` is true. */
  indeterminate?: boolean
  onChange: () => void
  ariaLabel: string
  /** Useful inside a row that has its own onClick (stop propagation). */
  onClick?: (e: React.MouseEvent) => void
  /** Disable the input. */
  disabled?: boolean
  /** Optional id, useful when paired with a `<label htmlFor="…">`. */
  id?: string
  className?: string
}

export function TableCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  onClick,
  disabled,
  id,
  className,
}: TableCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <span className={cn('relative inline-flex items-center justify-center align-middle', className)}>
      <input
        ref={ref}
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          'peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-gray-300 bg-white shadow-sm transition-colors',
          'hover:border-primary/60',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
          'checked:border-primary checked:bg-primary',
          'indeterminate:border-primary indeterminate:bg-primary',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      />
      <Check
        className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
      />
      {indeterminate && !checked && (
        <Minus
          className="pointer-events-none absolute h-3 w-3 text-white"
          strokeWidth={3}
        />
      )}
    </span>
  )
}
