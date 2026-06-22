"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, ListChecks, BookOpen, Layers, ClipboardList, ChevronRight, Loader2 } from 'lucide-react'
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
    <div className="px-5 pt-6 pb-12 space-y-5">
      <Link
        href="/mobile/study"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.topic.backToStudy')}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {t('study.history.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('study.history.subtitle')}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center text-sm text-gray-400 py-10">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('study.history.loading')}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center">
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-primary/40 active:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {t(`study.modes.${row.mode}.title`)} · {time}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
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
