"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ListChecks, BookOpen, Layers, ClipboardList, Mic, ChevronRight, ChevronLeft, History as HistoryIcon, Search, X } from 'lucide-react'
import { StudySubPageHeader } from '../_shared/primitives'
import { groupByDate } from '../_shared/dateGroups'
import { SkeletonRowList } from '../skeletons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import type { StudyMode } from '../modes'

/**
 * /mobile/study/history — past study sessions, newest first, with
 * client-side search across title/topic name/mode and simple
 * pagination (20 rows per page over a fetched window of 200).
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

const PAGE_SIZE = 20

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
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

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
        .limit(200)
      if (cancelled) return
      setRows((data ?? []) as unknown as Row[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(row => {
      const title = row.title ?? ''
      const topicName = row.topic ? `${row.topic.name_en} ${row.topic.name_ko}` : ''
      const freeform = row.topic_freeform ?? ''
      const modeLabel = String(t(`study.modes.${row.mode}.title`))
      return `${title} ${topicName} ${freeform} ${modeLabel}`.toLowerCase().includes(q)
    })
  }, [rows, query, t])

  useEffect(() => { setPage(0) }, [query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 -z-10 bg-gradient-to-b from-primary/[0.025] to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <StudySubPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={HistoryIcon}
          eyebrow={ko ? '학습' : 'Study'}
          title={String(t('study.history.title'))}
          subtitle={String(t('study.history.subtitle'))}
        />

        <label className="relative block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ko ? '제목·주제·모드로 검색' : 'Search by title, topic, or mode'}
            className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white ring-1 ring-gray-200 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={ko ? '검색 지우기' : 'Clear search'}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </label>

        {loading ? (
          <SkeletonRowList count={6} />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-12 text-center">
            <p className="text-sm text-gray-500">
              {query ? (ko ? '일치하는 세션이 없어요' : 'No sessions match your search') : String(t('study.history.empty'))}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {groupByDate(paged, r => r.last_active_at).map(group => (
                <section key={group.bucket.key === 'earlier' ? `e:${group.bucket.monthKey}` : group.bucket.key}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.10em] text-gray-500 mb-2 px-1">
                    {group.bucket.label(ko)}
                  </h3>
                  <div className="space-y-2">
                    {group.rows.map(row => {
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
                          className="group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white ring-1 ring-gray-200 hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
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
                </section>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={clampedPage === 0}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200 text-[13px] font-medium text-gray-700 hover:ring-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {ko ? '이전' : 'Previous'}
                </button>
                <div className="text-[12.5px] text-gray-500 tabular-nums">
                  {ko
                    ? `${clampedPage + 1} / ${totalPages} 페이지 · 총 ${filtered.length}개`
                    : `Page ${clampedPage + 1} of ${totalPages} · ${filtered.length} total`}
                </div>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={clampedPage >= totalPages - 1}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200 text-[13px] font-medium text-gray-700 hover:ring-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {ko ? '다음' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

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
