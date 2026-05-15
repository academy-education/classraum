import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Soft-palette status pill.
 *
 * Replaces the inlined pattern repeated across the app:
 *   <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
 *     Paid
 *   </span>
 *
 * Usage:
 *   <StatusPill tone="emerald">Paid</StatusPill>
 *   <StatusPill tone="rose" size="md">Overdue</StatusPill>
 */

export type StatusPillTone =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'blue'
  | 'violet'
  | 'gray'
  | 'primary'

export type StatusPillSize = 'sm' | 'md'

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusPillTone
  size?: StatusPillSize
}

const TONE_CLASSES: Record<StatusPillTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  blue: 'bg-blue-50 text-blue-700',
  violet: 'bg-violet-50 text-violet-700',
  gray: 'bg-gray-50 text-gray-700',
  primary: 'bg-primary/10 text-primary',
}

const SIZE_CLASSES: Record<StatusPillSize, string> = {
  // sm: 10px label — used in compact list rows / cards (mobile)
  sm: 'px-2 py-0.5 text-[10px] font-semibold',
  // md: 12px label — used in headers / hero sections
  md: 'px-2.5 py-0.5 text-xs font-semibold',
}

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  function StatusPill(
    { className, tone = 'gray', size = 'sm', children, ...props },
    ref
  ) {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full',
          TONE_CLASSES[tone],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)
