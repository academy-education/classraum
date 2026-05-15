'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

/**
 * StatusBadge — single source of truth for the "pill" UI used across admin
 * tables. Replaces the dozen ad-hoc `inline-flex items-center px-2 py-0.5
 * rounded text-xs ...` definitions scattered through the management pages.
 *
 * Tones map semantic states to color pairs that read consistently:
 *   active   → emerald   (healthy, on)
 *   pending  → amber     (waiting / needs attention)
 *   suspended/danger → rose
 *   info     → sky       (neutral informational)
 *   brand    → primary   (active subscription tiers, featured rows)
 *   muted    → slate     (free / inactive / archived)
 *   violet   → violet    (special states like "pending invite")
 */
export type StatusTone =
  | 'active'
  | 'pending'
  | 'danger'
  | 'info'
  | 'brand'
  | 'muted'
  | 'violet'

const toneMap: Record<StatusTone, string> = {
  active:  'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  pending: 'bg-amber-50  text-amber-700   ring-amber-200/70',
  danger:  'bg-rose-50   text-rose-700    ring-rose-200/70',
  info:    'bg-sky-50    text-sky-700     ring-sky-200/70',
  brand:   'bg-[#2885e8]/10 text-[#1f6fc7] ring-[#2885e8]/20',
  muted:   'bg-slate-100 text-slate-700   ring-slate-200/70',
  violet:  'bg-violet-50 text-violet-700  ring-violet-200/70',
}

interface StatusBadgeProps {
  tone: StatusTone
  icon?: LucideIcon
  children: React.ReactNode
  /** 'sm' for tighter contexts (dense tables); 'md' default. */
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ tone, icon: Icon, children, size = 'md', className }: StatusBadgeProps) {
  const sizing =
    size === 'sm'
      ? 'px-1.5 h-5 text-[11px] gap-1'
      : 'px-2 h-6 text-xs gap-1.5'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 whitespace-nowrap',
        sizing,
        toneMap[tone],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.25} />}
      {children}
    </span>
  )
}
