"use client"

import Link from 'next/link'
import { useMemo, useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface Entry {
  slug: string
  title: string
  blurb: string
  body: string
}

interface Match {
  entry: Entry
  score: number
  /** Up to ~140 chars around the first body match — for the result preview. */
  snippet: string
}

/**
 * Substring search over the help center. Cheap and predictable —
 * scores title hits high, blurb mid, body low; first hit in body
 * earns a small position bonus. No fuzzy or stemming, since users
 * here are looking for known feature names ("classroom", "리포트",
 * "share test"), not freeform queries.
 */
function search(entries: Entry[], q: string): Match[] {
  if (!q.trim()) return []
  const needle = q.toLowerCase().trim()
  const out: Match[] = []
  for (const entry of entries) {
    const title = entry.title.toLowerCase()
    const blurb = entry.blurb.toLowerCase()
    const body = entry.body.toLowerCase()
    let score = 0
    if (title.includes(needle)) score += 100
    if (title.startsWith(needle)) score += 50
    if (blurb.includes(needle)) score += 25
    const bodyIdx = body.indexOf(needle)
    if (bodyIdx >= 0) {
      score += 10
      // Earlier matches rank higher — capped so it never overrides a
      // title match.
      score += Math.max(0, 10 - Math.floor(bodyIdx / 500))
    }
    if (score === 0) continue
    const snippetStart = bodyIdx >= 0 ? Math.max(0, bodyIdx - 30) : 0
    const snippet = bodyIdx >= 0
      ? entry.body.slice(snippetStart, snippetStart + 140) + (entry.body.length > snippetStart + 140 ? '…' : '')
      : entry.blurb
    out.push({ entry, score, snippet })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6)
}

interface HelpSearchProps {
  entries: Entry[]
  placeholder: string
  noResults: string
}

export function HelpSearch({ entries, placeholder, noResults }: HelpSearchProps) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const results = useMemo(() => search(entries, q), [entries, q])

  // Close the results dropdown when clicking outside or pressing Esc.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-10 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary focus-visible:ring-0"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-xl ring-1 ring-gray-100 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">{noResults}</div>
          ) : (
            <ul>
              {results.map(({ entry, snippet }) => (
                <li key={entry.slug} className="border-b border-gray-50 last:border-0">
                  <Link
                    href={`/dashboard/help/${entry.slug}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{entry.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{snippet}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
