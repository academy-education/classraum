"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Target, ArrowRight, Sparkles } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { NumberRoll } from './primitives'

/**
 * Predicted SAT score — the headline of the score-plan engine (P1).
 * Fetches /api/study/prediction and renders one of a few honest states:
 *   • non-SAT target        → self-hides
 *   • no full test yet      → "take a test to unlock your prediction"
 *   • enough data           → big predicted number + band + goal gap
 * The gap → plan surface comes in P3.
 */

interface SectionProjection { key: string; label_en: string; label_ko: string; current: number | null; predicted: number | null }
interface Payload {
  supported: boolean
  enoughData: boolean
  hasTrend: boolean
  predicted: number | null
  low: number | null
  high: number | null
  current: number | null
  goalScore: number | null
  gap: number | null
  onTrack: boolean | null
  weeksToTest: number | null
  sections: SectionProjection[]
}

export function PredictedScore() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<Payload | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prediction', { headers })
        if (!res.ok) { if (!cancelled) setLoaded(true); return }
        const json = (await res.json()) as Payload
        if (!cancelled) { setData(json); setLoaded(true) }
      } catch { if (!cancelled) setLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [])

  // Self-hide until loaded and only for the supported (SAT) target.
  if (!loaded || !data || !data.supported) return null

  // Cold start — no completed full test yet. Nudge toward a diagnostic.
  if (!data.enoughData) {
    return (
      <Shell>
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">{ko ? '진단 모의고사로 시작하기' : 'Start with a diagnostic'}</p>
            <p className="text-[12px] text-white/75 leading-snug">
              {ko ? '전체 모의고사를 한 번 풀면 기준 점수와 예상 SAT 점수를 잡아드려요.' : 'Take one full practice test to set your baseline and predicted SAT score.'}
            </p>
          </div>
          <Link href="/mobile/study/builder" aria-label={ko ? '진단 모의고사 풀기' : 'Take a diagnostic'}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white/15 ring-1 ring-white/20 flex items-center justify-center hover:bg-white/25 transition">
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Shell>
    )
  }

  const rangeStr = data.low != null && data.high != null ? `${data.low}–${data.high}` : ''
  const goalSet = data.goalScore != null

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">
            <TrendingUp className="w-3 h-3" />{ko ? '예상 점수' : 'Predicted score'}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[40px] font-bold leading-none tabular-nums">
              <NumberRoll target={data.predicted ?? 0} />
            </span>
            {rangeStr && <span className="text-[13px] text-white/70 tabular-nums">{ko ? `범위 ${rangeStr}` : `range ${rangeStr}`}</span>}
          </div>
          {!data.hasTrend && (
            <p className="mt-1 text-[11px] text-white/60">{ko ? '지금 실력 기준 · 모의고사가 많을수록 정확해져요' : 'Based on your latest test · more tests sharpen it'}</p>
          )}
        </div>
        {data.weeksToTest != null && (
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/60">{ko ? '시험까지' : 'To test'}</p>
            <p className="text-[18px] font-bold tabular-nums leading-none mt-0.5">{data.weeksToTest}{ko ? '주' : 'w'}</p>
          </div>
        )}
      </div>

      {/* Goal row */}
      <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between gap-3">
        {goalSet ? (
          data.onTrack ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-200">
              <Target className="w-3.5 h-3.5" />{ko ? `목표 ${data.goalScore} · 순조롭게 가는 중! 🎯` : `Goal ${data.goalScore} · On track! 🎯`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/85">
              <Target className="w-3.5 h-3.5" />
              {ko ? `목표 ${data.goalScore} · ${data.gap}점 더` : `Goal ${data.goalScore} · ${data.gap} to go`}
            </span>
          )
        ) : (
          <Link href="/mobile/study/preferences" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/85 hover:text-white transition">
            <Target className="w-3.5 h-3.5" />{ko ? '목표 점수 설정하기' : 'Set a goal score'}<ArrowRight className="w-3 h-3" />
          </Link>
        )}
        {/* Per-section quick read */}
        <span className="flex-shrink-0 text-[11px] text-white/60 tabular-nums">
          {data.sections.filter(s => s.current != null).map(s =>
            `${(ko ? s.label_ko : s.label_en).split(/[ &·]/)[0]} ${s.current}`
          ).join(' · ')}
        </span>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-indigo-700 text-white p-4 shadow-[0_8px_24px_-12px_rgba(40,133,232,0.5)]">
        <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">{children}</div>
      </div>
    </section>
  )
}
