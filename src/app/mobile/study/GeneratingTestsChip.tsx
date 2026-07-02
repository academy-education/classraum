"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'

/**
 * Background test-generation tracker. Renders a compact banner on the
 * study landing for any full_test session whose generation_status is
 * 'pending' (still being built by the server) or 'ready' (built but
 * not yet opened). 'ready' lets the user jump straight into the test
 * after navigating away mid-generation. 'pending' confirms the server
 * is still working.
 *
 * Polls every 5s while at least one row is pending so the UI flips to
 * 'ready' without a manual refresh. Polling stops as soon as nothing
 * is pending — no idle cost.
 */

interface Row {
  id: string
  generation_status: 'pending' | 'ready' | 'failed' | null
  topic_freeform: string | null
  topic: { name_en: string; name_ko: string } | null
  created_at: string
}

export function GeneratingTestsChip() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const { user } = usePersistentMobileAuth()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select('id, generation_status, topic_freeform, created_at, topic:study_topics(name_en, name_ko)')
        .eq('student_id', user.userId)
        .eq('mode', 'full_test')
        .in('generation_status', ['pending', 'ready'])
        .eq('status', 'active') // hide if already started or completed
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled) return
      const raw = (data ?? []) as unknown as Row[]
      // Dedupe: keep only the most recent session per (topic name).
      // A student who tapped "Start test" 5 times on the same section
      // only sees ONE card for it — the newest. Pending wins over
      // ready (pending is the live one). Cap final list at 3 cards so
      // the chip never dominates the landing.
      const byKey = new Map<string, Row>()
      for (const r of raw) {
        const key = (r.topic ? r.topic.name_en : r.topic_freeform) ?? r.id
        const existing = byKey.get(key)
        if (!existing) { byKey.set(key, r); continue }
        // pending > ready (show the live one if both exist)
        if (existing.generation_status === 'ready' && r.generation_status === 'pending') {
          byKey.set(key, r)
        }
      }
      const next = Array.from(byKey.values()).slice(0, 3)
      setRows(next)
      // Keep polling only while at least one row is still pending.
      if (next.some(r => r.generation_status === 'pending')) {
        timer = setTimeout(tick, 5000)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [user?.userId])

  if (rows.length === 0) return null

  // Auto-fail stuck pending rows (>8 min old). Vercel's generator
  // maxDuration is ~300s, so pending past that is orphaned. Bucket
  // these into failed so the student sees a Retry affordance instead
  // of an eternal "Building your test…" spinner.
  const STUCK_PENDING_MS = 8 * 60 * 1000
  const now = Date.now()
  const isStuck = (r: Row) => r.generation_status === 'pending'
    && now - new Date(r.created_at).getTime() > STUCK_PENDING_MS

  // Split by state. Pending + failed need per-row visibility because
  // each carries live progress; multiple "ready" rows all share the
  // same action ("open test"), so they collapse into a single row.
  const pending = rows.filter(r => r.generation_status === 'pending' && !isStuck(r))
  const failed = rows.filter(r => r.generation_status === 'failed' || isStuck(r))
  const ready = rows.filter(r => r.generation_status === 'ready')

  const topicNameOf = (row: Row) => row.topic
    ? (ko ? row.topic.name_ko : row.topic.name_en)
    : (row.topic_freeform ?? '')

  return (
    <section className="space-y-2">
      {pending.map(row => (
        <StatusRow
          key={row.id}
          href={`/mobile/study/session/${row.id}`}
          state="pending"
          title={ko ? '시험 생성 중…' : 'Building your test…'}
          subtitle={topicNameOf(row)}
        />
      ))}
      {failed.map(row => (
        <StatusRow
          key={row.id}
          href={`/mobile/study/session/${row.id}`}
          state="failed"
          title={ko ? '생성 실패' : 'Generation failed'}
          subtitle={topicNameOf(row)}
        />
      ))}
      {ready.length === 1 && (
        <StatusRow
          href={`/mobile/study/session/${ready[0].id}`}
          state="ready"
          title={ko ? '시험 준비 완료' : 'Test ready'}
          subtitle={topicNameOf(ready[0])}
        />
      )}
      {ready.length > 1 && (
        <StatusRow
          // Tap opens the tests overview so the student can pick
          // which ready test to start (opening the newest one would
          // be a guess that fights the intent).
          href="/mobile/study/tests"
          state="ready"
          title={ko
            ? `시험 ${ready.length}개 준비 완료`
            : `${ready.length} tests ready`}
          subtitle={ready.map(topicNameOf).filter(Boolean).join(' · ')}
        />
      )}
    </section>
  )
}

function StatusRow({
  href, state, title, subtitle,
}: {
  href: string
  state: 'pending' | 'ready' | 'failed'
  title: string
  subtitle: string
}) {
  const ready = state === 'ready'
  const failed = state === 'failed'
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-2xl ring-1 transition-all active:scale-[0.99] ${
        ready
          ? 'bg-emerald-50 ring-emerald-200 hover:bg-emerald-100/60'
          : failed
            ? 'bg-rose-50 ring-rose-200 hover:bg-rose-100/60'
            : 'bg-primary/5 ring-primary/20 hover:bg-primary/10'
      }`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
        ready ? 'bg-emerald-500 text-white' : failed ? 'bg-rose-500 text-white' : 'bg-primary/15 text-primary'
      }`}>
        {ready
          ? <CheckCircle2 className="w-5 h-5" />
          : failed
            ? <AlertTriangle className="w-5 h-5" />
            : <Loader2 className="w-5 h-5 animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[13.5px] font-semibold leading-tight ${
          ready ? 'text-emerald-900' : failed ? 'text-rose-900' : 'text-gray-900'
        }`}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[12px] text-gray-600 truncate mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
        ready ? 'text-emerald-700' : failed ? 'text-rose-700' : 'text-primary'
      }`} />
    </Link>
  )
}
