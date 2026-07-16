"use client"

import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from './icons'
import { hapticTap } from '@/lib/nativeHaptics'
import { cn } from '@/lib/utils'

/**
 * The one study-mode button. Before this, the primary gradient CTA had 8+
 * slightly different shadow/ring/text/shape combos scattered across screens —
 * the single biggest "unfinished" tell. Everything routes through here now so
 * the button looks and feels identical everywhere.
 *
 * Native feel is built in: every press fires a light haptic (hapticTap),
 * and the whole set shares one active:scale press animation.
 *
 *   <StudyButton onClick={…}>Start test</StudyButton>              // primary pill
 *   <StudyButton variant="secondary" size="sm">Cancel</StudyButton>
 *   <StudyButton loading fullWidth>Saving…</StudyButton>
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  // Solid brand gradient — the standard call to action.
  primary:
    'bg-gradient-to-b from-primary to-primary/90 text-white ring-1 ring-primary/20 ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] ' +
    'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_14px_rgba(40,133,232,0.34)] ' +
    'disabled:opacity-40',
  // Neutral surface — secondary actions, cancels.
  secondary:
    'bg-white text-gray-700 ring-1 ring-gray-200/70 ' +
    'hover:ring-gray-300 hover:bg-gray-50 disabled:opacity-50',
  // No chrome until pressed — tertiary / inline actions.
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100/70 disabled:opacity-40',
  // White pill on a coloured/gradient surface (hero cards, upsell banners).
  inverse:
    'bg-white text-primary ring-1 ring-black/[0.03] ' +
    'shadow-[0_2px_10px_rgba(0,0,0,0.12)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.16)] disabled:opacity-70',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
}

/** The shared button className — use on a `<Link>`/`<a>` CTA so it matches
 *  StudyButton exactly (the component wraps this + adds haptics). */
export function studyButtonClass(opts: {
  variant?: Variant; size?: Size; fullWidth?: boolean; square?: boolean; className?: string
} = {}): string {
  const { variant = 'primary', size = 'md', fullWidth, square, className } = opts
  return cn(
    'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
    'transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
    square ? 'rounded-xl' : 'rounded-full',
    fullWidth && 'w-full',
    SIZES[size],
    VARIANTS[variant],
    className,
  )
}

export interface StudyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  /** Square-ish corners instead of the default pill (e.g. sitting inside a field). */
  square?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const StudyButton = forwardRef<HTMLButtonElement, StudyButtonProps>(function StudyButton(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    square = false,
    leftIcon,
    rightIcon,
    disabled,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      onClick={e => {
        // Light tactile confirmation on every press — no-ops off native.
        if (!disabled && !loading) hapticTap()
        onClick?.(e)
      }}
      className={studyButtonClass({ variant, size, fullWidth, square, className })}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
})
