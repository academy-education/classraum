"use client"

import { useEffect, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { StudyTodayCard } from './_shared/primitives'

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
    <StudyTodayCard
      href="/mobile/study/review"
      icon={Shuffle}
      iconColorClass="bg-violet-50 text-violet-600"
      eyebrow={String(t('study.review.eyebrow'))}
      title={t('study.review.ctaTitle', { count: String(count) })}
      subtitle={topicCount > 1 ? t('study.review.ctaSubtitle', { count: String(topicCount) }) : undefined}
    />
  )
}
