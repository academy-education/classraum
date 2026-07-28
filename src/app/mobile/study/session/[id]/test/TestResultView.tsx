"use client"

import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles, ListChecks,
} from '@/app/mobile/study/_shared/icons'
import { PathMascot, type MascotState } from '@/app/mobile/study/_shared/PathMascot'
import { useTranslation } from '@/hooks/useTranslation'
import { normalizeDisplayText, PassageParagraphs, percentToToeflBand } from './helpers'
import { QuestionGraphicView } from './QuestionGraphicView'
import { WritingFeedbackPanel } from './WritingPanels'
import { ReportQuestion } from '@/app/mobile/study/_shared/ReportQuestion'
import type { SpeechSignals } from './types'
import { tallyRows, scaleFraction, type ResultRow, type TestResultModel } from '@/lib/study/test-result'

/** Types whose answer is prose, not a pick from `choices`. Kept as an
 *  explicit list because `arrange_words` DOES populate `choices` (its word
 *  bank), so "no choices" is not the same question. */
const FREE_TEXT_TYPES = new Set([
  'fill_in_blanks', 'arrange_words', 'speaking_repeat', 'speaking_interview',
  'writing_email', 'writing_discussion',
])

/**
 * THE result screen. One component, rendered both immediately after
 * submitting and whenever a finished test is reopened, so the two can no
 * longer disagree — which they did four times in one day, always by
 * computing the same number two ways.
 *
 * It renders a TestResultModel and derives no scores of its own. Anything
 * it cannot get from the model is a prop, and anything that is only
 * available in one of the two contexts (recorded audio, speech signals) is
 * optional and degrades to absent.
 */
