"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

type Size = 'sm' | 'md' | 'lg'

interface ErrorStateProps {
  /** Optional override; defaults to a localised "Something went wrong" string. */
  title?: string
  /** Optional override; defaults to a generic localised retry message. */
  description?: React.ReactNode
  /** Click handler for the primary "Try again" button. Required for the
   *  button to render — pages that genuinely can't retry should omit it. */
  onRetry?: () => void
  /** Override the primary button label (defaults to localised "Try again"). */
  retryLabel?: string
  size?: Size
  className?: string
}

/**
 * The error counterpart to EmptyState. Use whenever a data fetch fails so
 * the user sees something other than a blank screen or a "no data" state
 * that's indistinguishable from a real empty list.
 *
 * Worst pre-launch UX issue we found: every page that catches a fetch
 * error converts it to `setData([])`, making the error look identical to
 * "nothing here." This component is the standard way to break that
 * pattern — pages add an `error` state alongside `data` + `loading`,
 * render this when `error` is set, and offer a retry.
 *
 * API mirrors EmptyState (icon + title + description + action) but pinned
 * to a rose tint + AlertTriangle icon + built-in localised retry button.
 */
const sizeMap: Record<Size, {
  wrap: string
  chip: string
  icon: string
  title: string
  desc: string
  spacing: { afterIcon: string; afterTitle: string; afterDesc: string }
}> = {
  sm: {
    wrap: 'py-6 px-4',
    chip: 'w-10 h-10',
    icon: 'w-5 h-5',
    title: 'text-sm font-semibold',
    desc: 'text-xs',
    spacing: { afterIcon: 'mb-2', afterTitle: 'mb-1', afterDesc: 'mb-3' },
  },
  md: {
    wrap: 'py-10 px-4',
    chip: 'w-16 h-16',
    icon: 'w-7 h-7',
    title: 'text-lg font-semibold',
    desc: 'text-sm',
    spacing: { afterIcon: 'mb-4', afterTitle: 'mb-2', afterDesc: 'mb-5' },
  },
  lg: {
    wrap: 'py-16 px-6',
    chip: 'w-20 h-20',
    icon: 'w-9 h-9',
    title: 'text-xl font-semibold',
    desc: 'text-base',
    spacing: { afterIcon: 'mb-5', afterTitle: 'mb-3', afterDesc: 'mb-6' },
  },
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  size = 'md',
  className = '',
}: ErrorStateProps) {
  const { t } = useTranslation()
  const s = sizeMap[size]

  const resolvedTitle = title ?? String(t('common.errorState.title'))
  const resolvedDesc = description ?? String(t('common.errorState.description'))
  const resolvedRetryLabel = retryLabel ?? String(t('common.errorState.retry'))

  return (
    <div className={`text-center ${s.wrap} ${className}`}>
      <div
        className={`mx-auto ${s.chip} rounded-2xl bg-rose-50 flex items-center justify-center ${s.spacing.afterIcon}`}
        aria-hidden="true"
      >
        <AlertTriangle className={`${s.icon} text-rose-600`} />
      </div>
      <h3 className={`${s.title} text-gray-900 ${s.spacing.afterTitle}`}>{resolvedTitle}</h3>
      {resolvedDesc && (
        <p className={`${s.desc} text-gray-600 ${s.spacing.afterDesc} max-w-md mx-auto`}>
          {resolvedDesc}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size={size === 'sm' ? 'sm' : 'default'}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {resolvedRetryLabel}
        </Button>
      )}
    </div>
  )
}
