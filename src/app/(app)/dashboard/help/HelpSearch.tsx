"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useEffect, useRef, ReactNode } from 'react'
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

/**
 * Wrap every case-insensitive occurrence of `needle` in the source
 * string with a <mark>. Skips needles that are empty or longer than the
 * source — safe to call without pre-checks from the result list.
 */
function highlight(source: string, needle: string): ReactNode {
  if (!needle.trim() || needle.length > source.length) return source
  const lower = source.toLowerCase()
  const target = needle.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let idx = lower.indexOf(target)
  while (idx >= 0) {
    if (idx > cursor) parts.push(source.slice(cursor, idx))
    parts.push(
      <mark key={cursor} className="bg-amber-100 text-gray-900 rounded px-0.5">
        {source.slice(idx, idx + needle.length)}
      </mark>
    )
    cursor = idx + needle.length
    idx = lower.indexOf(target, cursor)
  }
  if (cursor < source.length) parts.push(source.slice(cursor))
  return parts
}

interface HelpSearchProps {
  entries: Entry[]
  placeholder: string
  noResults: string
}

export function HelpSearch({ entries, placeholder, noResults }: HelpSearchProps) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const results = useMemo(() => search(entries, q), [entries, q])

  // Snap active row back to 0 whenever the result list changes shape;
  // otherwise a stale activeIdx can point past the new end and trap
  // Enter on nothing.
  useEffect(() => { setActiveIdx(0) }, [q])

  // Keep the focused row in view as the user arrows through results.
  useEffect(() => {
    const el = listRef.current?.children?.[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

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

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[activeIdx]
      if (pick) {
        setOpen(false)
        router.push(`/dashboard/help/${pick.entry.slug}`)
      }
    }
  }

  return (
    <div ref={rootRef} className="relative max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-expanded={open && results.length > 0}
          aria-activedescendant={open && results[activeIdx] ? `help-search-result-${results[activeIdx].entry.slug}` : undefined}
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
        <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-xl ring-1 ring-gray-100 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">{noResults}</div>
          ) : (
            <ul ref={listRef} role="listbox">
              {results.map(({ entry, snippet }, i) => {
                const active = i === activeIdx
                return (
                  <li key={entry.slug} className="border-b border-gray-50 last:border-0">
                    <Link
                      id={`help-search-result-${entry.slug}`}
                      href={`/dashboard/help/${entry.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActiveIdx(i)}
                      role="option"
                      aria-selected={active}
                      className={`block px-4 py-3 transition-colors ${active ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                    >
                      <div className="font-medium text-gray-900 text-sm">{highlight(entry.title, q)}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{highlight(snippet, q)}</div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
