"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
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
          id, mode, title, last_active_at, topic_freeform,
          topic:study_topics ( name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .neq('status', 'completed')
        .order('last_active_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      setSession((data?.[0] as ActiveSession | undefined) ?? null)
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
    <div className="relative">
      <Link
        href={`/mobile/study/session/${session.id}`}
        className="group flex items-center gap-3 rounded-2xl bg-gradient-to-b from-primary/[0.08] via-primary/[0.05] to-white ring-1 ring-primary/20 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(40,133,232,0.22)] p-3.5 pr-12 hover:shadow-[0_2px_4px_rgba(40,133,232,0.08),0_12px_32px_-12px_rgba(40,133,232,0.32)] active:scale-[0.99] transition-all"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-b from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/30">
          <Play className="w-4 h-4 fill-current" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary leading-none mb-1">
            {String(t('study.resumeBanner.eyebrow'))}
          </div>
          <div className="text-[14.5px] font-semibold text-gray-900 truncate leading-tight">
            {title}
          </div>
          <div className="text-[11.5px] text-gray-500 mt-0.5 truncate">
            {modeLabel} · {timeAgo}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        aria-label="Dismiss"
        className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 rounded-full text-gray-400 hover:bg-white/80 hover:text-gray-600 active:scale-[0.94] transition-all inline-flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
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
