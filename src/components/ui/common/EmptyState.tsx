"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LucideIcon, BookOpen } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'
type Variant = 'default' | 'subtle'

interface ActionConfig {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  /** String or React node — useful when interpolating things like a search query. */
  description?: React.ReactNode
  /** Primary CTA. Renders a default-variant Button (or outline if actionVariant='outline'). */
  actionLabel?: string
  onAction?: () => void
  /** Use 'outline' for remedial actions like "Clear filter" / "Reset search". */
  actionVariant?: 'default' | 'outline'
  /** Optional icon prepended inside the primary button (e.g. <Plus/> for "Add"). */
  actionIcon?: React.ReactNode
  /** Secondary action shown beside the primary as a ghost link. */
  secondaryAction?: ActionConfig
  /**
   * Slug of the help article that explains this page. When set, a
   * "Learn more →" link is rendered as a tertiary action that opens the
   * relevant help article — gives users an out when they're new and the
   * empty state alone doesn't answer "what is this page?"
   *
   * Just the slug — not the full URL — so the link can be updated
   * centrally if we ever move the docs route.
   */
  helpSlug?: string
  /** Override the localised "Learn more" label if you want different copy. */
  helpLabel?: string
  /**
   * `md` (default) is full-page sized — fits inside a card / table / page body.
   * `sm` is for compact contexts (dropdowns, narrow card bodies).
   * `lg` is for hero-sized empties (full-screen-ish onboarding).
   */
  size?: Size
  /**
   * `default` shows the rounded icon chip behind the icon.
   * `subtle` removes the chip — for very tight spaces or already-decorated parents.
   */
  variant?: Variant
  className?: string
}

const sizeMap: Record<Size, {
  wrap: string
  chip: string
  icon: string
  iconBare: string
  title: string
  desc: string
  spacing: { afterIcon: string; afterTitle: string; afterDesc: string }
}> = {
  sm: {
    wrap: 'py-6 px-4',
    chip: 'w-10 h-10',
    icon: 'w-5 h-5',
    iconBare: 'w-6 h-6',
    title: 'text-sm font-semibold',
    desc: 'text-xs',
    spacing: { afterIcon: 'mb-2', afterTitle: 'mb-1', afterDesc: 'mb-3' },
  },
  md: {
    wrap: 'py-10 px-4',
    chip: 'w-16 h-16',
    icon: 'w-7 h-7',
    iconBare: 'w-10 h-10',
    title: 'text-lg font-semibold',
    desc: 'text-sm',
    spacing: { afterIcon: 'mb-4', afterTitle: 'mb-2', afterDesc: 'mb-5' },
  },
  lg: {
    wrap: 'py-16 px-6',
    chip: 'w-20 h-20',
    icon: 'w-9 h-9',
    iconBare: 'w-12 h-12',
    title: 'text-xl font-semibold',
    desc: 'text-base',
    spacing: { afterIcon: 'mb-5', afterTitle: 'mb-3', afterDesc: 'mb-6' },
  },
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'default',
  actionIcon,
  secondaryAction,
  helpSlug,
  helpLabel,
  size = 'md',
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const s = sizeMap[size]
  const hasAction = (actionLabel && onAction) || secondaryAction || helpSlug

  return (
    <div className={`text-center ${s.wrap} ${className}`}>
      {variant === 'default' ? (
        <div className={`${s.chip} rounded-full bg-primary/10 flex items-center justify-center mx-auto ${s.spacing.afterIcon}`}>
          <Icon className={`${s.icon} text-primary`} strokeWidth={1.75} />
        </div>
      ) : (
        <Icon className={`${s.iconBare} text-gray-300 mx-auto ${s.spacing.afterIcon}`} strokeWidth={1.75} />
      )}

      <h3 className={`${s.title} text-gray-900 ${s.spacing.afterTitle}`}>{title}</h3>

      {description && (
        <p className={`${s.desc} text-gray-500 ${hasAction ? s.spacing.afterDesc : ''} max-w-xs mx-auto`}>
          {description}
        </p>
      )}

      {hasAction && (
        <div className="flex items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              variant={actionVariant}
              size={size === 'sm' ? 'sm' : 'default'}
              className={actionIcon ? 'flex items-center gap-2' : undefined}
            >
              {actionIcon}
              {actionLabel}
            </Button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              {secondaryAction.label}
            </button>
          )}
          {helpSlug && (
            <Link
              href={`/dashboard/help/${helpSlug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary hover:underline underline-offset-4"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {helpLabel || 'Learn more'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
