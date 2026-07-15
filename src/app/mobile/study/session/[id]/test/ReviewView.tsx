"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
} from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { normalizeDisplayText, PassageParagraphs, percentToToeflBand } from './helpers'
import { QuestionGraphicView } from './QuestionGraphicView'
import { WritingFeedbackPanel } from './WritingPanels'
import type { SpeechSignals, SubmitResult, TestPayload } from './types'

/**
 * Post-submit review. Shows the score + a per-question accordion so
 * the student can revisit what they missed without re-running the
 * whole test.
 */
export function ReviewView({
  test, answers, answerAudioPaths, answerSpeechSignals, speakingGradeMode, result, ko, sessionId,
}: {
  test: TestPayload
  answers: (string | null)[]
  /** Per-question audio storage paths captured during Speaking.
   *  Used to offer playback next to the rubric grade. */
  answerAudioPaths: Record<number, string>
  /** Per-question WPM / pause / clarity metrics from Whisper. */
  answerSpeechSignals: Record<number, SpeechSignals>
  /** Grade mode picked at test start. Routes rubric calls. */
  speakingGradeMode: 'text' | 'audio'
  result: SubmitResult
  ko: boolean
  sessionId: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<number | null>(null)

  // Weighted question numbering — mirrors the taking view: a CtW item
  // with 10 blanks occupies positions N..N+9 of the weighted total, so
  // review labels match the "Question 12–21 of 50" numbering the
  // student saw during the test.
  const reviewRanges: { startAt: number; endAt: number }[] = []
  {
    let acc = 0
    for (const q of test.questions) {
      const w = q.type === 'fill_in_blanks' ? Math.max(1, q.blanks?.length ?? 1) : 1
      reviewRanges.push({ startAt: acc + 1, endAt: acc + w })
      acc += w
    }
  }
  const reviewTotal = reviewRanges.length > 0 ? reviewRanges[reviewRanges.length - 1]!.endAt : 0

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-5 py-6 space-y-5">
        {/* Summary CTA — links to the dedicated summary page with
            mistake review, streak update, and "try again" surface. */}
        <Link
          href={`/mobile/study/session/${sessionId}/summary`}
          className="block rounded-2xl bg-gradient-to-br from-primary/[0.08] via-indigo-50/40 to-white ring-1 ring-primary/25 p-4 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.18)] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold text-gray-900 leading-tight">
                {String(t('study.test.viewSummaryTitle'))}
              </div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                {String(t('study.test.viewSummarySubtitle'))}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </Link>

        {/* Score summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
            {t('study.test.resultEyebrow')}
          </p>
          <h2 className="text-3xl font-semibold text-gray-900 tabular-nums">
            {result.correctCount} / {result.totalQuestions}
            <span className="text-base text-gray-500 ml-2">({result.scorePercent}%)</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`study.test.resultMessage.${
              result.scorePercent >= 85 ? 'excellent' :
              result.scorePercent >= 65 ? 'solid' :
              result.scorePercent >= 40 ? 'keepGoing' : 'startOver'
            }`)}
          </p>
          {/* TOEFL Jan 2026: surface the new 1-6 band score (avg of 4
              sections, 0.5 increments) AND the transitional 0-30 per-
              section score that ETS still publishes during the 2-year
              transition. Practice covers ONE section, so we show
              that section's band + 0-30, not the overall 0-120. */}
          {test.family === 'toefl' && (() => {
            const band = percentToToeflBand(result.scorePercent)
            const score030 = Math.round((result.scorePercent / 100) * 30)
            return (
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-left">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                    {ko ? '밴드 점수 (1-6)' : 'Band score (1–6)'}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                    {band.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                    {ko ? '섹션 점수 (0-30)' : 'Section (0–30)'}
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums mt-0.5">
                    {score030}
                  </div>
                </div>
                <p className="col-span-2 text-[11px] text-gray-400 mt-1 leading-relaxed">
                  {ko
                    ? 'ETS는 1-6 밴드 점수와 0-120 환산 점수를 2년 전환 기간 동안 모두 제공합니다.'
                    : 'ETS issues both the 1–6 band and the 0–120 score during the 2-year transition.'}
                </p>
              </div>
            )
          })()}
          {/* SAT: the number the student actually cares about — the
              estimated 200–800 section score — shouldn't be buried a
              navigation away on the summary. `result.sat` is already
              returned by submit. */}
          {result.sat && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                {ko ? '예상 SAT 점수 (200-800)' : 'Est. SAT score (200–800)'}
              </div>
              <div className="text-4xl font-bold text-primary tabular-nums mt-1 leading-none">
                {result.sat.score}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                {result.sat.capped
                  ? (ko
                      ? '실제 시험처럼 모듈 2 난이도에 따라 상한이 적용된 추정치예요.'
                      : 'An estimate — like the real test, your Module 2 band caps the range.')
                  : (ko
                      ? '이 섹션 추정치이며, 모의고사를 더 풀수록 정확해져요.'
                      : 'A section estimate — more full tests sharpen it.')}
              </p>
            </div>
          )}
        </div>

        {/* Per-question review accordion */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 px-1">
            {t('study.test.reviewTitle')}
          </h3>
          <div className="space-y-2">
            {test.questions.map((q, i) => {
              const verdict = result.verdicts[i]
              const studentAnswer = answers[i]
              const isOpen = expanded === i
              return (
                <div
                  key={i}
                  className={`rounded-xl border bg-white overflow-hidden ${
                    verdict.ungraded || verdict.correct ? 'border-gray-200' : 'border-rose-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(prev => prev === i ? null : i)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {verdict.ungraded
                      // Open-response: no ✓/✗ — scored by the rubric
                      // panel inside, not the answer key, and excluded
                      // from the auto-score.
                      ? <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      : verdict.correct
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        : studentAnswer == null
                          ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const r = reviewRanges[i]
                          const cur = r
                            ? (r.startAt === r.endAt ? String(r.startAt) : `${r.startAt}–${r.endAt}`)
                            : String(i + 1)
                          return t('study.test.questionN', { current: cur, total: String(reviewTotal) })
                        })()}
                        {verdict.ungraded && (
                          <span className="ml-1.5 text-primary font-medium">
                            · {ko ? '루브릭 채점 (점수 미포함)' : 'rubric-graded (not in score)'}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-900 line-clamp-2 mt-0.5">
                        {normalizeDisplayText(q.prompt)}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
                      {q.passage && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
                          <PassageParagraphs text={q.passage} />
                        </div>
                      )}
                      <p className="text-gray-900 whitespace-pre-wrap">{normalizeDisplayText(q.prompt)}</p>
                      {q.graphic && <QuestionGraphicView graphic={q.graphic} />}
                      {/* Type-aware verdict rendering. MC/three_choice/quant
                          render per-choice rows; the four Jan-2026 TOEFL
                          item types each have their own answer/correct
                          comparison shape. */}
                      {q.type === 'fill_in_blanks' && (q.blanks?.length ?? 0) > 0 ? (
                        // Complete-the-Words: per-blank rows with the
                        // student's letters vs the expected word — the
                        // stored answer is a JSON map of blankId→text,
                        // which would otherwise render as a raw blob.
                        <div className="space-y-1.5 mt-2">
                          {(() => {
                            let parsed: Record<string, string> = {}
                            try {
                              if (studentAnswer) parsed = JSON.parse(studentAnswer) as Record<string, string>
                            } catch { /* unanswered or legacy format */ }
                            const baseNum = reviewRanges[i]?.startAt ?? 1
                            return q.blanks!.map((b, bi) => {
                              const student = (parsed[String(b.id)] ?? '').trim()
                              const accepted = [b.answer, ...(b.alternates ?? [])]
                              const ok = !!student && accepted.some(a => a.trim().toLowerCase() === student.toLowerCase())
                              return (
                                <div key={b.id} className={`px-3 py-2 rounded-lg text-xs border flex items-center gap-2 ${
                                  ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                     : 'bg-rose-50 border-rose-200 text-rose-900'
                                }`}>
                                  <span className="font-semibold tabular-nums flex-shrink-0">{baseNum + bi}.</span>
                                  <span className="flex-1 min-w-0">
                                    {student || (ko ? '무응답' : 'not answered')}
                                    {!ok && (
                                      <span className="ml-2 font-semibold text-emerald-700">→ {b.answer}</span>
                                    )}
                                  </span>
                                  {ok
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                    : <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      ) : (q.type === 'fill_in_blanks' || q.type === 'arrange_words'
                        || q.type === 'speaking_repeat' || q.type === 'speaking_interview'
                        || q.type === 'writing_email' || q.type === 'writing_discussion') ? (
                        <div className="space-y-2 mt-2">
                          <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-900 text-xs border border-emerald-200">
                            <div className="font-semibold mb-0.5">{ko ? '정답' : 'Correct answer'}</div>
                            <div className="whitespace-pre-wrap">{normalizeDisplayText(verdict.correctAnswer)}</div>
                          </div>
                          {studentAnswer != null ? (
                            <div className={`px-3 py-2 rounded-lg text-xs border ${
                              verdict.correct
                                ? 'bg-gray-50 text-gray-700 border-gray-200'
                                : 'bg-rose-50 text-rose-900 border-rose-200'
                            }`}>
                              <div className="font-semibold mb-0.5">{ko ? '내 답' : 'Your answer'}</div>
                              <div className="whitespace-pre-wrap">{normalizeDisplayText(studentAnswer)}</div>
                            </div>
                          ) : (
                            <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                              {ko ? '답하지 않음' : 'Not answered'}
                            </div>
                          )}
                          {(q.type === 'writing_email' || q.type === 'writing_discussion') && studentAnswer != null && (
                            <WritingFeedbackPanel
                              sessionId={sessionId}
                              prompt={q.prompt}
                              response={studentAnswer}
                              skill="writing"
                              taskType={q.type === 'writing_email' ? 'email' : 'academic_discussion'}
                              ko={ko}
                            />
                          )}
                          {q.type === 'speaking_interview' && studentAnswer != null && (
                            // Rubric grading for Take-an-Interview. The response
                            // is either the voice transcript (Whisper) or typed
                            // text — either way we grade what got captured.
                            // audioPath is available when the student recorded
                            // instead of typing; the panel shows a playback UI.
                            // speechSignals feed the grader real delivery
                            // metrics (WPM / pauses / clarity) so the delivery
                            // criterion reflects the actual audio.
                            <WritingFeedbackPanel
                              sessionId={sessionId}
                              prompt={q.prompt}
                              response={studentAnswer}
                              skill="speaking"
                              audioPath={answerAudioPaths[i]}
                              speechSignals={answerSpeechSignals[i]}
                              speakingGradeMode={speakingGradeMode}
                              ko={ko}
                            />
                          )}
                        </div>
                      ) : (
                      <div className="space-y-1.5 mt-2">
                        {q.choices.map(choice => {
                          const isCorrect = choice === q.correct_answer
                          const isStudentPick = choice === studentAnswer
                          // Lookup the per-distractor rationale by
                          // choice text. Only shown on WRONG choices
                          // (correct choice's rationale lives in the
                          // single `explanation` field below).
                          const distractorReason = !isCorrect
                            ? q.distractor_rationales?.find(d => d.choice === choice)?.reason
                            : undefined
                          return (
                            <div
                              key={choice}
                              className={`px-3 py-2 rounded-lg text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                  : isStudentPick
                                    ? 'bg-rose-50 text-rose-900 border border-rose-200'
                                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                              }`}
                            >
                              <div>
                                {normalizeDisplayText(choice)}
                                {isCorrect && <span className="ml-2 font-semibold">{ko ? '정답' : 'Correct'}</span>}
                                {isStudentPick && !isCorrect && <span className="ml-2 font-semibold">{ko ? '내 답' : 'Your answer'}</span>}
                              </div>
                              {distractorReason && (
                                <div className={`mt-1 text-[11px] leading-relaxed ${
                                  isStudentPick ? 'text-rose-800' : 'text-gray-600'
                                }`}>
                                  <span className="font-semibold">{ko ? '오답 이유: ' : 'Why wrong: '}</span>
                                  {normalizeDisplayText(distractorReason)}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {studentAnswer == null && (
                          <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                            {ko ? '답하지 않음' : 'Not answered'}
                          </div>
                        )}
                      </div>
                      )}
                      <p className="text-xs text-gray-600 leading-relaxed mt-2">
                        {normalizeDisplayText(q.explanation)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <Link
          href="/mobile/study"
          className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
        >
          {t('study.test.backToStudy')}
        </Link>
      </div>
    </div>
  )
}
