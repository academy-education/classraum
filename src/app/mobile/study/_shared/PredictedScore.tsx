"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Target, ArrowRight, Sparkles, Lock, ListChecks, Layers, Clock, Crown } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { NumberRoll } from './primitives'
import { StudyButton, studyButtonClass } from './StudyButton'
import { CreditConfirmSheet } from './CreditConfirmSheet'
import { creditCostForTest } from '@/lib/study/plans'

// The diagnostic launches an SAT Reading & Writing adaptive full test.
const DIAGNOSTIC_CREDIT_COST = creditCostForTest('sat', 'reading_writing')

// Digital SAT structure — shown on the diagnostic card so students know
// exactly what the baseline test involves. Reading & Writing: 2 adaptive
// modules × 27 (54 Q, 64 min); Math: 2 × 22 (44 Q, 70 min).
const SAT_FORMAT = { questions: 98, modules: 4, minutes: 134 }
// Section topic slug the assemble route maps to a seed topic. The
// diagnostic starts with Reading & Writing (the SAT root's canonical
// adaptive full test); Math is diagnosed when they take that section.

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
  const router = useRouter()
  const [data, setData] = useState<Payload | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [starting, setStarting] = useState(false)
  // Credit-spend confirm — the diagnostic charges like any full mock.
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        // Prediction + subscription tier in parallel — the diagnostic
        // card is premium-gated, so we need both before rendering it.
        const [predRes, subRes] = await Promise.all([
          fetch('/api/study/prediction', { headers }),
          fetch('/api/study/subscription', { headers }),
        ])
        if (predRes.ok) {
          const json = (await predRes.json()) as Payload
          if (!cancelled) setData(json)
        }
        if (subRes.ok) {
          const sub = await subRes.json()
          if (!cancelled) setIsPremium(sub?.tier === 'premium')
        } else if (!cancelled) {
          setIsPremium(false)
        }
      } catch {
        if (!cancelled) setIsPremium(false)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Launch the real adaptive Digital SAT (Reading & Writing module 1) —
  // the same instant bank assembly the topic page uses. Costs credits
  // like any full mock (R&W = 2 since the 2026-07 relaunch). The
  // completed test writes mastery, which powers the predicted score and
  // the weak-area picks on the "recommended for you" shelf.
  const startDiagnostic = async () => {
    if (starting) return
    setStarting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/assemble', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'reading_writing', adaptive: true }),
      })
      if (res.status === 402) { router.push('/mobile/study/subscription'); return }
      if (!res.ok) { setStarting(false); return }
      const json = await res.json()
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setStarting(false)
    }
  }

  // Shimmer while loading so the card appears WITH the page instead of
  // popping in after its own fetches (parents only mount this when the
  // prediction is supported, so the skeleton never flashes-then-hides).
  if (!loaded) {
    return (
      <section aria-hidden>
        <div className="h-[150px] rounded-2xl bg-gray-200/70 animate-pulse" />
      </section>
    )
  }
  // Self-hide only for the unsupported (non-SAT) target edge case.
  if (!data || !data.supported) return null

  // Cold start — no completed full test yet. Premium-gated diagnostic:
  // free users see the format + an unlock CTA; premium users confirm
  // the credit spend, then start.
  if (!data.enoughData) {
    return (
      <>
        <DiagnosticCard ko={ko} isPremium={isPremium === true} starting={starting} onStart={() => setConfirmOpen(true)} />
        <CreditConfirmSheet
          open={confirmOpen}
          cost={DIAGNOSTIC_CREDIT_COST}
          busy={starting}
          ko={ko}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void startDiagnostic().finally(() => setConfirmOpen(false))}
        />
      </>
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

/**
 * Cold-start diagnostic — the premium upsell surface. Shows the Digital
 * SAT format so students know what they're committing to, then either
 * launches the real adaptive test (premium) or routes to the paywall
 * (free). Baseline results feed the predicted score + recommended shelf.
 */
function DiagnosticCard({ ko, isPremium, starting, onStart }: {
  ko: boolean; isPremium: boolean; starting: boolean; onStart: () => void
}) {
  const hrs = Math.floor(SAT_FORMAT.minutes / 60)
  const mins = SAT_FORMAT.minutes % 60
  const timeStr = ko ? `${hrs}시간 ${mins}분` : `${hrs}h ${mins}m`
  const facts: { Icon: typeof ListChecks; value: string; label: string }[] = [
    { Icon: ListChecks, value: String(SAT_FORMAT.questions), label: ko ? '문항' : 'Questions' },
    { Icon: Layers, value: String(SAT_FORMAT.modules), label: ko ? '모듈' : 'Modules' },
    { Icon: Clock, value: timeStr, label: ko ? '소요' : 'Length' },
    { Icon: Sparkles, value: ko ? '적응형' : 'Adaptive', label: ko ? '방식' : 'Format' },
  ]
  return (
    <Shell>
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
          <Target className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">{ko ? '진단 모의고사' : 'Diagnostic'}</p>
            {!isPremium && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-300/25 ring-1 ring-amber-200/40 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-100">
                <Crown className="w-2.5 h-2.5" />{ko ? '프리미엄' : 'Premium'}
              </span>
            )}
          </div>
          <p className="text-[15px] font-bold leading-tight mt-0.5">{ko ? 'SAT 기준 점수 찾기' : 'Find your SAT baseline'}</p>
          <p className="text-[12px] text-white/75 leading-snug mt-0.5">
            {ko
              ? '전체 적응형 디지털 SAT를 풀면 예상 점수가 정해지고, 취약 영역에 맞춘 연습이 추천돼요.'
              : 'One adaptive Digital SAT sets your predicted score and unlocks practice targeted at your weak areas.'}
          </p>
        </div>
      </div>

      {/* Test format facts */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {facts.map((f, i) => {
          const Icon = f.Icon
          return (
            <div key={i} className="rounded-xl bg-white/10 ring-1 ring-white/15 px-1.5 py-2 text-center">
              <Icon className="w-3.5 h-3.5 mx-auto text-white/70" />
              <div className="text-[13px] font-bold tabular-nums leading-none mt-1">{f.value}</div>
              <div className="text-[9px] uppercase tracking-wide text-white/55 mt-0.5">{f.label}</div>
            </div>
          )
        })}
      </div>

      {/* CTA — start (premium) or unlock (free). Reading & Writing runs
          first; the note keeps that honest without cluttering the facts. */}
      <div className="mt-3">
        {isPremium ? (
          <>
            <StudyButton
              variant="inverse"
              fullWidth
              loading={starting}
              onClick={onStart}
              leftIcon={<ArrowRight className="w-4 h-4" />}
            >
              {ko ? '진단 시작하기' : 'Start diagnostic'}
            </StudyButton>
            <p className="text-[10.5px] text-white/55 text-center mt-1.5">
              {ko ? 'Reading & Writing부터 시작 · 크레딧 2개 사용' : 'Begins with Reading & Writing · uses 2 credits'}
            </p>
          </>
        ) : (
          <>
            <Link
              href="/mobile/study/subscription"
              className={studyButtonClass({ variant: 'inverse', fullWidth: true })}
            >
              <Lock className="w-4 h-4" />{ko ? '프리미엄으로 잠금 해제' : 'Unlock with Premium'}
            </Link>
            <p className="text-[10.5px] text-white/55 text-center mt-1.5">
              {ko ? '진단 모의고사 + 취약 영역 맞춤 연습은 프리미엄 전용이에요.' : 'Diagnostic + targeted weak-area practice are Premium features.'}
            </p>
          </>
        )}
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
