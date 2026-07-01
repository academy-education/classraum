"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { MessageCircle, ListChecks, BookOpen, Layers, ClipboardList, Mic, Loader2, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useCarouselFocus, CarouselDots, scrollToCarouselIndex } from './useCarouselFocus'
import { SkeletonCarousel } from './skeletons'
import type { StudyMode } from './modes'

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
  chat: {
    Icon: MessageCircle,
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600',
    cardBg: 'bg-gradient-to-br from-sky-50/60 via-white to-white',
    ring: 'ring-sky-100',
  },
  practice: {
    Icon: ListChecks,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    cardBg: 'bg-gradient-to-br from-emerald-50/60 via-white to-white',
    ring: 'ring-emerald-100',
  },
  lesson: {
    Icon: BookOpen,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    cardBg: 'bg-gradient-to-br from-amber-50/70 via-white to-white',
    ring: 'ring-amber-100',
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const focusedIndex = useCarouselFocus(scrollRef, rows.length)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select(`
          id, mode, title, status, last_active_at, topic_freeform,
          topic:study_topics ( slug, name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .neq('status', 'completed')
        .order('last_active_at', { ascending: false })
        .limit(10)
      if (cancelled) return
      setRows((data ?? []) as unknown as Row[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  // Don't render the section if the student has nothing to resume —
  // an empty shelf looks like a bug.
  if (loading) {
    return (
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
          {t('study.landing.resumeTitle')}
        </h2>
        <SkeletonCarousel count={3} />
      </section>
    )
  }

  if (rows.length === 0) return null

  return (
    <section>
      <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
        {t('study.landing.resumeTitle')}
      </h2>
      <div className="-mx-5">
        <div
          ref={scrollRef}
          style={{ paddingInline: 'max(40px, calc((100vw - 300px) / 2))' }}
          className="flex items-center gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory py-6"
        >
          {rows.map(row => {
            const style = MODE_STYLE[row.mode] ?? MODE_STYLE.chat
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
                data-carousel-card
                className={`snap-center flex-none w-[300px] max-w-[calc(100vw-72px)] min-h-[164px] group relative overflow-hidden rounded-2xl p-4 ${style.cardBg} ring-1 ${style.ring} shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.10),0_12px_28px_-12px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200`}
              >
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                <div aria-hidden className={`pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full ${style.iconBg} opacity-[0.10] blur-2xl group-hover:opacity-[0.18] transition-opacity`} />
                <div className="relative flex items-start gap-3.5">
                  <div className={`flex-shrink-0 w-11 h-11 rounded-2xl ${style.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-semibold text-gray-900 truncate leading-tight">
                      {title}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1.5">
                      <span className="font-medium">{String(t(`study.modes.${row.mode}.title`))}</span>
                      <span className="text-gray-300">·</span>
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
                {/* Bottom-aligned subtle "resume" affordance */}
                <div className="relative mt-3 inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                  {String(t('study.landing.resumeCta'))}
                  <span className="ml-1 text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all">→</span>
                </div>
              </Link>
            )
          })}
        </div>
        <CarouselDots
          count={rows.length}
          activeIndex={focusedIndex}
          onSelect={(i) => scrollToCarouselIndex(scrollRef, i)}
        />
      </div>
    </section>
  )
}

/** Same formatter as the (now removed) history page. */
function formatTimeAgo(iso: string, ko: boolean): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 7) {
    return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
  }
  if (day >= 1) return ko ? `${day}일 전` : `${day}d ago`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h ago`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m ago`
  return ko ? '방금' : 'just now'
}
