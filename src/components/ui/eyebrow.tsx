import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Small uppercase eyebrow label — the section/category prefix used above
 * titles, value pairs, and section panels.
 *
 * Replaces the inlined pattern repeated across the app:
 *   <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
 *     Academy
 *   </p>
 *
 * Usage:
 *   <Eyebrow>Academy</Eyebrow>
 *   <Eyebrow as="h2">Today's Sessions</Eyebrow>
 *   <Eyebrow tone="primary">3 New</Eyebrow>
 */

type EyebrowElement = 'p' | 'span' | 'div' | 'h2' | 'h3' | 'h4'

export type EyebrowTone = 'gray' | 'primary' | 'subtle'

export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render — defaults to <p>. Use heading tags for semantic section labels. */
  as?: EyebrowElement
  tone?: EyebrowTone
}

const TONE_CLASSES: Record<EyebrowTone, string> = {
  gray: 'text-gray-500',
  primary: 'text-primary',
  // For very-subtle eyebrows (footers, sub-rows where the eyebrow shouldn't compete with content)
  subtle: 'text-gray-400',
}

export function Eyebrow({
  as: Component = 'p',
  tone = 'gray',
  className,
  children,
  ...props
}: EyebrowProps) {
  return (
    <Component
      className={cn(
        'text-[10px] font-semibold uppercase tracking-[0.12em]',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
