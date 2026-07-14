"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ListChecks, BookOpen, Layers, ClipboardList, Mic, ChevronRight, ChevronLeft, History as HistoryIcon, Search, X } from 'lucide-react'
import { StudySubPageHeader, StudyEmptyState } from '../_shared/primitives'
import { groupByDate, formatTimeAgo } from '../_shared/dateGroups'
import { SkeletonRowList } from '../skeletons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import type { StudyMode } from '../modes'
import { getPathNodeLabel } from '@/lib/study-path'

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
  score: number | null
  config: { pathNode?: string } | null
  last_active_at: string
  topic_freeform: string | null
  topic: { slug: string; name_en: string; name_ko: string } | null
}

const MODE_ICONS: Record<StudyMode, typeof MessageCircle> = {
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
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select(`
          id, mode, language, title, status, score, config, last_active_at, topic_freeform,
          topic:study_topics ( slug, name_en, name_ko )
        `)
        .eq('student_id', user.userId)
        .eq('archived', false)
        .order('last_active_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      // Query failure must not render the "start studying" empty state
      // to a student with hundreds of sessions.
      if (error) setLoadFailed(true)
      else setRows((data ?? []) as unknown as Row[])
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
      <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14 space-y-6">
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
            className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white ring-1 ring-gray-200/70 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
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
        ) : loadFailed ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
            <p className="text-[13.5px] text-gray-600">
              {ko ? '세션 기록을 불러오지 못했어요.' : "We couldn't load your sessions."}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] hover:opacity-95 transition"
            >
              {ko ? '다시 시도' : 'Retry'}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
            <StudyEmptyState
              icon={HistoryIcon}
              headline={query
                ? (ko ? '일치하는 세션이 없어요' : 'No sessions match your search')
                : String(t('study.history.empty'))}
              ctaHref={query ? undefined : '/mobile/study'}
              ctaText={query ? undefined : (ko ? '학습 시작하기' : 'Start studying')}
            />
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {groupByDate(paged, r => r.last_active_at).map(group => (
                <section key={group.bucket.key === 'earlier' ? `e:${group.bucket.monthKey}` : group.bucket.key}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.10em] text-gray-500 mb-2 px-1">
                    {group.bucket.label(ko)}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {group.rows.map(row => {
                      const Icon = MODE_ICONS[row.mode] ?? MessageCircle
                      // Journey sessions get their node name ("Info &
                      // Ideas I") — six rows of the shared topic name
                      // were indistinguishable.
                      const title = getPathNodeLabel(row.config?.pathNode, ko)
                        ?? row.title
                        ?? (row.topic ? (ko ? row.topic.name_ko : row.topic.name_en) : null)
                        ?? row.topic_freeform
                        ?? t('study.session.untitled')
                      const time = formatTimeAgo(row.last_active_at, ko)
                      // Outcome chip — without it every row reads
                      // identically ("Practice questions · 1d ago") and
                      // the list is impossible to scan. Score for
                      // completed sessions, "In progress" otherwise.
                      const completed = row.status === 'completed'
                      const score = row.score === null ? null : Math.round(Number(row.score))
                      const chip = completed
                        ? {
                            label: score !== null ? `${score}%` : (ko ? '완료' : 'Done'),
                            cls: score === null || score >= 80
                              ? 'bg-emerald-50 text-emerald-700'
                              : score >= 50
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-600',
                          }
                        : { label: ko ? '진행 중' : 'In progress', cls: 'bg-gray-100 text-gray-500' }
                      return (
                        <Link
                          key={row.id}
                          href={`/mobile/study/session/${row.id}`}
                          className="group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white ring-1 ring-gray-200/70 hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all"
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
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${chip.cls}`}>
                            {chip.label}
                          </span>
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
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200/70 text-[13px] font-medium text-gray-700 hover:ring-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200/70 text-[13px] font-medium text-gray-700 hover:ring-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
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

