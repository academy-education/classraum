"use client"

import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, CheckCircle2, Loader2, AlertTriangle, Play, Trophy, Search, X } from '@/app/mobile/study/_shared/icons'
import { StudyPageHeader, StudyScrollShell, StudyEmptyState, StudyPager, StudyTodayCard } from '../_shared/primitives'
import { groupByDate } from '../_shared/dateGroups'
import { SkeletonRowList } from '../skeletons'
import { db } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { formatTimeAgo } from '../_shared/dateGroups'

/**
 * /mobile/study/tests — overview of every full_test session.
 *
 * Same shape as /mobile/study/history: search + state filter chip
 * row + prev/next pagination. Keeps the app-wide sub-page rhythm.
 */

type TestState = 'ready' | 'generating' | 'in_progress' | 'completed' | 'failed'
type FilterKey = 'all' | TestState

interface Row {
  id: string
  status: string
  generation_status: 'pending' | 'ready' | 'failed' | null
  topic_freeform: string | null
  created_at: string
  last_active_at: string
  config: { last_gen_started_at?: string } | null
  topic: { name_en: string; name_ko: string; slug: string } | null
  score: number | null
  correct_count: number | null
  total_count: number | null
}

const PAGE_SIZE = 20

export default function StudyTestsPage() {
  return (
    <StudySubscriptionGate>
      <TestsInner />
    </StudySubscriptionGate>
  )
}

function TestsInner() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data } = await db
        .from('study_sessions')
        .select(`
          id, status, generation_status, topic_freeform, created_at, last_active_at, config,
          score, correct_count, total_count,
          topic:study_topics ( name_en, name_ko, slug )
        `)
        .eq('student_id', user.userId)
        .eq('mode', 'full_test')
        .eq('archived', false)
        .order('last_active_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      setRows((data ?? []) as unknown as Row[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  // Counts by state — powers the filter chip badges.
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: rows.length, ready: 0, generating: 0, in_progress: 0, completed: 0, failed: 0 }
    for (const r of rows) c[classify(r)]++
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(row => {
      const state = classify(row)
      if (filter !== 'all' && state !== filter) return false
      if (!q) return true
      const topicText = row.topic ? `${row.topic.name_en} ${row.topic.name_ko}` : ''
      const freeform = row.topic_freeform ?? ''
      return `${topicText} ${freeform}`.toLowerCase().includes(q)
    })
  }, [rows, query, filter])

  useEffect(() => { setPage(0) }, [query, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages - 1)
  const paged = filtered.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE)

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={ClipboardList}
          iconColorClass="text-emerald-600 bg-emerald-50"
          eyebrow={ko ? '모의고사' : 'Mock tests'}
          title={ko ? '내 시험' : 'My tests'}
          subtitle={rows.length === 0
            // Zero-aware copy — "Manage your 0 sessions" reads broken.
            ? (ko ? '모의고사로 실전처럼 연습해 보세요.' : 'Practice under real test conditions.')
            : (ko
                ? `전체 ${rows.length}개의 모의고사 세션을 관리하세요.`
                : `Manage your ${rows.length} mock-test session${rows.length === 1 ? '' : 's'}.`)}
        />
      }
    >
        <label className="relative block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={ko ? '주제로 검색' : 'Search by topic'}
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

        <StateFilter
          value={filter}
          onSelect={setFilter}
          counts={counts}
          ko={ko}
        />

        {loading ? (
          <SkeletonRowList count={6} />
        ) : filtered.length === 0 ? (
          <StudyEmptyState
            icon={ClipboardList}
            headline={query || filter !== 'all'
              ? (ko ? '일치하는 시험이 없어요' : 'No tests match')
              : (ko ? '아직 시작한 모의고사가 없어요' : "You haven't started a mock test yet")}
            body={!query && filter === 'all'
              ? (ko ? '첫 모의고사를 만들어 실전 감각을 길러보세요.' : 'Build your first mock test and get a feel for the real thing.')
              : undefined}
            ctaHref={!query && filter === 'all' ? '/mobile/study/builder' : undefined}
            ctaText={!query && filter === 'all' ? (ko ? '시험 시작' : 'Start a test') : undefined}
          />
        ) : (
          <>
            <div className="space-y-6">
              {groupByDate(paged, r => r.last_active_at).map(group => (
                <section key={group.bucket.key === 'earlier' ? `e:${group.bucket.monthKey}` : group.bucket.key}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.10em] text-gray-500 mb-2 px-1">
                    {group.bucket.label(ko)}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {group.rows.map(row => <TestRow key={row.id} row={row} ko={ko} />)}
                  </div>
                </section>
              ))}
            </div>

            <StudyPager
              page={clampedPage} totalPages={totalPages} total={filtered.length} ko={ko}
              onPrev={() => setPage(p => Math.max(0, p - 1))}
              onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            />
          </>
        )}
    </StudyScrollShell>
  )
}

