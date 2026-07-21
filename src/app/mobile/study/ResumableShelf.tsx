"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ListChecks, Layers, ClipboardList, Mic, ArrowRight, Clock, type LucideIcon } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import type { StudyMode } from './modes'
import { formatTimeAgo } from './_shared/dateGroups'

interface Row {
  id: string
  mode: StudyMode
  title: string | null
  status: string
  last_active_at: string
  topic_freeform: string | null
  topic: { slug: string; name_en: string; name_ko: string } | null
}

/** Per-mode visual identity for resumable session cards — gradient
 *  tile + bg tint matches the topic-page mode cards so the whole
 *  study system reads as a coherent design language. */
const MODE_STYLE: Record<StudyMode, { Icon: LucideIcon; iconBg: string; cardBg: string; ring: string }> = {
  practice: {
    Icon: ListChecks,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
    ring: 'ring-emerald-100',
  },
  flashcards: {
    Icon: Layers,
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
    cardBg: 'bg-gradient-to-br from-violet-50/60 via-white to-white',
    ring: 'ring-violet-100',
  },
  full_test: {
    Icon: ClipboardList,
    iconBg: 'bg-gradient-to-br from-rose-500 to-red-600',
    cardBg: 'bg-gradient-to-br from-rose-50/70 via-white to-white',
    ring: 'ring-rose-100',
  },
  response: {
    Icon: Mic,
    iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-600',
    cardBg: 'bg-gradient-to-br from-indigo-50/70 via-white to-white',
    ring: 'ring-indigo-100',
  },
}

/**
 * Resumable-sessions shelf on the study landing.
 *
 * Mirrors the RecommendedShelf carousel layout — same side-button
 * convention, same snap-x scroll behavior — but cards are
 * mode-themed and link straight to the existing session for resume.
 *
 * Replaces the standalone /mobile/study/history page link in the
 * header; recent sessions are surfaced inline on the landing now.
 */
export function ResumableShelf() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select(`
          id, mode, title, status, last_active_at, topic_freeform, config,
          topic:study_topics ( slug, name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .neq('status', 'completed')
        .eq('archived', false)
        .order('last_active_at', { ascending: false })
        .limit(10)
      if (cancelled) return
      // Mirror the Today band's single-continue-card rule (see
      // ResumeBanner): today's challenge session always has its own
      // card there, so never re-list it. The newest other session is
      // shown by the ResumeBanner ONLY when no challenge is in
      // progress — exclude it here in exactly that case, otherwise it
      // belongs to this shelf.
      const today = new Date().toISOString().slice(0, 10)
      const all = (data ?? []) as unknown as Array<Row & { config?: { dailyChallenge?: string } | null }>
      const challengeInProgress = all.some(r => r.config?.dailyChallenge === today)
      const rest = all.filter(r => r.config?.dailyChallenge !== today)
      setRows(challengeInProgress ? rest : rest.slice(1))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  // Render nothing until loaded (no separate skeleton flash) so the shelf
  // appears together with the rest of the landing rather than popping in a
  // beat later — and self-hides when there's nothing to resume.
  if (loading || rows.length === 0) return null

  const rest = rows.length - 1
  return (
    <section>
      <ShelfHeader
        title={String(t('study.landing.resumeTitle'))}
        seeAllHref={rest > 0 ? '/mobile/study/history' : undefined}
        seeAllLabel={rest > 0 ? (ko ? `전체 ${rows.length}개` : `See all ${rows.length}`) : undefined}
      />
      <div className="space-y-2">
        {rows.slice(0, 1).map(row => {
          const style = MODE_STYLE[row.mode] ?? MODE_STYLE.practice
          const Icon = style.Icon
          const title = row.title
            ?? (row.topic ? (ko ? row.topic.name_ko : row.topic.name_en) : null)
            ?? row.topic_freeform
            ?? String(t('study.session.untitled'))
          const time = formatTimeAgo(row.last_active_at, ko)
          return (
            <Link
              key={row.id}
              href={`/mobile/study/session/${row.id}`}
              className="group flex items-center gap-3 h-[80px] w-full rounded-2xl bg-white ring-1 ring-gray-200 px-4 hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all"
            >
              <div className={`flex-shrink-0 w-11 h-11 rounded-2xl ${style.iconBg} text-white flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]`}>
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold text-gray-900 truncate leading-snug">
                  {title}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">
                    <Icon className="w-3 h-3 opacity-70" />
                    {String(t(`study.modes.${row.mode}.title`))}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 tabular-nums">
                    <Clock className="w-3 h-3 opacity-70" />
                    {time}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function ShelfHeader({ title, seeAllHref, seeAllLabel }: { title: string; seeAllHref?: string; seeAllLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">{title}</h2>
      {seeAllHref && (
        <Link href={seeAllHref} className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:text-primary/80 transition">
          {seeAllLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

/** Same formatter as the (now removed) history page. */
