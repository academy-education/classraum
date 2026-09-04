"use client"

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { buildResultModel, familyFromTopicSlug } from '@/lib/study/test-result'
import { ACT_BLUEPRINT } from '@/lib/study/act-test'
import { TestResultView } from './TestResultView'
import type { SpeechSignals, SubmitResult, TestPayload } from './types'

/**
 * Post-submit review — now a thin adapter.
 *
 * It maps what the taking flow has in memory (the payload, the answers
 * array, the submit response) onto the shared result model, and hands it
 * to TestResultView. The durable /summary screen maps the DB rows onto the
 * same model, which is the point: the two screens can no longer disagree
 * about a number, because there is only one place left to compute it.
 */
export function ReviewView({
  test, answers, answerAudioPaths, answerSpeechSignals, speakingGradeMode, result, ko, sessionId,
  moduleRoute = null, gradingOpenResponses = false,
}: {
  test: TestPayload
  answers: (string | null)[]
  /** Per-question audio storage paths captured during Speaking. */
  answerAudioPaths: Record<number, string>
  /** Per-question WPM / pause / clarity metrics from Whisper. */
  answerSpeechSignals: Record<number, SpeechSignals>
  /** Grade mode picked at test start. Routes rubric calls. */
  speakingGradeMode: 'text' | 'audio'
  result: SubmitResult
  ko: boolean
  sessionId: string
  /** What the routing endpoint graded Module 1 as, on an adaptive test.
   *  `correct` is a CARD count — it is only ever used as a cross-check
   *  against the same card count recomputed from the rows, never shown. */
  moduleRoute?: { correct: number | null; total: number } | null
  /** Batch grading still running — see TestSession's submit handler. */
  gradingOpenResponses?: boolean
}) {
  const { t } = useTranslation()

  const model = buildResultModel({
    // `family` is payload-only and free-form (`string | null`), so it is
    // normalized through the same rule /summary uses on the topic slug
    // rather than trusted as-is. Both screens therefore answer "is this
    // SAT?" identically — reading it raw on one screen only is what put a
    // College Board 200-800 score on a TOEFL result.
    family: familyFromTopicSlug(test.family),
    // ACT only. The payload carries the block NAME ("English") that the
    // assembler set as `section`; the result model wants the KEY. Gated on
    // family because TOEFL also serves a section literally named
    // "Reading" and must not pick up an ACT block by coincidence.
    actSectionKey: familyFromTopicSlug(test.family) === 'act'
      ? (ACT_BLUEPRINT.find(b => b.name === test.section)?.key ?? null)
      : null,
    correctCount: result.correctCount,
    totalScored: result.totalQuestions,
    scorePercent: result.scorePercent,
    cards: test.questions.map((q, i) => ({
      question: q,
      studentAnswer: answers[i] ?? null,
      correct: !!result.verdicts[i]?.correct,
      ungraded: !!result.verdicts[i]?.ungraded,
      // Freshly submitted: the array IS the delivered order, so every
      // card is numbered. Reopened tests go through the DB path, which
      // reads the stored `position` and suppresses labels without one.
      position: i,
    })),
  })

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <TestResultView
        model={model}
        sessionId={sessionId}
        ko={ko}
        gradingOpenResponses={gradingOpenResponses}
        sat={result.sat ? { score: result.sat.score, capped: !!result.sat.capped } : null}
        // Adaptive only. `moduleBreakIdx` is the payload's CARD index of
        // the first Module 2 item; on a non-adaptive test it is absent
        // and moduleSplit refuses, which is what we want.
        modules={test.adaptive && typeof test.moduleBreakIdx === 'number'
          ? { breakIdx: test.moduleBreakIdx, module1CorrectCards: moduleRoute?.correct ?? null }
          : null}
        answerAudioPaths={answerAudioPaths}
        answerSpeechSignals={answerSpeechSignals}
        speakingGradeMode={speakingGradeMode}
        footer={
          <Link
            href="/mobile/study"
            className="w-full lg:w-auto lg:min-w-[200px] inline-flex items-center justify-center h-11 rounded-full bg-white ring-1 ring-gray-200/70 text-sm font-medium text-gray-700"
          >
            {t('study.test.backToStudy')}
          </Link>
        }
      />
    </div>
  )
}
