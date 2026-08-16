"use client"

import { useCallback, useEffect, useState } from 'react'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { normalizeDisplayText, PassageParagraphs, PromptText } from '@/app/mobile/study/session/[id]/test/helpers'
import { QuestionGraphicView } from '@/app/mobile/study/session/[id]/test/QuestionGraphicView'
import { displayCorrectAnswer, type ResultRowQuestion } from '@/lib/study/test-result'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { AlertTriangle, CheckCircle2, ChevronDown, Sparkles, XCircle } from 'lucide-react'

/**
 * Teacher-side answer review for ONE student's completed camp session —
 * the landing page's "help students understand every mistake" promise,
 * turned toward the teacher. Opened from the assignment timeline in
 * CampStudentDetail.
 *
 * Data: GET /api/camp/student-session (teacher/manager only). Each row
 * carries the exact cached question the student saw (choices in their
 * shuffled order) plus the graded answer, read from the same
 * study_attempts row, so the pick is always marked on the question that
 * was actually delivered.
 *
 * Presentation: the same review verdicts and emerald/rose option
 * styling the student's own TestResultView uses — key emerald, wrong
 * pick rose, blank amber — with the shared text helpers
 * (PromptText/PassageParagraphs/normalizeDisplayText) and
 * displayCorrectAnswer, so the two surfaces can never describe one
 * answer differently. Wrong and blank rows start expanded: the teacher
 * opened this to see the mistakes.
 */

interface SessionReviewRow {
  position: number | null
  question: ResultRowQuestion
  studentAnswer: string | null
  isCorrect: boolean | null
}

interface SessionReviewData {
  session: {
    id: string
    studentId: string
    studentName: string | null
    correctCount: number | null
    totalCount: number | null
    scorePercent: number | null
    completedAt: string | null
  }
  assignment: { id: string; title: string; questionCount: number }
  rows: SessionReviewRow[]
}

interface CampStudentSessionReviewProps {
  sessionId: string
  /** Fallbacks while the fetch is in flight (from the timeline row). */
  studentName: string
  assignmentTitle: string
  onClose: () => void
}

