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

  return (
    <section className="space-y-2">
      {rows.map(row => {
        const isPending = row.generation_status === 'pending'
        const isReady = row.generation_status === 'ready'
        const isFailed = row.generation_status === 'failed'
        const topicName = row.topic
          ? (ko ? row.topic.name_ko : row.topic.name_en)
          : (row.topic_freeform ?? '')
        const titleText = isReady
          ? (ko ? '시험 준비 완료' : 'Test ready')
          : isFailed
            ? (ko ? '생성 실패' : 'Generation failed')
            : (ko ? '시험 생성 중…' : 'Building your test…')
        const subtitleText = topicName
        return (
          <Link
            key={row.id}
            href={`/mobile/study/session/${row.id}`}
            className={`group flex items-center gap-3 px-4 py-3 rounded-2xl ring-1 transition-all active:scale-[0.99] ${
              isReady
                ? 'bg-emerald-50 ring-emerald-200 hover:bg-emerald-100/60'
                : isFailed
                  ? 'bg-rose-50 ring-rose-200 hover:bg-rose-100/60'
                  : 'bg-primary/5 ring-primary/20 hover:bg-primary/10'
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              isReady ? 'bg-emerald-500 text-white' : isFailed ? 'bg-rose-500 text-white' : 'bg-primary/15 text-primary'
            }`}>
              {isReady
                ? <CheckCircle2 className="w-5 h-5" />
                : isFailed
                  ? <AlertTriangle className="w-5 h-5" />
                  : <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[13.5px] font-semibold leading-tight ${
                isReady ? 'text-emerald-900' : isFailed ? 'text-rose-900' : 'text-gray-900'
              }`}>
                {titleText}
              </div>
              {subtitleText && (
                <div className="text-[12px] text-gray-600 truncate mt-0.5">
                  {subtitleText}
                </div>
              )}
            </div>
            <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
              isReady ? 'text-emerald-700' : isFailed ? 'text-rose-700' : 'text-primary'
            }`} />
          </Link>
        )
      })}
    </section>
  )
}
