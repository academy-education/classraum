"use client"

import { Fragment } from 'react'
import { mathSegments } from '@/lib/study/math-text'

/**
 * Renders bank text with real maths typography: x^2 as a superscript, x_i as
 * a subscript, sqrt(41) as a radical over its argument, and * <= >= != pi as
 * × ≤ ≥ ≠ π. The stored text is never changed (see lib/study/math-text.ts),
 * so every place a question, choice, passage or explanation reaches a student
 * should go through this.
 */
export function MathText({ text, className }: { text: string | null | undefined; className?: string }) {
  const segs = mathSegments(text)
  const body = segs.map((g, i) => {
    if (g.kind === 'text') return <Fragment key={i}>{g.text}</Fragment>
    if (g.kind === 'sup') return <sup key={i} className="text-[0.72em] leading-none align-super">{g.text}</sup>
    if (g.kind === 'sub') return <sub key={i} className="text-[0.72em] leading-none align-sub">{g.text}</sub>
    return (
      <span key={i} className="whitespace-nowrap">
        √<span className="border-t border-current pt-[1px]">{g.text}</span>
      </span>
    )
  })
  return className ? <span className={className}>{body}</span> : <>{body}</>
}
