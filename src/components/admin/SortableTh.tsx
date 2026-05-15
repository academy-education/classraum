'use client'

import React from 'react'

/**
 * SortableTh — clickable `<th>` that pairs with `useTableSort`.
 *
 *   <SortableTh sortKey="name" toggle={toggleSort} indicator={sortIndicator('name')}>
 *     Academy
 *   </SortableTh>
 *
 * Renders the column label + a small ▲/▼ indicator when the column is the
 * active sort key. Hover state nudges color so the affordance reads as
 * interactive.
 */
export function SortableTh({
  sortKey,
  toggle,
  indicator,
  align = 'left',
  children,
}: {
  sortKey: string
  toggle: (key: string) => void
  indicator: string
  align?: 'left' | 'right' | 'center'
  children: React.ReactNode
}) {
  const alignClass =
    align === 'right' ? 'text-right' :
    align === 'center' ? 'text-center' :
    'text-left'
  return (
    <th className={`px-6 py-3 ${alignClass} text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]`}>
      <button
        type="button"
        onClick={() => toggle(sortKey)}
        className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
        aria-label={`Sort by ${typeof children === 'string' ? children : sortKey}`}
      >
        {children}
        {indicator && <span className="text-[#2885e8]">{indicator}</span>}
      </button>
    </th>
  )
}
