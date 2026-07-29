"use client"

import { useEffect, useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, Sparkles, ListChecks,
} from '@/app/mobile/study/_shared/icons'
import { PathMascot, type MascotState } from '@/app/mobile/study/_shared/PathMascot'
import { useTranslation } from '@/hooks/useTranslation'
import { normalizeDisplayText, PassageParagraphs, PromptText } from './helpers'
import { QuestionGraphicView } from './QuestionGraphicView'
import { WritingFeedbackPanel } from './WritingPanels'
import { ReportQuestion } from '@/app/mobile/study/_shared/ReportQuestion'
import type { SpeechSignals } from './types'
import {
  tallyRows, scaleFraction, scoreSplit,
  type ResultRow, type RubricGrade, type TestResultModel,
} from '@/lib/study/test-result'
import { authHeaders } from '@/lib/auth-headers'
import {
  scoreToeflSection, bandFromProportion, detectToeflSection, WEIGHTS_FOR,
} from '@/lib/study/toefl-section-score'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'
import { OPEN_RESPONSE_TYPES } from '@/lib/study/openResponse'
import { buildSectionBreakdown } from '@/lib/study/section-breakdown'
import { SectionBreakdownCard } from '@/app/mobile/study/_shared/SectionBreakdown'

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
  model, sessionId, ko, sat, gradingOpenResponses = false,
  answerAudioPaths = {}, answerSpeechSignals = {}, speakingGradeMode = 'text',
  header, footer,
}: {
  model: TestResultModel
  sessionId: string
  ko: boolean
  /** Estimated 200-800 section band. SAT only; null everywhere else. */
  sat?: { score: number; capped: boolean } | null
  /** True while the whole-test batch is still grading the open
   *  responses. Only the post-submit screen can know this; a reopened
   *  test reads finished grades from the DB. */
  gradingOpenResponses?: boolean
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

  // Unit: DELIVERED QUESTIONS, the same unit as the score. `tally.counted`
  // IS model.totalScored, so the breakdown reconciles with the headline
  // instead of introducing a third number — see tallyRows.
  const tally = tallyRows(model.rows)

  // Rubric grades, keyed by prompt. The batch grader writes these on
  // submit; without reading them back the result screen reported a
  // percentage covering only the key-matched items and said nothing at
  // all about the answers the student actually spoke or wrote.
  const [grades, setGrades] = useState<Record<string, RubricGrade>>({})
  const hasRubricRows = model.rows.some(r => r.ungraded)
  useEffect(() => {
    // Re-runs when `gradingOpenResponses` flips false, which is the
    // moment the batch has finished and there is something to fetch.
    if (!hasRubricRows || gradingOpenResponses) return
    let alive = true
    void (async () => {
      try {
        const res = await fetch(
          `/api/study/response/grades?sessionId=${encodeURIComponent(sessionId)}`,
          { headers: await authHeaders() },
        )
        if (!res.ok) return
        const json = await res.json()
        if (alive && json?.grades) setGrades(json.grades as Record<string, RubricGrade>)
      } catch (e) {
        // Non-fatal: the split degrades to "not scored yet" rather than
        // blocking the whole result screen on a feedback lookup.
        console.warn('[TestResultView] grade lookup failed', e)
      }
    })()
    return () => { alive = false }
  }, [sessionId, hasRubricRows, gradingOpenResponses])

  const split = scoreSplit(model.rows, grades)

  // TOEFL Speaking and Writing are scored on the points model rather than
  // percent-correct: a near-miss repeat earns partial credit, and the
  // spoken and written answers count at all. Reading and Listening keep
  // the percent-correct path, which already matches ETS.
  const items = model.rows.map(r => ({
    type: r.question.type ?? '',
    // Carried for the per-section breakdown, which groups on the
    // bracketed prefix the generator writes into the prompt.
    prompt: r.question.prompt ?? null,
    expectedText: r.question.correct_answer ?? null,
    studentAnswer: r.studentAnswer,
    correct: r.correct,
    rubricBand: grades[r.question.prompt ?? '']?.band ?? null,
  }))
  const toeflSection = model.family === 'toefl' ? detectToeflSection(items) : null
  /* Per-section performance, from the SAME per-item scorer as the total
     above. Self-hides below 2 groups, which is every SAT test — those
     prompts carry no section label at all.
     
     PILOTS EXCLUDED. They are delivered but unscored, and including them
     made the rows sum to 17 points on a Listening test whose hero read
     "14 / 35" — the breakdown was quietly scoring the 13 experimental
     questions the screen directly below it says do not count. Same
     population as the score, or the parts do not belong to the whole. */
  const breakdown = buildSectionBreakdown(
    model.rows.filter(r => !r.isPilot).map(r => ({
      type: r.question.type ?? '',
      prompt: r.question.prompt ?? null,
      expectedText: r.question.correct_answer ?? null,
      studentAnswer: r.studentAnswer,
      correct: r.correct,
      rubricBand: grades[r.question.prompt ?? '']?.band ?? null,
    })),
    scoreListenRepeat, { ko },
  )
  const pointsScore = toeflSection
    ? scoreToeflSection(items, WEIGHTS_FOR[toeflSection], scoreListenRepeat)
    : null

  /* Points shown on the score row, for ANY TOEFL section.
   *
   * Reading and Listening are one point per question with a raw range of
   * 0-35 (RR-25-12, Table 8), so their points are simply the questions
   * they got right. They were still showing a "scaled score / 30" — a
   * scale that does not exist in the 2026 format and that we computed as
   * percent x 30. Speaking and Writing moved to real points and left
   * these two behind, which is how one screen ended up quoting two
   * different invented scales. */
  const displayPoints = pointsScore
    ? { earned: pointsScore.earned, max: pointsScore.max }
    : model.family === 'toefl'
      ? { earned: model.correctCount, max: model.totalScored }
      : null

  // Hero colour and Raumi's mood both follow accuracy. A hard session must
  // never read as a celebration — the summary screen established this rule
  // and it moves here with the hero.
  /* The single percentage this screen reports. When a section is scored
     on points, the hero, the mascot, the headline copy and the band must
     all come from THAT number — showing 43% beside a band derived from
     54% is the same contradiction the band/scaled rows had this morning,
     and it reappears the moment two sources exist again. */
  const shownPercent = pointsScore
    ? Math.round(pointsScore.proportion * 100)
    : model.scorePercent

  const hero = shownPercent >= 80
    ? { gradient: 'from-emerald-500 via-emerald-600 to-teal-700' }
    : shownPercent >= 60
      ? { gradient: 'from-amber-500 via-orange-500 to-orange-700' }
      : { gradient: 'from-rose-500 via-rose-600 to-red-700' }
  const mascotState: MascotState =
    shownPercent >= 80 ? 'celebrate' : shownPercent >= 60 ? 'idle' : 'sad'

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
            <CountUp value={shownPercent} /><span className="text-[24px] opacity-80">%</span>
          </h2>
          <p className="text-[14px] mt-1.5 opacity-90 tabular-nums">
            {pointsScore
              ? (ko ? `${pointsScore.earned} / ${pointsScore.max}점`
                    : `${pointsScore.earned} of ${pointsScore.max} points`)
              : `${model.correctCount} / ${model.totalScored} ${ko ? '정답' : 'correct'}`}
          </p>
          <p className="text-[12.5px] mt-1 opacity-75 leading-snug max-w-[85%]">
            {t(`study.test.resultMessage.${
              shownPercent >= 85 ? 'excellent' :
              shownPercent >= 65 ? 'solid' :
              shownPercent >= 40 ? 'keepGoing' : 'startOver'
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
                /* One band function for all four sections. The two used
                   to differ only in how the proportion was reached, and
                   keeping two spellings of the same arithmetic is how the
                   band and the scaled score drifted apart this morning. */
                value={bandFromProportion(
                  pointsScore ? pointsScore.proportion : model.scorePercent / 100).toFixed(1)}
                min={1} max={6}
                fraction={scaleFraction(bandFromProportion(
                  pointsScore ? pointsScore.proportion : model.scorePercent / 100), 1, 6)}
                note={ko ? '이 섹션의 밴드 점수예요. 네 개 섹션의 평균이 총점이 됩니다.'
                         : 'This section only. Your overall score averages all four.'}
              />
              <ScaleRow
                label={ko ? '획득 점수' : 'Points earned'}
                value={String(displayPoints?.earned ?? 0)}
                min={0} max={displayPoints?.max ?? 0}
                fraction={scaleFraction(
                  displayPoints?.earned ?? 0, 0, Math.max(1, displayPoints?.max ?? 1))}
                /* Says the relationship out loud. The band above IS this
                   number divided by 5 — previously the two were computed
                   from unrelated formulas and could disagree on screen.
                   The floor has to be stated too: a scaled 3 is a band 1,
                   not 0.6, because the published scale starts at 1. Saying
                   only "divided by 5" is false at the bottom, which is the
                   same class of error this row was added to remove. */
                note={pointsScore
                  ? (ko ? '각 파트의 배점이 다릅니다. 아래에서 확인하세요.'
                        : 'Parts are weighted differently — see the breakdown below.')
                  : (ko ? '문항당 1점입니다. 위의 밴드 점수는 이 비율에서 나옵니다.'
                        : 'One point per question. Your band above comes from this share.')}
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

          {/* Counts.
              A section scored on POINTS gets its parts, not correct/missed:
              a repeat scored 4 out of 5 is neither correct nor missed, and
              forcing it into one of those buckets is exactly what the old
              model did when it threw the partial credit away. Patching the
              two tiles individually produced "26 correct of 35" beside
              "4 missed of 7" — the same two-sources-of-truth bug, one
              layer down. So the whole group is chosen once, by model. */}
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-2">
            {pointsScore ? (
              pointsScore.parts.filter(p => p.max > 0).map(p => (
                <HeroStat
                  key={p.key}
                  icon={CheckCircle2}
                  value={String(p.earned)}
                  label={PART_LABEL[p.key]?.[ko ? 'ko' : 'en'] ?? p.key}
                  sub={ko ? `${p.max}점 중 · 비중 ${Math.round(p.effectiveWeight * 100)}%`
                          : `of ${p.max} · ${Math.round(p.effectiveWeight * 100)}% of score`}
                />
              ))
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Which parts of the test went well. Directly under the hero,
          because "83%" is the headline and "where did the 17% go" is the
          immediate next question. Self-hides when the test has fewer than
          two labelled sections. */}
      <SectionBreakdownCard breakdown={breakdown} ko={ko} />

      {/* How the answers were counted.
        *
        * This was headed "Where your 30 cards went", which is our word,
        * not the student's — "card" is the internal name for one
        * study_attempts row and appears nowhere a student can learn it.
        * The four chips also stood bare, so a reader had to infer that
        * "Pilot 13" meant thirteen questions they answered for nothing.
        *
        * Same numbers, said in the student's language, with the reason
        * each bucket exists stated on its own row. Header matches the
        * StudyTodayCard shape used across study mode. */}
      {!pointsScore && (
      <div className="rounded-2xl ring-1 ring-gray-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <div className="flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] bg-gradient-to-br from-slate-500 to-slate-700 text-white">
            <ListChecks className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 leading-none mb-1">
              {ko ? '채점 방식' : 'How it was counted'}
            </div>
            <div className="text-[14px] font-semibold text-gray-900 leading-tight">
              {/* The reconciliation lives HERE now. It used to be a separate
                  amber card directly above this one, saying "Scored on 35 of
                  the 48 questions you answered — the other 13 are
                  experimental" — which is precisely what the rows below
                  already say. Two adjacent explanations of one thing read as
                  clutter no amount of styling fixes; the fix was to delete
                  one. Questions only, the same unit as the score. */}
              {model.deliveredTotal > model.totalScored
                ? (ko ? `${model.deliveredTotal}문항 중 ${model.totalScored}문항 반영`
                      : `${model.totalScored} of ${model.deliveredTotal} questions counted`)
                : (ko ? `${model.deliveredTotal}문항 전부 반영`
                      : `All ${model.deliveredTotal} questions counted`)}
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5 leading-snug">
              {ko ? '실제 시험처럼, 푼 문항이 모두 점수에 반영되지는 않아요.'
                  : 'Not everything you answer counts — the real exam works the same way.'}
            </div>
          </div>
        </div>

        {/* A stacked bar makes the split visible before any number is
            read, and shows at a glance that the four parts make a whole. */}
        <div className="px-4 pt-3.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
            {tally.counted > 0 && <div className="bg-emerald-500" style={{ flexGrow: tally.counted }} />}
            {tally.pilot > 0 && <div className="bg-orange-400" style={{ flexGrow: tally.pilot }} />}
            {tally.rubric > 0 && <div className="bg-primary" style={{ flexGrow: tally.rubric }} />}
          </div>
        </div>

        <div className="px-4 py-2 divide-y divide-gray-100">
          <TallyRow dot="bg-emerald-500" count={tally.counted}
            label={ko ? '점수에 반영됨' : 'Counted toward your score'}
            note={ko
              ? `위 점수의 분모예요 — ${model.correctCount} / ${tally.counted}.`
              : `The ${tally.counted} in your score above — ${model.correctCount} of them correct.`}
            // Skipped questions ARE in the denominator (they score as
            // wrong), so they belong inside this row, not beside it.
            sub={tally.skippedWithinCounted > 0
              ? (ko ? `${tally.skippedWithinCounted}문항은 무응답으로, 오답과 동일하게 처리됐어요.`
                    : `${tally.skippedWithinCounted} left blank, counted as wrong.`)
              : undefined} />
          <TallyRow dot="bg-orange-400" count={tally.pilot}
            label={ko ? '실험 문항' : 'Experimental'}
            note={ko ? '실제 시험에도 있는 미채점 문항이에요. 풀었지만 점수에는 반영되지 않아요.'
                     : 'Trial questions the real exam also includes. You answered them; they do not count.'} />
          <TallyRow dot="bg-primary" count={tally.rubric}
            label={ko ? '루브릭 채점' : 'Graded by rubric'}
            note={ko ? '말하기·쓰기 답변이라 정답 키가 아닌 채점 기준으로 따로 평가돼요.'
                     : 'Speaking and writing answers, scored against criteria instead of an answer key.'}
            // Grading starts automatically on submit and takes a few
            // seconds per answer. Saying so beats an empty feedback
            // panel that looks broken.
            sub={gradingOpenResponses && tally.rubric > 0
              ? (ko ? '지금 채점 중이에요 — 잠시 후 피드백이 표시됩니다.'
                    : 'Scoring these now — feedback appears in a moment.')
              : undefined}
            subTone="info" />
        </div>
      </div>
      )}

      {/* Two scales, side by side. The headline percentage counts only
          key-matched items — weightedScore returns total:0 for open
          responses — so a Speaking result that reads "71%" is describing
          the Listen-and-Repeat items and silently omitting the answers
          the student actually spoke. Averaging the two into one number
          would be worse, not better: they are different scales measuring
          different things. Show both, and say which one the big number
          on this screen refers to. */}
      {split.hasRubric && !pointsScore && (
        <div className="mx-4 mt-3 rounded-2xl bg-white ring-1 ring-gray-200/70 p-4">
          <div className="text-[13px] font-bold text-gray-900">
            {ko ? '점수는 이렇게 구성돼요' : 'How your score was built'}
          </div>
          <div className="text-[11.5px] text-gray-500 leading-snug mt-0.5">
            {ko
              ? '이 시험은 두 가지 방식으로 채점됩니다. 위쪽 큰 점수는 정답 키로 채점한 문항만 반영해요.'
              : 'This section is scored two different ways. The big number above covers only the first of them.'}
          </div>

          <div className="mt-3 space-y-3">
            <ScoreBar
              label={ko ? '정답 키 채점' : 'Marked against an answer key'}
              detail={ko
                ? `${split.objective.total}문항 중 ${split.objective.correct}문항 정답`
                : `${split.objective.correct} of ${split.objective.total} questions correct`}
              percent={split.objective.percent}
              tone="emerald"
              headline
              ko={ko}
            />
            <ScoreBar
              label={ko ? 'AI 루브릭 채점' : 'Scored by AI against a rubric'}
              detail={split.rubric.graded === 0
                ? (ko ? '아직 채점되지 않았어요' : 'Not scored yet')
                : (ko
                    ? `${split.rubric.graded}개 답변 · ${split.rubric.max}점 만점에 ${split.rubric.earned}점`
                    : `${split.rubric.graded} response${split.rubric.graded === 1 ? '' : 's'} · ${split.rubric.earned} of ${split.rubric.max} marks`)}
              percent={split.rubric.percent}
              tone="primary"
              ko={ko}
              pending={split.rubric.pending}
              skipped={split.rubric.skipped}
            />
          </div>
        </div>
      )}

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

/**
 * One bucket. Rendered even at zero — dimmed, not hidden: the four are a
 * partition, and dropping the empty ones would leave a list that no
 * longer visibly adds up to the item count in the header.
 */
/** One scoring method, with its own scale. Deliberately NOT combined
 *  with the other — see the block that renders these. */
function ScoreBar({ label, detail, percent, tone, ko, headline = false, pending = 0, skipped = 0 }: {
  label: string
  detail: string
  percent: number
  tone: 'emerald' | 'primary'
  ko: boolean
  /** Marks this as the scale the headline percentage refers to. */
  headline?: boolean
  /** Responses still awaiting a grade. Counted as outstanding rather
   *  than as zeros, so the bar is honest about being incomplete. */
  pending?: number
  /** Responses left blank. No grade is coming for these. */
  skipped?: number
}) {
  const bar = tone === 'emerald' ? 'bg-emerald-500' : 'bg-primary'
  const text = tone === 'emerald' ? 'text-emerald-700' : 'text-primary'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-gray-900">
          {label}
          {headline && (
            <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {ko ? '위 점수' : 'the big number'}
            </span>
          )}
        </span>
        <span className={`text-[14px] font-bold tabular-nums ${text}`}>{percent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1 text-[11.5px] text-gray-500">
        {detail}
        {pending > 0 && (
          <span className="text-amber-700 font-semibold">
            {ko ? ` · ${pending}개 채점 대기 중` : ` · ${pending} still being scored`}
          </span>
        )}
        {skipped > 0 && (
          <span className="text-gray-400 font-semibold">
            {ko ? ` · ${skipped}개 미답변` : ` · ${skipped} left blank`}
          </span>
        )}
      </div>
    </div>
  )
}

/** Student-facing names for the score parts. */
const PART_LABEL: Record<string, { en: string; ko: string }> = {
  listen_repeat: { en: 'Repeating', ko: '따라 말하기' },
  take_interview: { en: 'Interview', ko: '인터뷰' },
  build_a_sentence: { en: 'Sentences', ko: '문장 만들기' },
  write_email: { en: 'Email', ko: '이메일' },
  academic_discussion: { en: 'Discussion', ko: '학술 토론' },
}

function TallyRow({ dot, count, label, note, sub, subTone = 'warn' }: {
  dot: string; count: number; label: string; note: string
  /** Extra detail that lives INSIDE this bucket, not beside it. */
  sub?: string
  /** 'warn' flags something the student should notice (skipped items);
   *  'info' reports work in progress and must not read as a problem. */
  subTone?: 'warn' | 'info'
}) {
  const empty = count === 0
  return (
    <div className={`flex items-start gap-3 py-2.5 ${empty ? 'opacity-40' : ''}`}>
      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${empty ? 'bg-gray-300' : dot}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-gray-900 leading-tight">{label}</div>
        <div className="text-[11.5px] text-gray-500 leading-snug mt-0.5">{note}</div>
        {sub && (
          <div className={`text-[11.5px] leading-snug mt-1 flex items-center gap-1.5 ${
            subTone === 'info' ? 'text-primary' : 'text-amber-700'}`}>
            {subTone === 'info' && (
              <span className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin flex-shrink-0" />
            )}
            {sub}
          </div>
        )}
      </div>
      <span className="text-[15px] font-bold text-gray-900 tabular-nums flex-shrink-0 tracking-tight">
        {count}
      </span>
    </div>
  )
}

/** One answer on a collapsed review row — the student's, or the key.
 *  Full width and single-line so a long option truncates at the end
 *  instead of mid-word, which is what two side-by-side chips did at
 *  375px, with the arrow between them orphaned onto its own line. */
function AnswerLine({ tone, text }: {
  tone: 'rose' | 'emerald' | 'amber'; text: string
}) {
  const spec = {
    rose: { wrap: 'bg-rose-50 text-rose-700 ring-rose-200/70', Icon: XCircle },
    emerald: { wrap: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70', Icon: CheckCircle2 },
    amber: { wrap: 'bg-amber-50 text-amber-700 ring-amber-200/70', Icon: AlertTriangle },
  }[tone]
  const Icon = spec.Icon
  return (
    <div className={`flex items-center gap-1.5 rounded-lg ring-1 px-2 py-1 ${spec.wrap}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span className="text-[11.5px] font-medium truncate">{text}</span>
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
  // Graded against rubric criteria, not an answer key. Read from the
  // same map the grader routes on, so a new open-response type cannot
  // be gradeable here and key-matched there.
  const isRubricItem = OPEN_RESPONSE_TYPES.has(q.type ?? '')

  return (
    <div className={`rounded-2xl ring-1 bg-white overflow-hidden transition-all ${
      isOpen ? 'shadow-[0_2px_12px_-2px_rgba(0,0,0,0.10)] ring-gray-200' : 'shadow-[0_1px_2px_rgba(0,0,0,0.03)] ring-gray-200 hover:ring-primary/40 active:scale-[0.995]'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-gray-50/70 transition-colors"
      >
        {/* Same 11x11 gradient tile as StudyTodayCard. The thin outlined
            ring this replaced read as a different species of card next to
            every other list in study mode, and the left accent stripe went
            with it — nothing else in the language has one, and with a
            coloured tile it was saying the verdict twice. */}
        <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${
          row.ungraded ? 'bg-gradient-to-br from-primary to-indigo-600 text-white shadow-[0_4px_10px_-2px_rgba(40,133,232,0.35)]'
            : row.correct ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.35)]'
            : studentAnswer == null ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(251,146,60,0.35)]'
            : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_4px_10px_-2px_rgba(244,63,94,0.35)]'
        }`}>
          {row.ungraded ? <Sparkles className="w-5 h-5" strokeWidth={2.25} />
            : row.correct ? <CheckCircle2 className="w-5 h-5" strokeWidth={2.25} />
            : studentAnswer == null ? <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />
            : <XCircle className="w-5 h-5" strokeWidth={2.25} />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Eyebrow row. The badge was inline after a "·" and wrapped to a
              second line with the separator dangling at the end of the
              first; it is a pill on the same row now, and wraps as a unit. */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {row.range && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 leading-none">
                {t('study.test.questionN', {
                  current: row.range.startAt === row.range.endAt
                    ? String(row.range.startAt)
                    : `${row.range.startAt}–${row.range.endAt}`,
                  total: String(deliveredTotal),
                })}
              </span>
            )}
            {row.ungraded ? (
              <span className="inline-flex items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] leading-none">
                {ko ? '루브릭' : 'Rubric'}
              </span>
            ) : row.isPilot ? (
              <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] leading-none">
                {ko ? '실험' : 'Experimental'}
              </span>
            ) : null}
          </div>

          <div className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2">
            <PromptText text={q.prompt} />
          </div>

          {/* Answers as STACKED full-width rows. They were two inline chips
              with an arrow between them, which at 375px truncated both
              mid-word and pushed the arrow onto a line of its own. One row
              each, one line each, truncating at the end where it reads as
              intended rather than mid-sentence. */}
          {!isOpen && !row.ungraded && !FREE_TEXT_TYPES.has(q.type ?? '') && (
            <div className="mt-2 space-y-1">
              {studentAnswer == null ? (
                <AnswerLine tone="amber" text={ko ? '답하지 않음' : 'Left blank'} />
              ) : !row.correct ? (
                <AnswerLine tone="rose" text={normalizeDisplayText(studentAnswer)} />
              ) : null}
              {!row.correct && row.correctAnswerDisplay && (
                <AnswerLine tone="emerald" text={normalizeDisplayText(row.correctAnswerDisplay)} />
              )}
            </div>
          )}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
          {q.passage && (
            <div className="rounded-xl ring-1 ring-gray-200/70 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
              <PassageParagraphs text={q.passage} />
            </div>
          )}
          <p className="text-gray-900 whitespace-pre-wrap"><PromptText text={q.prompt} /></p>
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
              {/* A rubric item has NO answer key, so there is nothing to
                  put here. This used to render a green "Correct answer"
                  box containing an em dash above the student's essay in
                  failure red — an answer the grader had just given 5 out
                  of 5 read as wrong with the solution withheld. */}
              {!isRubricItem && (
                <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs ring-1 ring-emerald-200/70">
                  <div className="font-semibold mb-0.5">{ko ? '정답' : 'Correct answer'}</div>
                  <div className="whitespace-pre-wrap">{normalizeDisplayText(row.correctAnswerDisplay)}</div>
                </div>
              )}
              {studentAnswer != null ? (
                <div className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                  // Neutral for rubric items whatever the band: red here
                  // would contradict the score sitting directly below it.
                  isRubricItem || row.correct
                    ? 'bg-gray-50 text-gray-700 ring-gray-200/70'
                    : 'bg-rose-50 text-rose-900 ring-rose-200/70'
                }`}>
                  <div className="font-semibold mb-0.5">
                    {isRubricItem ? (ko ? '내 답변' : 'Your response') : (ko ? '내 답' : 'Your answer')}
                  </div>
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
