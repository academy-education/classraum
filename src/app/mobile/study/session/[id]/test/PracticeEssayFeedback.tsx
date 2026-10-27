"use client"

import { normalizeDisplayText } from './helpers'
import type { RubricGrade } from '@/lib/study/test-result'
import {
  practiceCriterionLabel, readPracticeComments, PRACTICE_CRITERIA,
} from '@/lib/study/practiceEssay'
import { scoreFraction, scoreTone, TONE_CLASS } from '@/lib/study/rubricDisplay'

/** The label the owner asked for, verbatim. Exported so the test pins it. */
export const PRACTICE_FEEDBACK_NOTE = {
  ko: '연습용 평가 — 실제 SSAT·ISEE는 작문에 점수를 매기지 않고 원문을 학교에 보냅니다.',
  en: 'Practice feedback — the real SSAT and ISEE do not score the writing; schools read it as written.',
}

type Criterion = { key: string; evidence: string; score: number }

function readCriteria(raw: unknown): Criterion[] {
  if (!Array.isArray(raw)) return []
  const rows = raw.filter((c): c is Criterion =>
    !!c && typeof c === 'object'
    && typeof (c as Criterion).key === 'string'
    && typeof (c as Criterion).score === 'number')
  // Rubric order, not whatever order the model returned them in.
  return [...rows].sort((a, b) =>
    PRACTICE_CRITERIA.indexOf(a.key as never) - PRACTICE_CRITERIA.indexOf(b.key as never))
}

/**
 * Practice feedback for an ISEE Essay / SSAT Writing Sample, on the review
 * screen. READ-ONLY: it renders what the whole-test grade batch stored and
 * never grades anything itself — one writer per item. When there is no
 * grade (the batch failed, or has not run) it says so and offers a retry
 * that re-runs that same batch. A missing grade is never shown as a low one.
 */
export function PracticeEssayFeedback({
  grade, pending, story, ko, onRetry, retrying, retryFailed,
}: {
  grade: RubricGrade | undefined
  /** The batch is still running (post-submit only). */
  pending: boolean
  /** The chosen prompt was a story starter — one criterion reads differently. */
  story: boolean
  ko: boolean
  onRetry: () => void
  retrying: boolean
  retryFailed: boolean
}) {
  const note = (
    <p className="text-[11px] text-gray-500 leading-relaxed" data-testid="practice-feedback-note">
      {ko ? PRACTICE_FEEDBACK_NOTE.ko : PRACTICE_FEEDBACK_NOTE.en}
    </p>
  )

  if (!grade || !grade.practice) {
    if (pending || retrying) {
      return (
        <div className="mt-2 rounded-xl ring-1 ring-primary/20 bg-white px-3 py-3 space-y-1.5">
          <div className="text-[13px] text-primary font-medium animate-pulse">
            {ko ? 'AI 연습 피드백을 준비하고 있어요…' : 'Preparing your AI practice feedback…'}
          </div>
          {note}
        </div>
      )
    }
    return (
      <div className="mt-2 rounded-xl ring-1 ring-amber-200/70 bg-amber-50/60 px-3 py-3 space-y-2" data-testid="practice-feedback-unavailable">
        <div className="text-[13px] text-amber-900">
          {retryFailed
            ? (ko ? '피드백을 아직 받지 못했어요. 잠시 후 다시 시도해 주세요.' : 'Feedback is still unavailable. Please try again in a moment.')
            : (ko ? 'AI 피드백을 불러오지 못했어요. 점수와는 무관하며, 다시 시도할 수 있어요.' : 'AI feedback is unavailable right now. It does not affect your score — you can try again.')}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-[13px] font-semibold text-primary hover:underline"
        >
          {ko ? '피드백 다시 받기' : 'Retry feedback'}
        </button>
        {note}
      </div>
    )
  }

  const scaleMax = grade.scaleMax
  const tone = scoreTone(grade.band, scaleMax)
  const criteria = readCriteria(grade.criteria)
  const comments = readPracticeComments(grade.comments)
  const strengths = comments.filter(c => c.kind === 'strength')
  const improvements = comments.filter(c => c.kind === 'improve')

  return (
    <div className="mt-2 rounded-xl ring-1 ring-primary/20 bg-white overflow-hidden" data-testid="practice-feedback">
      <div className="flex items-center gap-3.5 px-3 py-3 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <div className="flex-shrink-0 w-[54px] h-[54px] rounded-full ring-4 ring-primary/15 flex flex-col items-center justify-center leading-none">
          <span className={`text-[15px] font-bold tabular-nums ${TONE_CLASS[tone].text}`}>{grade.band.toFixed(1)}</span>
          <span className="text-[10px] text-gray-500 tabular-nums mt-0.5">/ {scaleMax}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-primary">
            {ko ? 'AI 연습 밴드' : 'AI practice band'}
          </div>
          {note}
        </div>
      </div>

      <div className="px-3 py-3 space-y-3">
        {grade.summary && (
          <p className="text-[13px] text-gray-700 leading-relaxed">{grade.summary}</p>
        )}

        <div className="space-y-2.5">
          {criteria.map(c => {
            const ct = scoreTone(c.score, scaleMax)
            return (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-gray-800">
                    {practiceCriterionLabel(c.key, { ko, story })}
                  </span>
                  <span className={`text-[11px] font-semibold tabular-nums ${TONE_CLASS[ct].text}`}>
                    {c.score.toFixed(1)}<span className="text-gray-500 font-medium"> / {scaleMax}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${TONE_CLASS[ct].bar}`}
                    style={{ width: `${scoreFraction(c.score, scaleMax) * 100}%` }} />
                </div>
                {c.evidence && <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">{c.evidence}</p>}
              </div>
            )
          })}
        </div>

        {strengths.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 mb-1">
              {ko ? '잘한 점' : 'What works'}
            </div>
            <ul className="space-y-1.5">
              {strengths.map((c, i) => (
                <li key={i} className="rounded-lg bg-emerald-50/60 ring-1 ring-emerald-200/60 px-2.5 py-2 text-[11px] text-gray-700 leading-relaxed">
                  {c.quoteVerified && c.quote && (
                    <q className="block italic text-gray-900 mb-0.5">{normalizeDisplayText(c.quote)}</q>
                  )}
                  {c.kind === 'strength' && c.comment}
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700 mb-1">
              {ko ? '고칠 점' : 'What to improve'}
            </div>
            <ul className="space-y-1.5">
              {improvements.map((c, i) => (
                <li key={i} className="rounded-lg bg-amber-50/60 ring-1 ring-amber-200/60 px-2.5 py-2 text-[11px] text-gray-700 leading-relaxed">
                  {c.quoteVerified && c.quote && (
                    <q className="block italic text-gray-900 mb-0.5">{normalizeDisplayText(c.quote)}</q>
                  )}
                  {c.kind === 'improve' && (
                    <>
                      <span className="block">{c.issue}</span>
                      <span className="block mt-0.5 text-gray-900"><span className="font-semibold">{ko ? '이렇게: ' : 'Try: '}</span>{c.suggestion}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
