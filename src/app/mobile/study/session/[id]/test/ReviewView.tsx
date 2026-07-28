"use client"

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { buildResultModel, familyFromTopicSlug } from '@/lib/study/test-result'
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
}) {
  const { t } = useTranslation()

  const model = buildResultModel({
    // `family` is payload-only and free-form (`string | null`), so it is
    // normalized through the same rule /summary uses on the topic slug
    // rather than trusted as-is. Both screens therefore answer "is this
    // SAT?" identically — reading it raw on one screen only is what put a
    // College Board 200-800 score on a TOEFL result.
    family: familyFromTopicSlug(test.family),
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
        sat={result.sat ? { score: result.sat.score, capped: !!result.sat.capped } : null}
        answerAudioPaths={answerAudioPaths}
        answerSpeechSignals={answerSpeechSignals}
        speakingGradeMode={speakingGradeMode}
        footer={
          <Link
            href="/mobile/study"
            className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white ring-1 ring-gray-200/70 text-sm font-medium text-gray-700"
          >
            {t('study.test.backToStudy')}
          </Link>
        }
      />
    </div>
  )
}