export function TestResultView({
  model, sessionId, ko, sat,
  answerAudioPaths = {}, answerSpeechSignals = {}, speakingGradeMode = 'text',
  header, footer,
}: {
  model: TestResultModel
  sessionId: string
  ko: boolean
  /** Estimated 200-800 section band. SAT only; null everywhere else. */
  sat?: { score: number; capped: boolean } | null
  /** Speaking extras — post-submit only, absent on a reopened test. */
  answerAudioPaths?: Record<number, string>
  answerSpeechSignals?: Record<number, SpeechSignals>
  speakingGradeMode?: 'text' | 'audio'
  /** Screen-specific chrome above/below the shared body. */
  header?: React.ReactNode
  footer?: React.ReactNode
}) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  // Unit: CARDS, and a true partition — the four always sum to
  // rows.length. The first draft counted a pilot as both "graded" and
  // "pilot", so a 30-card test showed chips adding to 43 under a heading
  // that said 30.
  const tally = tallyRows(model.rows)

  // Hero colour and Raumi's mood both follow accuracy. A hard session must
  // never read as a celebration — the summary screen established this rule
  // and it moves here with the hero.
  const hero = model.scorePercent >= 80
    ? { gradient: 'from-emerald-500 via-emerald-600 to-teal-700' }
    : model.scorePercent >= 60
      ? { gradient: 'from-amber-500 via-orange-500 to-orange-700' }
      : { gradient: 'from-rose-500 via-rose-600 to-red-700' }
  const mascotState: MascotState =
    model.scorePercent >= 80 ? 'celebrate' : model.scorePercent >= 60 ? 'idle' : 'sad'

  return (
    <div className="px-5 py-6 space-y-5">
      {header}

      {/* Hero — the score as a moment, not a table cell. Raumi reacts to
          how it went, and the gradient follows accuracy so a rough session
          never gets a cheerful green. This replaced a plain white score
          card: the same numbers, but the screen you actually want to see
          after finishing a two-hour test. */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${hero.gradient} p-6 text-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.32)]`}>
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute top-4 right-4 opacity-95 pointer-events-none">
          <PathMascot size={72} state={mascotState} />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-90 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {t('study.test.resultEyebrow')}
          </div>
          <h2 className="text-[40px] font-bold leading-none tracking-tight tabular-nums">
            <CountUp value={model.scorePercent} /><span className="text-[24px] opacity-80">%</span>
          </h2>
          <p className="text-[14px] mt-1.5 opacity-90 tabular-nums">
            {model.correctCount} / {model.totalScored} {ko ? '정답' : 'correct'}
          </p>
          <p className="text-[12.5px] mt-1 opacity-75 leading-snug max-w-[85%]">
            {t(`study.test.resultMessage.${
              model.scorePercent >= 85 ? 'excellent' :
              model.scorePercent >= 65 ? 'solid' :
              model.scorePercent >= 40 ? 'keepGoing' : 'startOver'
            }`)}
          </p>

          {/* Scale readings.
            *
            * Each is a row rather than a pill: the number alone ("2.0")
            * means nothing without the scale it sits on, and a student
            * reading a first result does not know whether 2.0 of 6 is
            * near the floor or the middle. So each row carries its range,
            * a meter, and one line saying what the number is.
            *
            * No proficiency labels ("Intermediate") — ETS publishes those
            * and we would be inventing the mapping. Everything here is
            * derivable from the score and its scale. */}
          {model.family === 'toefl' && (
            <div className="mt-5 space-y-2.5">
              <ScaleRow
                label={ko ? '밴드 점수' : 'Band score'}
                value={percentToToeflBand(model.scorePercent).toFixed(1)}
                min={1} max={6}
                fraction={scaleFraction(percentToToeflBand(model.scorePercent), 1, 6)}
                note={ko ? '이 섹션의 밴드 점수예요. 네 개 섹션의 평균이 총점이 됩니다.'
                         : 'This section only. Your overall score averages all four.'}
              />
              <ScaleRow
                label={ko ? '섹션 점수' : 'Section score'}
                value={String(Math.round((model.scorePercent / 100) * 30))}
                min={0} max={30}
                fraction={scaleFraction(Math.round((model.scorePercent / 100) * 30), 0, 30)}
                note={ko ? 'ETS가 2년 전환 기간 동안 함께 제공하는 0-30 환산 점수예요.'
                         : 'The 0–30 score ETS still issues through the 2-year transition.'}
              />
            </div>
          )}
          {model.family === 'sat' && sat && (
            <div className="mt-5 space-y-2.5">
              <ScaleRow
                label={ko ? '예상 섹션 점수' : 'Est. section score'}
                value={String(sat.score)}
                min={200} max={800}
                fraction={scaleFraction(sat.score, 200, 800)}
                note={sat.capped
                  ? (ko ? '하위 모듈을 받아 상한이 적용된 추정치예요. 실제 시험과 동일합니다.'
                        : 'Capped — you were routed to the easier Module 2, exactly as on the real test.')
                  : (ko ? '상위 모듈 기준 추정치예요. 모의고사를 더 풀수록 정확해집니다.'
                        : 'Based on the harder Module 2. More full tests sharpen it.')}
              />
            </div>
          )}

          {/* Counts. Every label names its unit, because two of these
              three count different things and every previous version of
              this screen let a student read them as one set. */}
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-2">
            <HeroStat
              icon={CheckCircle2}
              value={String(model.correctCount)}
              label={ko ? '정답' : 'Correct'}
              sub={ko ? `채점 ${model.totalScored}문항 중` : `of ${model.totalScored} scored`}
            />
            <HeroStat
              icon={XCircle}
              value={String(Math.max(0, model.totalScored - model.correctCount))}
              label={ko ? '오답' : 'Missed'}
              sub={ko ? `채점 ${model.totalScored}문항 중` : `of ${model.totalScored} scored`}
            />
            <HeroStat
              icon={ListChecks}
              value={String(model.deliveredTotal)}
              label={ko ? '출제' : 'Delivered'}
              sub={ko ? '실제로 푼 문항' : 'questions you saw'}
            />
          </div>
        </div>
      </div>

      {/* Reconcile the denominator with the list below.
        *
        * The hero counts SCORED questions (35); the rows are numbered out
        * of DELIVERED (48). A student answered 48 and was scored on 35
        * with nothing saying where the other 13 went.
        *
        * The reason has to match the actual session. The first version
        * always said "experimental", and a TOEFL Speaking result read
        * "the other 4 are experimental" when those 4 were rubric-graded
        * responses and the test had no pilots at all — a confident,
        * checkable, wrong explanation. Word it from the tally. */}
      {model.deliveredTotal > model.totalScored && (
        <div className="rounded-2xl ring-1 ring-amber-200/70 bg-amber-50/60 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 leading-relaxed">
            {ko
              ? `${model.deliveredTotal}문항 중 ${model.totalScored}문항만 점수에 반영됩니다. 나머지 ${model.deliveredTotal - model.totalScored}문항은 ${
                  tally.pilot > 0 && tally.rubric > 0 ? '실험 문항과 루브릭 채점 문항으로'
                  : tally.rubric > 0 ? '루브릭으로 따로 채점되며'
                  : '실험 문항으로'
                }, 실제 시험과 동일하게 채점 결과에서 제외됩니다.`
              : `Scored on ${model.totalScored} of the ${model.deliveredTotal} questions you answered. The other ${model.deliveredTotal - model.totalScored} ${
                  tally.pilot > 0 && tally.rubric > 0
                    ? 'are experimental or graded separately by rubric'
                    : tally.rubric > 0
                      ? 'are open responses, graded separately by rubric'
                      : 'are experimental — shown and reviewed, but not counted'
                }, exactly as on the real exam.`}
          </p>
        </div>
      )}

      {/* Accounting — where every CARD went. Named in cards precisely
          because the score above is in questions and the two differ. */}
      <div className="rounded-2xl ring-1 ring-gray-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500 mb-3">
          {ko ? `카드 ${model.rows.length}개 구성` : `Where your ${model.rows.length} cards went`}
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Tally tint="emerald" value={tally.counted} label={ko ? '점수 반영' : 'Counted'} />
          <Tally tint="orange" value={tally.pilot} label={ko ? '실험' : 'Pilot'} />
          <Tally tint="primary" value={tally.rubric} label={ko ? '루브릭' : 'Rubric'} />
          <Tally tint="amber" value={tally.skipped} label={ko ? '미응답' : 'Skipped'} />
        </div>
      </div>

      {/* Per-question detail — collapsed. This screen answers "how did I
          do" first; "what exactly did I miss" is long (up to 30 rows) and
          opt-in, which is what lets one screen serve both entry points. */}
      <section>
        <button
          type="button"
          onClick={() => setShowDetail(v => !v)}
          aria-expanded={showDetail}
          className="w-full flex items-center justify-between gap-2 rounded-2xl ring-1 ring-gray-200/70 bg-white px-4 py-3 mb-2 text-left hover:ring-primary/40 active:scale-[0.995] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
        >
          <span className="text-sm font-semibold text-gray-900">{t('study.test.reviewTitle')}</span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 tabular-nums">
            {model.rows.length}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetail ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {showDetail && (
          <div className="space-y-2">
            {model.rows.map((row, i) => (
              <ResultCard
                key={i}
                row={row}
                deliveredTotal={model.deliveredTotal}
                sessionId={sessionId}
                ko={ko}
                audioPath={answerAudioPaths[i]}
                speechSignals={answerSpeechSignals[i]}
                speakingGradeMode={speakingGradeMode}
              />
            ))}
          </div>
        )}
      </section>

      {footer}
    </div>
  )
}

/**
 * Eases 0->value on mount so the score lands as a moment rather than
 * popping in.
 *
 * The animation is skipped rather than started whenever it cannot be
 * trusted to finish. Browsers do not fire requestAnimationFrame in a
 * backgrounded tab, so the version that unconditionally did
 * `setShown(0)` and then waited for rAF left the number stuck at 0 — a
 * student who opened their result in a background tab, or switched away
 * during the first second, came back to a screen reporting 0% over
 * "6 / 35 correct". Caught in the preview, where the pane was hidden.
 *
 * Two guards, because a decorative flourish must never be the reason a
 * score is wrong: don't start unless the page is visible, and snap to
 * the value if the frames stop arriving anyway.
 */
function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || document.visibilityState !== 'visible') {
      setShown(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setShown(0)
    raf = requestAnimationFrame(tick)
    // Backstop: if the tab is hidden mid-run the frames stop and the
    // number would freeze partway. Land on the real value regardless.
    const settle = window.setTimeout(() => setShown(value), durationMs + 250)
    return () => { cancelAnimationFrame(raf); window.clearTimeout(settle) }
  }, [value, durationMs])
  return <>{shown}</>
}

/**
 * One scale reading — band, section, or SAT estimate — shown against the
 * scale it belongs to.
 *
 * The meter's fill comes from scaleFraction, which subtracts the floor.
 * A TOEFL band of 1.0 is the worst possible result and must read as an
 * empty bar; value/max would have shown it 17% full.
 */
function ScaleRow({ label, value, min, max, fraction, note }: {
  label: string; value: string; min: number; max: number
  fraction: number; note: string
}) {
  return (
    <div className="rounded-2xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.10em] opacity-90">{label}</span>
        <span className="tabular-nums">
          <span className="text-[22px] font-bold leading-none">{value}</span>
          <span className="text-[12px] opacity-70 ml-1">/ {max}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full bg-white/85 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(fraction * 100)}%` }}
        />
      </div>
      {/* Range and meaning on ONE flowing line. They were a left-aligned
          floor marker and a right-aligned note, which at 375px wrapped
          around each other into an L. The floor still has to be stated —
          TOEFL bands start at 1, not 0, so an empty meter is a 1.0. */}
      <p className="text-[10.5px] opacity-75 leading-snug mt-2">
        <span className="font-semibold opacity-90 tabular-nums">{min}–{max} scale.</span>{' '}
        {note}
      </p>
    </div>
  )
}

