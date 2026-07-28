"use client"

import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
} from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { normalizeDisplayText, PassageParagraphs, percentToToeflBand } from './helpers'
import { QuestionGraphicView } from './QuestionGraphicView'
import { WritingFeedbackPanel } from './WritingPanels'
import { ReportQuestion } from '@/app/mobile/study/_shared/ReportQuestion'
import type { SpeechSignals } from './types'
import { tallyRows, type ResultRow, type TestResultModel } from '@/lib/study/test-result'

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

  return (
    <div className="px-5 py-6 space-y-5">
      {header}

      {/* Score */}
      <div className="rounded-2xl ring-1 ring-gray-200/70 bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
          {t('study.test.resultEyebrow')}
        </p>
        <h2 className="text-3xl font-semibold text-gray-900 tabular-nums">
          {model.correctCount} / {model.totalScored}
          <span className="text-base text-gray-500 ml-2">({model.scorePercent}%)</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t(`study.test.resultMessage.${
            model.scorePercent >= 85 ? 'excellent' :
            model.scorePercent >= 65 ? 'solid' :
            model.scorePercent >= 40 ? 'keepGoing' : 'startOver'
          }`)}
        </p>

        {/* Reconcile the denominator with the list below.
          *
          * The headline counts SCORED questions (35); the rows are numbered
          * out of DELIVERED (48). A student answered 48 and was scored on
          * 35 with nothing saying where the other 13 went.
          *
          * The reason has to match the actual session. The first version
          * always said "experimental", and a TOEFL Speaking result read
          * "the other 4 are experimental" when those 4 were rubric-graded
          * responses and the test had no pilots at all — a confident,
          * checkable, wrong explanation. Word it from the tally. */}
        {model.deliveredTotal > model.totalScored && (
          <p className="text-[12px] text-amber-700 mt-2 leading-relaxed">
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
        )}

        {/* TOEFL Jan 2026: the 1-6 band plus the 0-30 section score ETS
            still publishes through the 2-year transition. Practice covers
            ONE section, so this is that section — never the 0-120. */}
        {model.family === 'toefl' && (() => {
          const band = percentToToeflBand(model.scorePercent)
          const score030 = Math.round((model.scorePercent / 100) * 30)
          return (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-left">
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '밴드 점수 (1-6)' : 'Band score (1–6)'}
                </div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{band.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                  {ko ? '섹션 점수 (0-30)' : 'Section (0–30)'}
                </div>
                <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">{score030}</div>
              </div>
              <p className="col-span-2 text-[11px] text-gray-400 mt-1 leading-relaxed">
                {ko
                  ? 'ETS는 1-6 밴드 점수와 0-120 환산 점수를 2년 전환 기간 동안 모두 제공합니다.'
                  : 'ETS issues both the 1–6 band and the 0–120 score during the 2-year transition.'}
              </p>
            </div>
          )
        })()}

        {/* SAT: gated on the model's family, not on the presence of a
            route. Keying off the route alone is what put a College Board
            200-800 score on a TOEFL result. */}
        {model.family === 'sat' && sat && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
              {ko ? '예상 SAT 점수 (200-800)' : 'Est. SAT score (200–800)'}
            </div>
            <div className="text-4xl font-bold text-primary tabular-nums mt-1 leading-none">{sat.score}</div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              {sat.capped
                ? (ko ? '실제 시험처럼 모듈 2 난이도에 따라 상한이 적용된 추정치예요.'
                      : 'An estimate — like the real test, your Module 2 band caps the range.')
                : (ko ? '이 섹션 추정치이며, 모의고사를 더 풀수록 정확해져요.'
                      : 'A section estimate — more full tests sharpen it.')}
            </p>
          </div>
        )}
      </div>

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
    <div className={`rounded-2xl ring-1 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all ${
      missed ? 'ring-rose-200/80' : 'ring-gray-200/70'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors"
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
          <div className="text-sm text-gray-900 line-clamp-2 mt-0.5">{normalizeDisplayText(q.prompt)}</div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
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
            <p className="text-xs text-gray-600 leading-relaxed mt-2">{normalizeDisplayText(q.explanation)}</p>
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
