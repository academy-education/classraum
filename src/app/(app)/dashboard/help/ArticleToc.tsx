"use client"

import { useEffect, useState } from 'react'

interface TocHeading {
  id: string
  text: string
}

/**
 * Sticky right-rail table of contents for a help article. Highlights
 * the section currently in view using IntersectionObserver — when a
 * heading scrolls past the top of the readable area, it becomes
 * "active." Hidden under lg breakpoint to keep narrow viewports clean.
 *
 * Headings + ids are extracted server-side from the markdown body so
 * the TOC never disagrees with the rendered article.
 */
export function ArticleToc({ headings, label }: { headings: TocHeading[]; label: string }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null)

  useEffect(() => {
    if (!headings.length) return
    const targets = headings
      .map(h => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el != null)
    if (!targets.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting heading — works whether the
        // page scrolls down (next section enters at bottom) or up
        // (prior section enters at top).
        const visible = entries
          .filter(e => e.isIntersecting)
          .map(e => e.target as HTMLElement)
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        if (visible[0]) setActiveId(visible[0].id)
      },
      // rootMargin pulls the "active zone" down ~25% so a heading at
      // the very top of the viewport is what's highlighted, not one
      // that just scrolled out.
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )
    targets.forEach(t => observer.observe(t))
    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  return (
    <nav className="hidden lg:block sticky top-8 self-start w-56 flex-shrink-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-2">
        {label}
      </div>
      <ul className="space-y-1.5 border-l border-gray-200">
        {headings.map(h => {
          const active = h.id === activeId
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={`block -ml-px pl-3 py-0.5 text-sm border-l-2 transition-colors ${
                  active
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