export function CampStudentSessionReview({
  sessionId, studentName, assignmentTitle, onClose,
}: CampStudentSessionReviewProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [data, setData] = useState<SessionReviewData | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(
          `/api/camp/student-session?sessionId=${encodeURIComponent(sessionId)}`,
          { headers: await authHeaders() },
        )
        if (!res.ok) throw new Error(`student-session ${res.status}`)
        const json = (await res.json()) as SessionReviewData
        if (!cancelled) setData(json)
      } catch (e) {
        console.error('[camp] student session review load failed:', e)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sessionId])

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  const correct = data?.session.correctCount ?? null
  const total = data?.session.totalCount ?? null
  const pct = data?.session.scorePercent
    ?? (correct !== null && total !== null && total > 0 ? Math.round((100 * correct) / total) : null)
  const missed = data ? data.rows.filter(r => r.isCorrect === false).length : 0

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="lg"
      title={String(t('camp.studentSession.title'))}
      subtitle={`${data?.session.studentName ?? studentName} · ${data?.assignment.title ?? assignmentTitle}`}
    >
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : error || !data ? (
        <p className="text-sm text-rose-600 py-3">{t('camp.studentSession.loadFailed')}</p>
      ) : (
        <div className="space-y-5">
          {/* Summary chips — same idiom as the student-detail modal. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                {t('camp.studentSession.score')}
              </p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">
                {pct !== null ? `${pct}%` : '—'}
                {correct !== null && total !== null && (
                  <span className="ml-1.5 text-sm font-normal text-gray-400">{correct}/{total}</span>
                )}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                {t('camp.studentSession.missed')}
              </p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">{missed}</p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                {t('camp.studentSession.completedOn')}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {data.session.completedAt ? formatDate(data.session.completedAt) : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {data.rows.map((row, i) => (
              <SessionReviewCard key={i} row={row} index={i} total={data.rows.length} />
            ))}
          </div>
        </div>
      )}
    </ModalShell>
  )
}

/** One question card. Wrong/blank rows start open — they are what the
 *  teacher came for; correct rows fold away but stay one click deep. */
function SessionReviewCard({ row, index, total }: {
  row: SessionReviewRow
  index: number
  total: number
}) {
  const { t } = useTranslation()
  const wrong = row.isCorrect === false
  const blank = row.studentAnswer == null
  const [open, setOpen] = useState(wrong || blank)
  const q = row.question
  const choices = q.choices ?? []
  const correctDisplay = displayCorrectAnswer(q)

  return (
    <div className={`rounded-xl ring-1 bg-white overflow-hidden transition-shadow ${
      open ? 'ring-gray-200 shadow-sm' : 'ring-gray-200/70 hover:ring-primary/40'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/70 focus-visible:outline-none focus-visible:bg-gray-50 transition-colors"
      >
        {/* Verdict tile — the same emerald/rose/amber verdict language as
            the student's TestResultView review list. */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          row.isCorrect === true ? 'bg-emerald-50 text-emerald-600'
            : blank ? 'bg-amber-50 text-amber-600'
            : 'bg-rose-50 text-rose-600'
        }`}>
          {row.isCorrect === true ? <CheckCircle2 className="w-4 h-4" strokeWidth={2.25} />
            : blank ? <AlertTriangle className="w-4 h-4" strokeWidth={2.25} />
            : <XCircle className="w-4 h-4" strokeWidth={2.25} />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 mb-0.5">
            {t('camp.studentSession.questionN', { n: index + 1, total })}
          </p>
          <div className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            <PromptText text={q.prompt} />
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
          {q.passage && (
            <div className="rounded-xl ring-1 ring-gray-200/70 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
              <PassageParagraphs text={q.passage} />
            </div>
          )}
          <p className="text-gray-900 whitespace-pre-wrap"><PromptText text={q.prompt} /></p>
          {q.graphic != null && <QuestionGraphicView graphic={q.graphic} />}

          {choices.length > 0 ? (
            /* The four options with the student's pick and the key marked —
               the exact emerald/rose option rows the student's own result
               screen renders. */
            <div className="space-y-1.5 mt-2">
              {choices.map(choice => {
                const isCorrectChoice = choice === q.correct_answer
                const isStudentPick = choice === row.studentAnswer
                const distractorReason = !isCorrectChoice
                  ? q.distractor_rationales?.find(d => d.choice === choice)?.reason
                  : undefined
                return (
                  <div key={choice} className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                    isCorrectChoice ? 'bg-emerald-50 text-emerald-900 ring-emerald-200/70'
                      : isStudentPick ? 'bg-rose-50 text-rose-900 ring-rose-200/70'
                      : 'bg-gray-50 text-gray-700 ring-gray-200/50'
                  }`}>
                    <div>
                      {normalizeDisplayText(choice)}
                      {isCorrectChoice && (
                        <span className="ml-2 font-semibold">{t('camp.studentSession.correctMark')}</span>
                      )}
                      {isStudentPick && !isCorrectChoice && (
                        <span className="ml-2 font-semibold">{t('camp.studentSession.studentPickMark')}</span>
                      )}
                    </div>
                    {distractorReason && isStudentPick && (
                      <div className="mt-1 text-[11px] leading-relaxed text-rose-800">
                        <span className="font-semibold">{t('camp.studentSession.whyWrong')} </span>
                        {normalizeDisplayText(distractorReason)}
                      </div>
                    )}
                  </div>
                )
              })}
              {blank && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-900 text-xs ring-1 ring-amber-200/70">
                  {t('camp.studentSession.leftBlank')}
                </div>
              )}
            </div>
          ) : (
            /* Non-choice items (SAT numeric entry, etc.): key vs response. */
            <div className="space-y-2 mt-2">
              <div className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-900 text-xs ring-1 ring-emerald-200/70">
                <div className="font-semibold mb-0.5">{t('camp.studentSession.correctAnswer')}</div>
                <div className="whitespace-pre-wrap">{normalizeDisplayText(correctDisplay)}</div>
              </div>
              {row.studentAnswer != null ? (
                <div className={`px-3 py-2 rounded-xl text-xs ring-1 ${
                  row.isCorrect === true
                    ? 'bg-gray-50 text-gray-700 ring-gray-200/70'
                    : 'bg-rose-50 text-rose-900 ring-rose-200/70'
                }`}>
                  <div className="font-semibold mb-0.5">{t('camp.studentSession.studentAnswer')}</div>
                  <div className="whitespace-pre-wrap">{normalizeDisplayText(row.studentAnswer)}</div>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-amber-50 text-amber-900 text-xs ring-1 ring-amber-200/70">
                  {t('camp.studentSession.leftBlank')}
                </div>
              )}
            </div>
          )}

          {q.explanation && (
            <div className="rounded-xl bg-gradient-to-br from-primary/[0.05] to-transparent ring-1 ring-primary/15 px-3 py-2.5 mt-3">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.10em] text-primary mb-1">
                <Sparkles className="w-3 h-3" />
                {t('camp.studentSession.explanation')}
              </div>
              <p className="text-[12.5px] text-gray-700 leading-relaxed">
                {normalizeDisplayText(q.explanation)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
