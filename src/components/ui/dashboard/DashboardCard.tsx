"use client"

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { cn } from '@/lib/utils'

/**
 * Shared dashboard card pattern, modeled on the classrooms-page card so
 * sessions / assignments / attendance / future pages can render rows with
 * consistent chrome:
 *
 *   ┌─────────────────────────────────┐
 *   │ ▍ accent bar (item color)       │
 *   ├─────────────────────────────────┤
 *   │ STATUS                  [⏸][✎][🗑]│
 *   │ Title                            │
 *   │ subtitle row (icon + text)       │
 *   │ ┌─────┬─────┬─────┐              │
 *   │ │ KEY │ KEY │ KEY │  metric strip│
 *   │ │ val │ val │ val │              │
 *   │ └─────┴─────┴─────┘              │
 *   │ extra meta row (optional)        │
 *   │ notes block (optional)           │
 *   ├─────────────────────────────────┤
 *   │ [Secondary button]               │
 *   │ [Primary button]                 │
 *   └─────────────────────────────────┘
 *
 * Each consumer page picks its own metrics / meta / actions — only the
 * structural layout is shared.
 */

export interface DashboardCardMetric {
  label: React.ReactNode
  value: React.ReactNode
  /** Truncate the value (default true). */
  truncate?: boolean
}

export interface DashboardCardProps {
  /** Hex color for the top accent bar (e.g. classroom color). */
  accentColor?: string
  /** Status / category eyebrow shown above the title. */
  statusLabel?: React.ReactNode
  /** Override the eyebrow color class — defaults to text-gray-500. */
  statusToneClass?: string

  title: React.ReactNode
  /** Optional subtitle row directly under the title (e.g. teacher name). */
  subtitle?: React.ReactNode

  /** Right-side action icons row (edit / delete / pause). Pass <Button> elements. */
  actions?: React.ReactNode

  /** 3-column metric strip with hairline divider above + below. */
  metrics?: DashboardCardMetric[]

  /** Extra meta row(s) between the metric strip and notes — usually icon + text. */
  meta?: React.ReactNode

  /** Optional notes block — rendered in a soft gray box. */
  notes?: React.ReactNode

  /** Bottom action buttons. */
  footerActions?: React.ReactNode

  /** Visual modifier when the entity is paused / disabled. */
  paused?: boolean

  /** Visual modifier when this card represents a virtual / generated item. */
  virtual?: boolean

  className?: string
  onClick?: () => void
}

export function DashboardCard({
  accentColor,
  statusLabel,
  statusToneClass = 'text-gray-500',
  title,
  subtitle,
  actions,
  metrics,
  meta,
  notes,
  footerActions,
  paused = false,
  virtual = false,
  className,
  onClick,
}: DashboardCardProps) {
  return (
    <Card
      className={cn(
        '!gap-0 !py-0 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all flex flex-col h-full overflow-hidden',
        paused && 'opacity-60',
        virtual && 'border-dashed opacity-70',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Top color accent bar */}
      {accentColor && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
      )}

      {/* min-w-0 on the body so flex/grid children can shrink + wrap properly */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 min-w-0">
        {/* Header — status + title + subtitle on left, actions on right.
            Text wraps naturally instead of truncating; cards stretch to fit content. */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1">
            {statusLabel && (
              <Eyebrow className={cn('mb-1 break-words', statusToneClass)}>
                {statusLabel}
              </Eyebrow>
            )}
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight break-words">
              {title}
            </h3>
            {subtitle && (
              <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 min-w-0 break-words [&>span]:break-words">
                {subtitle}
              </div>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-0.5 -mr-1 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* 3-column metric strip with hairline divider */}
        {metrics && metrics.length > 0 && (
          <div
            className={cn(
              'grid gap-2 my-3 py-3 border-y border-gray-100',
              metrics.length === 2 ? 'grid-cols-2' :
              metrics.length === 3 ? 'grid-cols-3' :
              metrics.length === 4 ? 'grid-cols-4' :
              'grid-cols-3'
            )}
          >
            {metrics.map((metric, i) => (
              <div key={i} className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5 break-words">
                  {metric.label}
                </p>
                <p className={cn(
                  'text-sm font-semibold text-gray-900 break-words',
                  // Opt-in truncate (rarely needed now that wrap is default)
                  metric.truncate && 'truncate'
                )}>
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Meta row(s) — wraps onto multiple lines if long. */}
        {meta && (
          <div className="text-xs text-gray-500 mb-3 space-y-1 min-w-0 [&>div]:min-w-0 [&>div]:items-start [&>div>span]:break-words">
            {meta}
          </div>
        )}

        {/* Notes block — clamped to 2 lines by default to keep cards a
            predictable height. Long descriptions stay legible without
            blowing out a card grid row. */}
        {notes && (
          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-3">
            <p className="text-xs text-gray-600 break-words line-clamp-2">{notes}</p>
          </div>
        )}

        {/* Footer actions push to bottom. Buttons wrap their text instead of
            truncating; long labels become 2 lines and the button grows. */}
        {footerActions && (
          <div className="mt-auto pt-3 space-y-1.5 min-w-0 [&_button]:min-w-0 [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-9 [&_button]:py-1.5">
            {footerActions}
          </div>
        )}
      </div>
    </Card>
  )
}
