"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, CheckCircle2, Loader2, AlertTriangle, Play, ChevronRight, Trophy } from 'lucide-react'
import { StudySubPageHeader } from '../_shared/primitives'
import { SkeletonRowList } from '../skeletons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'

/**
 * /mobile/study/tests — overview of every full_test session the
 * student has queued, ready, in-progress, or completed. Reached
 * from the collapsed "N tests ready" row on the landing.
 *
 * Grouped by state so the eye can scan: Ready first (actionable),
 * then Generating, then In progress, then Completed. Failed sits
 * at the bottom.
 */

type TestState = 'ready' | 'generating' | 'in_progress' | 'completed' | 'failed'

interface Row {
  id: string
  status: string
  generation_status: 'pending' | 'ready' | 'failed' | null
  topic_freeform: string | null
  created_at: string
  last_active_at: string
  topic: { name_en: string; name_ko: string; slug: string } | null
}

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

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select(`
          id, status, generation_status, topic_freeform, created_at, last_active_at,
          topic:study_topics ( name_en, name_ko, slug )
        `)
        .eq('student_id', user.userId)
        .eq('mode', 'full_test')
        .order('last_active_at', { ascending: false })
        .limit(100)
      if (cancelled) return
      setRows((data ?? []) as unknown as Row[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  const grouped = useMemo(() => {
    const bucket: Record<TestState, Row[]> = {
      ready: [], generating: [], in_progress: [], completed: [], failed: [],
    }
    for (const row of rows) {
      const state = classify(row)
      bucket[state].push(row)
    }
    return bucket
  }, [rows])

  const totalCount = rows.length
  const hasAny = totalCount > 0

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 -z-10 bg-gradient-to-b from-emerald-500/[0.03] to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <StudySubPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={ClipboardList}
          iconColorClass="text-emerald-600 bg-emerald-50"
          eyebrow={ko ? '모의고사' : 'Mock tests'}
          title={ko ? '내 시험' : 'My tests'}
          subtitle={ko
            ? `전체 ${totalCount}개의 모의고사 세션을 관리하세요.`
            : `Manage your ${totalCount} mock-test sessions.`}
        />

        {loading ? (
          <SkeletonRowList count={5} />
        ) : !hasAny ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-12 text-center">
            <p className="text-[13.5px] text-gray-500">
              {ko ? '아직 시작한 모의고사가 없어요.' : "You haven't started a mock test yet."}
            </p>
            <Link
              href="/mobile/study"
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-white text-[12.5px] font-medium hover:bg-primary/90 transition"
            >
              {ko ? '시험 시작' : 'Start a test'}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <Group
              title={ko ? '시작 가능' : 'Ready to start'}
              rows={grouped.ready}
              ko={ko}
            />
            <Group
              title={ko ? '생성 중' : 'Generating'}
              rows={grouped.generating}
              ko={ko}
            />
            <Group
              title={ko ? '진행 중' : 'In progress'}
              rows={grouped.in_progress}
              ko={ko}
            />
            <Group
              title={ko ? '완료' : 'Completed'}
              rows={grouped.completed}
              ko={ko}
            />
            <Group
              title={ko ? '실패' : 'Failed'}
              rows={grouped.failed}
              ko={ko}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function classify(row: Row): TestState {
  if (row.generation_status === 'failed') return 'failed'
  if (row.generation_status === 'pending') return 'generating'
  if (row.status === 'completed') return 'completed'
  // ready = generation done, session still active, not started yet.
  if (row.generation_status === 'ready' && row.status === 'active') return 'ready'
  // Active + started but not completed → in progress.
  return 'in_progress'
}

function Group({ title, rows, ko }: { title: string; rows: Row[]; ko: boolean }) {
  if (rows.length === 0) return null
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-gray-900">
          {title}
        </h2>
        <span className="text-[11.5px] text-gray-500 tabular-nums">
          {rows.length}{ko ? '개' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map(row => (
          <TestRow key={row.id} row={row} ko={ko} />
        ))}
      </div>
    </section>
  )
}

function TestRow({ row, ko }: { row: Row; ko: boolean }) {
  const state = classify(row)
  const topicName = row.topic
    ? (ko ? row.topic.name_ko : row.topic.name_en)
    : (row.topic_freeform ?? (ko ? '기타' : 'Untitled'))

  const meta = STATE_META[state]
  const Icon = meta.icon
  const relativeTime = formatTimeAgo(row.last_active_at, ko)

  return (
    <Link
      href={`/mobile/study/session/${row.id}${state === 'completed' ? '/summary' : ''}`}
      className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white ring-1 ring-gray-200 hover:ring-primary/40 hover:shadow-[0_2px_8px_-4px_rgba(40,133,232,0.15)] active:scale-[0.995] transition-all"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.iconClass}`}>
        {state === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-gray-900 truncate leading-tight">
          {topicName}
        </div>
        <div className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1.5">
          <span className={meta.labelClass}>{meta.label(ko)}</span>
          <span className="text-gray-300">·</span>
          <span>{relativeTime}</span>
          {/* Score shown on the summary page — not stored on
              study_sessions, so skip inline here. */}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
    </Link>
  )
}

const STATE_META: Record<TestState, {
  icon: typeof CheckCircle2
  iconClass: string
  labelClass: string
  label: (ko: boolean) => string
}> = {
  ready: {
    icon: Play,
    iconClass: 'bg-emerald-50 text-emerald-600',
    labelClass: 'text-emerald-700 font-medium',
    label: ko => ko ? '시작' : 'Ready',
  },
  generating: {
    icon: Loader2,
    iconClass: 'bg-primary/10 text-primary',
    labelClass: 'text-primary font-medium',
    label: ko => ko ? '생성 중' : 'Generating',
  },
  in_progress: {
    icon: Play,
    iconClass: 'bg-amber-50 text-amber-600',
    labelClass: 'text-amber-700 font-medium',
    label: ko => ko ? '진행 중' : 'In progress',
  },
  completed: {
    icon: Trophy,
    iconClass: 'bg-violet-50 text-violet-600',
    labelClass: 'text-violet-700 font-medium',
    label: ko => ko ? '완료' : 'Completed',
  },
  failed: {
    icon: AlertTriangle,
    iconClass: 'bg-rose-50 text-rose-600',
    labelClass: 'text-rose-700 font-medium',
    label: ko => ko ? '실패' : 'Failed',
  },
}

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