function HeroStat({ icon: Icon, value, label, sub }: {
  icon: typeof CheckCircle2; value: string; label: string
  /** The unit. Not decoration — CORRECT and MISSED are scored questions
   *  while DELIVERED is every question shown, and the three sit side by
   *  side. */
  sub?: string
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25 mb-1.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[22px] font-bold tracking-tight leading-none tabular-nums">{value}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] opacity-85 mt-1">{label}</div>
      {sub && <div className="text-[10px] opacity-65 mt-0.5 leading-tight">{sub}</div>}
    </div>
  )
}

function Tally({ tint, value, label }: {
  tint: 'emerald' | 'amber' | 'orange' | 'primary'; value: number; label: string
}) {
  const tints = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/70',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200/70',
    primary: 'bg-primary/10 text-primary ring-primary/20',
  }[tint]
  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ring-1 ${tints} text-[15px] font-bold tabular-nums`}>
        {value}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500 mt-1">{label}</div>
    </div>
  )
}

/** One CARD in the review list. */
function ResultCard({
  row, deliveredTotal, sessionId, ko, audioPath, speechSignals, speakingGradeMode,
}: {
  row: ResultRow
  deliveredTotal: number
  sessionId: string
  ko: boolean
  audioPath?: string
  speechSignals?: SpeechSignals
  speakingGradeMode: 'text' | 'audio'
}) {
  const { t } = useTranslation()
  const [isOpen, setOpen] = useState(false)
  const q = row.question
  const studentAnswer = row.studentAnswer
  const choices = q.choices ?? []
  const missed = !row.ungraded && !row.correct

  return (
    <div className={`relative rounded-2xl ring-1 bg-white overflow-hidden transition-all ${
      isOpen ? 'shadow-[0_2px_12px_-2px_rgba(0,0,0,0.10)]' : 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
    } ${
      missed ? 'ring-rose-200/80' : row.ungraded ? 'ring-primary/20' : row.isPilot ? 'ring-amber-200/70' : 'ring-gray-200/70'
    } ${isOpen ? '' : 'hover:ring-primary/40 active:scale-[0.995]'}`}>
      {/* Verdict stripe — lets the outcome of 30 rows read in one scroll
          without opening any of them. */}
      <div aria-hidden className={`absolute inset-y-0 left-0 w-1 ${
        row.ungraded ? 'bg-primary/40'
          : row.correct ? 'bg-emerald-400'
          : studentAnswer == null ? 'bg-amber-400'
          : 'bg-rose-400'
      }`} />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 pl-5 pr-4 py-3.5 text-left hover:bg-gray-50/70 transition-colors"
      >
        {/* Verdict tile — same 9x9 rounded-xl language as the rest of study. */}
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ring-1 flex-shrink-0 ${
          row.ungraded ? 'bg-primary/10 text-primary ring-primary/20'
            : row.correct ? 'bg-emerald-50 text-emerald-600 ring-emerald-200/70'
            : studentAnswer == null ? 'bg-amber-50 text-amber-600 ring-amber-200/70'
            : 'bg-rose-50 text-rose-600 ring-rose-200/70'
        }`}>
          {row.ungraded ? <Sparkles className="w-4 h-4" />
            : row.correct ? <CheckCircle2 className="w-4 h-4" />
            : studentAnswer == null ? <AlertTriangle className="w-4 h-4" />
            : <XCircle className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="text-xs text-gray-500">
            {/* No label at all when the session's order is unrecoverable —
                see canNumberRows. An index-derived number would look right
                and point at the wrong question. */}
            {row.range && t('study.test.questionN', {
              current: row.range.startAt === row.range.endAt
                ? String(row.range.startAt)
                : `${row.range.startAt}–${row.range.endAt}`,
              total: String(deliveredTotal),
            })}
            {/* Two unrelated reasons an item may not count, needing
                different words. The pilot case had NO label, which is why
                "4 / 35" sat above rows numbered "of 48". */}
            {row.ungraded ? (
              <span className={row.range ? 'ml-1.5 text-primary font-medium' : 'text-primary font-medium'}>
                {row.range ? '· ' : ''}{ko ? '루브릭 채점 (점수 미포함)' : 'rubric-graded (not in score)'}
              </span>
            ) : row.isPilot ? (
              <span className={row.range ? 'ml-1.5 text-amber-700 font-medium' : 'text-amber-700 font-medium'}>
                {row.range ? '· ' : ''}{ko ? '실험 문항 (점수 미포함)' : 'experimental · not counted'}
              </span>
            ) : null}
          </div>
          <div className="text-[13.5px] leading-snug text-gray-900 line-clamp-2 mt-1 font-medium">
            {normalizeDisplayText(q.prompt)}
          </div>
          {/* The single most useful line, without making the student open
              the row: what they put, and what it should have been. Only
              where a short comparison is honest — open responses and
              blank-maps are not one-liners. */}
          {!isOpen && !row.ungraded && !FREE_TEXT_TYPES.has(q.type ?? '') && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11.5px]">
              {studentAnswer == null ? (
                <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 px-1.5 py-0.5 font-medium">
                  {ko ? '무응답' : 'Skipped'}
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium max-w-full ${
                  row.correct
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
                }`}>
                  <span className="truncate">{normalizeDisplayText(studentAnswer)}</span>
                </span>
              )}
              {!row.correct && row.correctAnswerDisplay && (
                <>
                  <span className="text-gray-300">→</span>
                  <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 px-1.5 py-0.5 font-semibold max-w-full">
                    <span className="truncate">{normalizeDisplayText(row.correctAnswerDisplay)}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      {isOpen && (
        <div className="pl-5 pr-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
          {q.passage && (
            <div className="rounded-xl ring-1 ring-gray-200/70 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
              <PassageParagraphs text={q.passage} />
            </div>
          )}
          <p className="text-gray-900 whitespace-pre-wrap">{normalizeDisplayText(q.prompt)}</p>
          {q.graphic != null && <QuestionGraphicView graphic={q.graphic} />}

          {q.type === 'fill_in_blanks' && (q.blanks?.length ?? 0) > 0 ? (
            // Complete-the-Words: per-blank rows. The stored answer is a
            // JSON blankId->text map, which renders as a raw blob otherwise.
            <div className="space-y-1.5 mt-2">
              {(() => {
                let parsed: Record<string, string> = {}
                try { if (studentAnswer) parsed = JSON.parse(studentAnswer) as Record<string, string> }
                catch { /* unanswered or legacy format */ }
                const baseNum = row.range?.startAt ?? 1
                return q.blanks!.map((b, bi) => {
                  const student = (parsed[String(b.id)] ?? '').trim()
                  const accepted = [b.answer, ...(b.alternates ?? [])]
                  const ok = !!student && accepted.some(a => a.trim().toLowerCase() === student.toLowerCase())
                  return (
                    <div key={b.id} className={`px-3 py-2 rounded-xl text-xs ring-1 flex items-center gap-2 ${
                      ok ? 'bg-emerald-50 ring-emerald-200/70 text-emerald-900'
                         : 'bg-rose-50 ring-rose-200/70 text-rose-900'
                    }`}>
                      {/* Falls back to a within-card 1..N when the session
                          can't be numbered — local to the paragraph, so it
                          never implies a test-wide position. */}
                      <span className="font-semibold tabular-nums flex-shrink-0">{row.range ? baseNum + bi : bi + 1}.</span>
                      <span className="flex-1 min-w-0">
                        {student || (ko ? '무응답' : 'not answered')}
                        {!ok && <span className="ml-2 font-semibold text-emerald-700">→ {b.answer}</span>}
                      </span>
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                    </div>
                  )
                })
              })()}
            </div>
          ) : FREE_TEXT_TYPES.has(q.type ?? '') || choices.length === 0 ? (
            // Free-text and constructed-response types: show the key (or an
            // em dash for rubric items) against what the student wrote.
            // Matched on TYPE, not on an empty choice list: arrange_words
            // carries its word bank in `choices`, so a choices-only test
            // would silently render it as multiple choice.
            <div className="space-y-2 mt-2">
              <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs ring-1 ring-emerald-200/70">
                <div className="font-semibold mb-0.5">{ko ? '정답' : 'Correct answer'}</div>
                <div className="whitespace-pre-wrap">{normalizeDisplayText(row.correctAnswerDisplay)}</div>
              </div>
              {studentAnswer != null ? (
                <div className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                  row.correct ? 'bg-gray-50 text-gray-700 ring-gray-200/70'
                              : 'bg-rose-50 text-rose-900 ring-rose-200/70'
                }`}>
                  <div className="font-semibold mb-0.5">{ko ? '내 답' : 'Your answer'}</div>
                  <div className="whitespace-pre-wrap">{normalizeDisplayText(studentAnswer)}</div>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-900 text-xs ring-1 ring-amber-200/70">
                  {ko ? '답하지 않음' : 'Not answered'}
                </div>
              )}
              {(q.type === 'writing_email' || q.type === 'writing_discussion') && studentAnswer != null && (
                <WritingFeedbackPanel
                  sessionId={sessionId} prompt={q.prompt} response={studentAnswer} skill="writing"
                  taskType={q.type === 'writing_email' ? 'email' : 'academic_discussion'} ko={ko}
                />
              )}
              {q.type === 'speaking_interview' && studentAnswer != null && (
                // audioPath / speechSignals are post-submit only; the panel
                // grades the transcript either way and hides playback when
                // there is no recording to play.
                <WritingFeedbackPanel
                  sessionId={sessionId} prompt={q.prompt} response={studentAnswer} skill="speaking"
                  audioPath={audioPath} speechSignals={speechSignals}
                  speakingGradeMode={speakingGradeMode} ko={ko}
                />
              )}
            </div>
          ) : (
            <div className="space-y-1.5 mt-2">
              {choices.map(choice => {
                const isCorrect = choice === q.correct_answer
                const isStudentPick = choice === studentAnswer
                const distractorReason = !isCorrect
                  ? q.distractor_rationales?.find(d => d.choice === choice)?.reason
                  : undefined
                return (
                  <div key={choice} className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                    isCorrect ? 'bg-emerald-50 text-emerald-900 ring-emerald-200/70'
                      : isStudentPick ? 'bg-rose-50 text-rose-900 ring-rose-200/70'
                      : 'bg-gray-50 text-gray-700 ring-gray-200/50'
                  }`}>
                    <div>
                      {normalizeDisplayText(choice)}
                      {isCorrect && <span className="ml-2 font-semibold">{ko ? '정답' : 'Correct'}</span>}
                      {isStudentPick && !isCorrect && <span className="ml-2 font-semibold">{ko ? '내 답' : 'Your answer'}</span>}
                    </div>
                    {distractorReason && (
                      <div className={`mt-1 text-[11px] leading-relaxed ${isStudentPick ? 'text-rose-800' : 'text-gray-600'}`}>
                        <span className="font-semibold">{ko ? '오답 이유: ' : 'Why wrong: '}</span>
                        {normalizeDisplayText(distractorReason)}
                      </div>
                    )}
                  </div>
                )
              })}
              {studentAnswer == null && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-900 text-xs ring-1 ring-amber-200/70">
                  {ko ? '답하지 않음' : 'Not answered'}
                </div>
              )}
            </div>
          )}

          {q.explanation && (
            <div className="rounded-xl bg-gradient-to-br from-primary/[0.05] to-transparent ring-1 ring-primary/15 px-3 py-2.5 mt-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.10em] text-primary mb-1">
                <Sparkles className="w-3 h-3" />
                {ko ? '해설' : 'Why'}
              </div>
              <p className="text-[12.5px] text-gray-700 leading-relaxed">
                {normalizeDisplayText(q.explanation)}
              </p>
            </div>
          )}
          <ReportQuestion
            sessionId={sessionId}
            question={{
              prompt: q.prompt,
              type: q.type ?? 'multiple_choice',
              choices: choices.length > 0 ? choices : undefined,
              correct_answer: row.correctAnswerDisplay,
              explanation: q.explanation ?? '',
            }}
          />
        </div>
      )}
    </div>
  )
}
