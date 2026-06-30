"use client"

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock, Hash, Sparkles, Loader2, Award } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

/** Per-session test customization payload. Stored on
 *  study_sessions.config (jsonb) and read by the test generator.
 *  Question count + time limit are NOT overridable (mirrors the real
 *  test's format from the spec library). Language is NOT picked by
 *  the student — it's locked to the test's native language (KSAT → ko,
 *  everything else → en) by the caller. Only difficulty bias is user-
 *  configurable in the sheet itself. */
export interface TestConfig {
  /** Difficulty bias: 'balanced' uses the spec's mix as-is;
   *  'challenge' pushes ~50% hard; 'warmup' pushes ~50% easy. */
  difficultyBias?: 'balanced' | 'challenge' | 'warmup'
}

type DifficultyBias = 'warmup' | 'balanced' | 'challenge'

/**
 * Bottom-sheet customization panel shown before a full-test session
 * is created. The test format (count + time) is locked to the
 * official spec — students see what they're getting but can't tweak.
 * They only choose language + difficulty bias, with a recommended
 * difficulty based on their topic mastery.
 */
export function TestCustomizationSheet({
  open,
  defaults,
  topicId,
  family,
  onClose,
  onStart,
}: {
  open: boolean
  defaults: { count: number; minutes: number }
  topicId: string | null
  /** Test family — when 'sat', the difficulty picker is hidden and
   *  the bias is locked to 'challenge' (the real SAT is uniformly
   *  hard, so the warm-up / balanced options aren't meaningful). */
  family: string | null
  onClose: () => void
  onStart: (config: TestConfig) => void
}) {
  const { t, language: uiLanguage } = useTranslation()
  const ko = uiLanguage === 'korean'
  const [difficultyBias, setDifficultyBias] = useState<DifficultyBias>('balanced')
  const [recommended, setRecommended] = useState<DifficultyBias | null>(null)
  const [masteryScore, setMasteryScore] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)

  // Reset whenever the sheet reopens for a new test.
  useEffect(() => {
    if (!open) return
    setStarting(false)
  }, [open])

  // Compute the recommended difficulty by looking up the student's
  // mastery score on this topic. <50: warmup, 50-80: balanced, >80:
  // challenge. New-to-topic (no mastery row): balanced.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      if (!topicId) { setRecommended('balanced'); setMasteryScore(null); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setRecommended('balanced'); return }
      const { data } = await supabase
        .from('study_mastery')
        .select('score, attempts_count')
        .eq('student_id', user.id)
        .eq('topic_id', topicId)
        .maybeSingle()
      if (cancelled) return
      const score = (data?.score as number | undefined) ?? null
      const attempts = (data?.attempts_count as number | undefined) ?? 0
      setMasteryScore(score)
      let rec: DifficultyBias = 'balanced'
      if (score !== null && attempts >= 2) {
        if (score < 50) rec = 'warmup'
        else if (score >= 80) rec = 'challenge'
        else rec = 'balanced'
      }
      setRecommended(rec)
      setDifficultyBias(rec)
    })()
    return () => { cancelled = true }
  }, [open, topicId])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!open || !mounted) return null

  // SAT + TOEFL both hide the difficulty picker and lock to 'challenge'.
  // SAT: uniformly hard on Digital SAT — no warm-up tier exists in the
  // real exam. TOEFL Jan-2026: the new task types skew easy by default
  // (campus notice details, single-line response matching, simple chip
  // arrangement) — locking to challenge pushes the prompts to the upper
  // bound of each task's band so practice sessions actually discriminate.
  const hideDifficulty = family === 'sat' || family === 'toefl'
  const effectiveBias: DifficultyBias = hideDifficulty ? 'challenge' : difficultyBias

  const submit = () => {
    setStarting(true)
    onStart(effectiveBias !== 'balanced' ? { difficultyBias: effectiveBias } : {})
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)] animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
              {String(t('study.testConfig.title'))}
            </h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              {ko ? '실제 시험 형식 그대로 — 난이도만 선택하세요' : 'Real test format — only difficulty is yours to choose'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 active:scale-[0.94] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Test format — read-only, sourced from the spec library */}
          <SettingGroup icon={Award} label={ko ? '시험 형식' : 'Test format'}>
            <div className="grid grid-cols-2 gap-2">
              <FormatChip icon={Hash} value={String(defaults.count)} label={ko ? '문항' : 'questions'} />
              <FormatChip icon={Clock} value={`${defaults.minutes}m`} label={ko ? '제한 시간' : 'time limit'} />
            </div>
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              {ko ? '실제 시험과 같은 문항 수와 시간으로 출제됩니다.' : 'Mirrors the real test’s question count and timing.'}
            </p>
          </SettingGroup>

          {/* Difficulty bias — hidden for SAT (always locked to challenge) */}
          {!hideDifficulty && (
            <SettingGroup icon={Sparkles} label={String(t('study.testConfig.difficulty'))}>
              <SegmentedControl
                options={[
                  { value: 'warmup' as DifficultyBias, label: String(t('study.testConfig.difficultyWarmup')) },
                  { value: 'balanced' as DifficultyBias, label: String(t('study.testConfig.difficultyBalanced')) },
                  { value: 'challenge' as DifficultyBias, label: String(t('study.testConfig.difficultyChallenge')) },
                ]}
                value={difficultyBias}
                onChange={(v: DifficultyBias) => setDifficultyBias(v)}
                recommendedValue={recommended ?? undefined}
              />
              <DifficultyHint
                recommended={recommended}
                masteryScore={masteryScore}
                selected={difficultyBias}
                ko={ko}
              />
            </SettingGroup>
          )}
          {hideDifficulty && (
            <p className="text-[12px] text-gray-500 leading-relaxed">
              {family === 'toefl'
                ? (ko
                  ? '실제 TOEFL은 모듈 전체가 변별 수준으로 출제됩니다 — 가장 어려운 난이도로 고정됩니다.'
                  : 'The real TOEFL runs at discriminating difficulty across each section — this practice is locked to the hardest setting.')
                : (ko
                  ? '실제 디지털 SAT는 모듈 전체가 변별 수준으로 출제됩니다 — 가장 어려운 난이도로 고정됩니다.'
                  : 'The real Digital SAT runs at discriminating difficulty across the module — this practice is locked to the hardest setting.')}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-white via-white to-white/80 border-t border-gray-100">
          <button
            type="button"
            onClick={submit}
            disabled={starting}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25),0_8px_20px_-8px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 hover:from-primary/95 hover:to-primary/85 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait transition-all"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            {ko ? '시험 시작' : 'Start test'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

/** Read-only chip showing a value+label pair (e.g., "98 questions"). */
function FormatChip({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 ring-1 ring-gray-200/70 px-3 py-2.5">
      <Icon className="w-4 h-4 text-gray-500" />
      <div className="min-w-0">
        <div className="text-[16px] font-bold tabular-nums text-gray-900 leading-none">{value}</div>
        <div className="text-[10px] uppercase tracking-[0.10em] text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

/** Explanatory line under the difficulty picker — surfaces the
 *  recommendation reasoning so the student knows why we suggested
 *  that level (or that we don't have enough data to suggest). */
function DifficultyHint({
  recommended, masteryScore, selected, ko,
}: {
  recommended: DifficultyBias | null
  masteryScore: number | null
  selected: DifficultyBias
  ko: boolean
}) {
  if (recommended === null) {
    return <p className="text-[11px] text-gray-400 mt-2">{ko ? '난이도 계산 중…' : 'Calculating recommendation…'}</p>
  }
  if (masteryScore === null) {
    return (
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
        {ko
          ? '아직 이 주제 데이터가 부족해 균형 난이도를 추천합니다.'
          : "Not enough data on this topic yet — we suggest balanced."}
      </p>
    )
  }
  const matchesRec = selected === recommended
  const recLabel = recommended === 'warmup'
    ? (ko ? '쉬움' : 'Warm-up')
    : recommended === 'challenge'
      ? (ko ? '도전' : 'Challenge')
      : (ko ? '균형' : 'Balanced')
  const reason = recommended === 'warmup'
    ? (ko ? `숙련도 ${masteryScore}/100 — 기초를 다지기 좋은 난이도예요.` : `Mastery ${masteryScore}/100 — build confidence with easier items.`)
    : recommended === 'challenge'
      ? (ko ? `숙련도 ${masteryScore}/100 — 더 어려운 문제로 한계를 시험해보세요.` : `Mastery ${masteryScore}/100 — push your limits with harder items.`)
      : (ko ? `숙련도 ${masteryScore}/100 — 실전 비중에 가까운 난이도예요.` : `Mastery ${masteryScore}/100 — standard exam-realistic mix.`)
  return (
    <p className={`text-[11px] mt-2 leading-relaxed ${matchesRec ? 'text-primary' : 'text-gray-500'}`}>
      {matchesRec
        ? `✓ ${recLabel} ${ko ? '추천 — ' : ' recommended — '}${reason}`
        : `${ko ? '추천: ' : 'Suggested: '}${recLabel} — ${reason}`}
    </p>
  )
}

function SettingGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.10em] text-gray-600">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/** iOS-style segmented control with optional "recommended" star badge
 *  on the recommended option. */
function SegmentedControl<T>({
  options,
  value,
  onChange,
  recommendedValue,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  recommendedValue?: T
}) {
  return (
    <div className="inline-flex items-center w-full p-0.5 rounded-xl bg-gray-100 ring-1 ring-gray-200/70">
      {options.map(opt => {
        const selected = opt.value === value
        const isRecommended = recommendedValue !== undefined && opt.value === recommendedValue
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex-1 h-9 rounded-[10px] text-[13px] font-semibold tracking-tight transition-all ${
              selected
                ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_6px_-2px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]'
                : 'text-gray-500 hover:text-gray-700 active:scale-[0.97]'
            }`}
          >
            {opt.label}
            {isRecommended && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold shadow ring-2 ring-white"
                title="Recommended"
              >
                ★
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
