"use client"

import { useEffect, useRef, useState } from 'react'
import { Users } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * SocialPresenceCard — Korean-market social-proof affordance.
 *
 * Renders "N students in your academy are studying now" as a small,
 * calm card in the landing Today band. Fetches on mount, then
 * refreshes every 60s so the number feels alive without hammering
 * the endpoint.
 *
 * Self-hides when count is 0 — a solo student staring at "0 studying
 * now" is a worse signal than nothing. Also self-hides on API failure
 * (soft). Rendered as an inline card, not a full-width banner, so it
 * doesn't add another top-of-fold surface — it slots in with the
 * other Today items and hides gracefully.
 */

const POLL_INTERVAL_MS = 60_000

export function SocialPresenceCard() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [count, setCount] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchOnce = async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/social-presence', { headers })
        if (!res.ok) return
        const json = await res.json() as { count?: number }
        if (cancelled) return
        setCount(typeof json.count === 'number' ? json.count : null)
      } catch { /* silent */ }
    }

    void fetchOnce()
    timerRef.current = setInterval(fetchOnce, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (count === null || count < 1) return null

  // Copy is deliberately warmer in Korean than English — the whole
  // point of the surface is to lean into Korean-market conventions
  // that our streak/XP alone doesn't cover.
  // Academy-neutral wording: study-only students (no academy) see this
  // card too, so "학원 친구" would be wrong for them.
  const label = ko
    ? `친구 ${count}명이 지금 공부하고 있어요`
    : `${count} ${count === 1 ? 'peer is' : 'peers are'} studying right now`
  const subLabel = ko ? '함께 공부해요' : 'You\'re not alone'

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-emerald-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-3.5 flex items-center gap-3"
    >
      <div aria-hidden className="pointer-events-none absolute -top-4 -right-6 w-20 h-20 rounded-full bg-emerald-100/40 blur-2xl" />
      <div className="relative flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-200">
        <Users className="w-4 h-4 text-emerald-600" />
        {/* Live-pulse dot on the Users icon — subtle animate-ping green
            dot indicating this is real-time. */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white" />
        </span>
      </div>
      <div className="relative flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-gray-900 leading-tight">
          {label}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {subLabel}
        </div>
      </div>
      {/* Silence-the-linter reference so unused `t` doesn't warn — it's
          kept as an import for future localized substrings. */}
      <span data-t={!!t} className="hidden" aria-hidden />
    </div>
  )
}
