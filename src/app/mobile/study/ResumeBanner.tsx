"use client"

import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudyTodayCard } from './_shared/primitives'
import { emitUndoable } from './_shared/UndoToast'
import type { StudyMode } from './modes'

interface ActiveSession {
  id: string
  mode: StudyMode
  title: string | null
  last_active_at: string
  topic_freeform: string | null
  topic: { name_en: string; name_ko: string } | null
}

const DISMISS_KEY = 'study-resume-banner-dismissed'

/**
 * Floating sticky banner at the top of the landing showing the most
 * recently-active session with a single tap-to-resume CTA.
 *
 * The motivation: "continue what I was doing" is the most common
 * intent on revisit, but it currently requires scrolling past the
 * recommended carousel to find the Resumable shelf. Banner puts it
 * above the fold.
 *
 * Dismiss is session-scoped (sessionStorage) — comes back next visit
 * if the session is still active, but disappears within this visit
 * if the student explicitly closed it.
 */
export function ResumeBanner() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select(`
          id, mode, title, last_active_at, topic_freeform, config,
          topic:study_topics ( name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .neq('status', 'completed')
        .eq('archived', false)
        .order('last_active_at', { ascending: false })
        .limit(3)
      if (cancelled) return
      // ONE continue-style card in the Today band. If today's challenge
      // is in progress, its own card ("Today's challenge — continue")
      // owns that slot and this banner yields entirely — two adjacent
      // "keep going" cards read as duplicates even when they point at
      // different sessions. Other resumables stay in the Continue-
      // studying shelf below.
      const today = new Date().toISOString().slice(0, 10)
      const rows = (data ?? []) as unknown as Array<ActiveSession & { config?: { dailyChallenge?: string } | null }>
      const challengeInProgress = rows.some(r => r.config?.dailyChallenge === today)
      const first = challengeInProgress ? null : (rows[0] ?? null)
      setSession(first)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  if (!session || dismissed) return null

  const title = session.title
    ?? (session.topic ? (ko ? session.topic.name_ko : session.topic.name_en) : null)
    ?? session.topic_freeform
    ?? String(t('study.session.untitled'))

  const timeAgo = formatTimeAgo(session.last_active_at, ko)
  const modeLabel = String(t(`study.modes.${session.mode}.title`))

  return (
    <StudyTodayCard
      href={`/mobile/study/session/${session.id}`}
      icon={Play}
      iconColorClass="bg-gradient-to-br from-primary to-indigo-600 text-white shadow-[0_4px_10px_-2px_rgba(40,133,232,0.30)]"
      eyebrow={String(t('study.resumeBanner.eyebrow'))}
      title={title}
      subtitle={`${modeLabel} · ${timeAgo}`}
      onDismiss={() => {
        sessionStorage.setItem(DISMISS_KEY, '1')
        setDismissed(true)
        emitUndoable(
          ko ? '이어서 공부하기 숨김' : 'Resume card dismissed',
          () => {
            sessionStorage.removeItem(DISMISS_KEY)
            setDismissed(false)
          },
        )
      }}
    />
  )
}

function formatTimeAgo(iso: string, ko: boolean): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 1) return ko ? `${day}일 전` : `${day}d ago`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h ago`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m ago`
  return ko ? '방금' : 'just now'
}
