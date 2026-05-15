import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Soft-palette icon chip — square, rounded, tonal background, tonal icon.
 *
 * Replaces the inlined pattern repeated across the app:
 *   <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
 *     <BookOpen className="w-4 h-4 text-sky-700" strokeWidth={1.75} />
 *   </div>
 *
 * Usage:
 *   <IconChip icon={BookOpen} tone="sky" />
 *   <IconChip icon={CheckCircle2} tone="emerald" size="lg" />
 */

export type IconChipTone =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'violet'
  | 'gray'
  | 'primary'

export type IconChipSize = 'sm' | 'md' | 'lg'

export interface IconChipProps {
  icon: LucideIcon
  tone?: IconChipTone
  size?: IconChipSize
  /** Override default strokeWidth (1.75 for tonal, 2 for primary). */
  strokeWidth?: number
  className?: string
  /** aria-hidden by default — chip is decorative when paired with a label. */
  'aria-hidden'?: boolean
}

const TONE_BG: Record<IconChipTone, string> = {
  emerald: 'bg-emerald-50',
  amber: 'bg-amber-50',
  rose: 'bg-rose-50',
  sky: 'bg-sky-50',
  violet: 'bg-violet-50',
  gray: 'bg-gray-50',
  primary: 'bg-primary/10',
}

const TONE_ICON: Record<IconChipTone, string> = {
  emerald: 'text-emerald-700',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  sky: 'text-sky-700',
  violet: 'text-violet-600',
  gray: 'text-gray-600',
  primary: 'text-primary',
}

const SIZE_CHIP: Record<IconChipSize, string> = {
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-12 h-12 rounded-xl',
}

const SIZE_ICON: Record<IconChipSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function IconChip({
  icon: Icon,
  tone = 'gray',
  size = 'md',
  strokeWidth,
  className,
  'aria-hidden': ariaHidden = true,
}: IconChipProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        SIZE_CHIP[size],
        TONE_BG[tone],
        className
      )}
      aria-hidden={ariaHidden}
    >
      <Icon
        className={cn(SIZE_ICON[size], TONE_ICON[tone])}
        strokeWidth={strokeWidth ?? 1.75}
      />
    </div>
  )
}
