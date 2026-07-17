"use client"

import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@/app/mobile/study/_shared/icons'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'

interface MobileBackButtonProps {
  /**
   * Optional explicit click handler. Defaults to `router.back()` — i.e. the
   * browser back button. Override when you want to navigate to a specific
   * page rather than the previous history entry (e.g. after a deep-linked
   * arrival where back history is `/`).
   */
  onClick?: () => void
  /**
   * Optional href to push instead of `router.back()`. Convenience for cases
   * where the destination is fixed (e.g. "Back to invoices" → `/mobile/invoices`).
   * Ignored if `onClick` is provided.
   */
  to?: string
  /**
   * Icon size. The header-style back button uses `md` (w-5 h-5); inline
   * footer / detail back buttons use `sm` (w-4 h-4).
   */
  size?: 'sm' | 'md'
  /**
   * Additional class names — applied to the underlying Button.
   */
  className?: string
  /**
   * Optional label text rendered to the right of the icon. Use for inline
   * back buttons like "Back to invoices" rather than the round
   * header-icon-only style.
   */
  label?: string
  /**
   * aria-label override. Defaults to the localized 'common.back' string.
   */
  ariaLabel?: string
}

/**
 * Shared back button for mobile pages. Replaces ~10 hand-rolled
 * `<Button variant="ghost" size="sm" className="p-2"><ArrowLeft .../></Button>`
 * instances that drifted in icon size, color, and aria-labels.
 *
 * Behavior:
 *   - aria-label localized via `t('common.back')` (or override)
 *   - defaults to `router.back()`, override with `onClick` or `to`
 *   - two visual sizes (sm/md) match the existing patterns
 *   - icon-only by default; pass `label` for inline-text variant
 */
export function MobileBackButton({
  onClick,
  to,
  size = 'md',
  className,
  label,
  ariaLabel,
}: MobileBackButtonProps) {
  const router = useRouter()
  const { t } = useTranslation()

  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }
    if (to) {
      router.push(to)
      return
    }
    router.back()
  }

  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const iconColor = label ? '' : 'text-gray-600'
  const wrapperClass = label
    ? className
    : `p-2 ${className ?? ''}`.trim()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={wrapperClass}
      aria-label={ariaLabel ?? String(t('common.back'))}
    >
      <ArrowLeft className={`${iconClass} ${iconColor}`.trim()} />
      {label && <span className="ml-2">{label}</span>}
    </Button>
  )
}