function StateFilter({ value, onSelect, counts, ko }: {
  value: FilterKey
  onSelect: (k: FilterKey) => void
  counts: Record<FilterKey, number>
  ko: boolean
}) {
  const items: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: ko ? '전체' : 'All' },
    { key: 'ready', label: ko ? '시작 가능' : 'Ready' },
    { key: 'generating', label: ko ? '생성 중' : 'Generating' },
    { key: 'in_progress', label: ko ? '진행 중' : 'In progress' },
    { key: 'completed', label: ko ? '완료' : 'Completed' },
    { key: 'failed', label: ko ? '실패' : 'Failed' },
  ]
  return (
    <div className="-mx-5 overflow-x-auto scrollbar-hide">
      {/* pt-1 gives the active chip's ring headroom — overflow-x:auto
          forces overflow-y to compute to auto, which clipped the top of
          the ring when chips sat flush against y=0. */}
      <div className="flex gap-2 pl-5 pt-1 pb-1">
        {items.map(item => {
          const active = value === item.key
          const count = counts[item.key]
          if (count === 0 && item.key !== 'all') return null
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={`whitespace-nowrap inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12.5px] font-medium transition ${
                active
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                  : 'bg-white ring-1 ring-gray-200/70 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
              <span className="opacity-60 tabular-nums">{count}</span>
            </button>
          )
        })}
        {/* Trailing spacer — overflow-x drops the row's padding-right,
            leaving the last chip flush to the edge. */}
        <div aria-hidden className="shrink-0 w-[15px]" />
      </div>
    </div>
  )
}

const STUCK_PENDING_MS = 8 * 60 * 1000

function classify(row: Row): TestState {
  if (row.generation_status === 'failed') return 'failed'
  if (row.generation_status === 'pending') {
    // Generator's Vercel maxDuration is ~300s. Anything still pending
    // 8 minutes after GENERATION STARTED is genuinely stuck (cold-start
    // crash, timeout, orphan). Surface it as failed so the student sees
    // a Retry affordance via TestSession's existing fresh-attempt path.
    //
    // Measured from config.last_gen_started_at, not created_at — the row
    // is created when the customization sheet opens and may sit unused
    // for hours, which made a just-started test read as failed
    // immediately. created_at is only a fallback for legacy rows with no
    // stamp (those are stuck by definition anyway).
    const startedAt = row.config?.last_gen_started_at ?? row.created_at
    const age = Date.now() - new Date(startedAt).getTime()
    return age > STUCK_PENDING_MS ? 'failed' : 'generating'
  }
  if (row.status === 'completed') return 'completed'
  if (row.generation_status === 'ready' && row.status === 'active') return 'ready'
  return 'in_progress'
}

function TestRow({ row, ko }: { row: Row; ko: boolean }) {
  const state = classify(row)
  const topicName = row.topic
    ? (ko ? row.topic.name_ko : row.topic.name_en)
    : (row.topic_freeform ?? (ko ? '기타' : 'Untitled'))

  const meta = STATE_META[state]
  const relativeTime = formatTimeAgo(row.last_active_at, ko)
  const scored = state === 'completed' && typeof row.score === 'number'

  // Renders through StudyTodayCard — the same primitive the landing
  // page's Today band uses. Copying its classes here is what let the two
  // drift: this list had w-10 flat-tint icons and no eyebrow while Today
  // had w-11 gradient tiles, so two lists of the same kind of thing read
  // as two different products. Sharing the component makes them match by
  // construction rather than by remembering to.
  return (
    <StudyTodayCard
      // A completed test opens the result screen. session/[id]/page.tsx
      // redirects it to /summary, which renders exactly what the student
      // saw on submitting.
      href={`/mobile/study/session/${row.id}`}
      icon={meta.icon}
      loading={state === 'generating'}
      iconColorClass={meta.iconColorClass}
      eyebrow={meta.label(ko)}
      title={topicName}
      subtitle={relativeTime}
      rightSlot={scored ? (
        <div className="text-right">
          <div className="text-[16px] font-bold text-gray-900 tabular-nums leading-none">
            {Math.round(row.score!)}%
          </div>
          {row.correct_count !== null && row.total_count !== null && (
            <div className="text-[11px] text-gray-400 tabular-nums mt-1">
              {row.correct_count}/{row.total_count}
            </div>
          )}
        </div>
      ) : undefined}
    />
  )
}

/** Gradient icon tiles, matching the landing page's Today band exactly —
 *  white glyph on a two-stop gradient with a coloured drop shadow. The
 *  flat 50-weight tints these replaced were a different visual language
 *  for the same kind of card. */
const STATE_META: Record<TestState, {
  icon: typeof CheckCircle2
  iconColorClass: string
  label: (ko: boolean) => string
}> = {
  ready: {
    icon: Play,
    iconColorClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.35)]',
    label: ko => ko ? '시작' : 'Ready',
  },
  generating: {
    icon: Loader2,
    iconColorClass: 'bg-gradient-to-br from-primary to-indigo-600 text-white shadow-[0_4px_10px_-2px_rgba(40,133,232,0.35)]',
    label: ko => ko ? '생성 중' : 'Generating',
  },
  in_progress: {
    icon: Play,
    iconColorClass: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(251,146,60,0.35)]',
    label: ko => ko ? '진행 중' : 'In progress',
  },
  completed: {
    icon: Trophy,
    iconColorClass: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_10px_-2px_rgba(139,92,246,0.35)]',
    label: ko => ko ? '완료' : 'Completed',
  },
  failed: {
    icon: AlertTriangle,
    iconColorClass: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_4px_10px_-2px_rgba(244,63,94,0.35)]',
    label: ko => ko ? '실패' : 'Failed',
  },
}

