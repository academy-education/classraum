"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ListChecks, BookOpen, Layers, ClipboardList, Mic, ChevronRight, History as HistoryIcon } from 'lucide-react'
import { StudySubPageHeader } from '../_shared/primitives'
import { SkeletonRowList } from '../skeletons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import type { StudyMode } from '../modes'

/**
 * /mobile/study/history — past study sessions, newest first.
 *
 * RLS already scopes to the caller, so this is just a paginated list
 * sorted by last_active_at desc. Each row links back into the
 * session so the student can resume.
 */

interface Row {
  id: string
  mode: StudyMode
  language: 'en' | 'ko'
  title: string | null
  status: string
  last_active_at: string
  topic_freeform: string | null
  topic: { slug: string; name_en: string; name_ko: string } | null
}

const MODE_ICONS: Record<StudyMode, typeof MessageCircle> = {
  chat: MessageCircle,
  practice: ListChecks,
  lesson: BookOpen,
  flashcards: Layers,
  full_test: ClipboardList,
  response: Mic,
}

export default function StudyHistoryPage() {
  return (
    <StudySubscriptionGate>
      <HistoryInner />
    </StudySubscriptionGate>
  )
}

function HistoryInner() {
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
          id, mode, language, title, status, last_active_at, topic_freeform,
          topic:study_topics ( slug, name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .order('last_active_at', { ascending: false })
        .limit(50)
      if (cancelled) return
      setRows((data ?? []) as unknown as Row[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 -z-10 bg-gradient-to-b from-primary/[0.025] to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-7">
        <StudySubPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={HistoryIcon}
          eyebrow={ko ? '학습' : 'Study'}
          title={String(t('study.history.title'))}
          subtitle={String(t('study.history.subtitle'))}
        />

        {loading ? (
          <SkeletonRowList count={5} />
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-gray-50/50 px-5 py-12 text-center">
            <p className="text-sm text-gray-500">{t('study.history.empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(row => {
              const Icon = MODE_ICONS[row.mode] ?? MessageCircle
              const title = row.title
                ?? (row.topic ? (ko ? row.topic.name_ko : row.topic.name_en) : null)
                ?? row.topic_freeform
                ?? t('study.session.untitled')
              const time = formatTimeAgo(row.last_active_at, ko)
              return (
                <Link
                  key={row.id}
                  href={`/mobile/study/session/${row.id}`}
                  className="group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.12)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/15 text-primary flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>
                    <div className="text-[12.5px] text-gray-500 mt-0.5">
                      {t(`study.modes.${row.mode}.title`)} <span className="text-gray-300 mx-1">·</span> {time}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact relative-time formatter, bilingual. Falls back to a short
 * date once the row is older than a week — relative gets misleading
 * past that point.
 */
function formatTimeAgo(iso: string, ko: boolean): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 7) {
    return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
      month: 'short', day: 'numeric',
    })
  }
  if (day >= 1) return ko ? `${day}일 전` : `${day}d ago`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h ago`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m ago`
  return ko ? '방금' : 'just now'
}
