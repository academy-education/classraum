"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shuffle, ArrowRight } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

/**
 * DailyReviewCTA — surfaces a single-tap entry to /mobile/study/review
 * when the student has SRS-due flashcards across topics.
 *
 * Self-hiding: renders null when totalDue is 0, so it doesn't add
 * empty surface to the landing for students with no review backlog.
 */
export function DailyReviewCTA() {
  const { t } = useTranslation()
  const [count, setCount] = useState<number | null>(null)
  const [topicCount, setTopicCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/srs-review', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (cancelled) return
        setCount(((json.queue ?? []) as unknown[]).length)
        setTopicCount(json.topicCount ?? 0)
      } catch {
        if (!cancelled) setCount(0)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (count === null || count === 0) return null

  return (
    <Link href="/mobile/study/review"
      // Re-tinted from violet/purple → primary blue for landing-page
      // color cohesion. Was visually competing with other CTAs;
      // now reads as part of the same primary-color family.
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-600 text-white p-4 shadow-[0_8px_24px_-8px_rgba(40,133,232,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(40,133,232,0.55)] hover:-translate-y-0.5 transition-all">
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
          <Shuffle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">{t('study.review.eyebrow')}</div>
          <div className="text-[15px] font-semibold leading-snug mt-0.5">
            {t('study.review.ctaTitle', { count: String(count) })}
          </div>
          {topicCount > 1 && (
            <div className="text-[12px] opacity-90 mt-0.5">
              {t('study.review.ctaSubtitle', { count: String(topicCount) })}
            </div>
          )}
        </div>
        <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}
