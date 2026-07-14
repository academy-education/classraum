"use client"

import { Loader2, CheckCircle2 } from 'lucide-react'
import { PathMascot } from '../../../_shared/PathMascot'

/** Pre-submit confirmation. Highlights unanswered count so students
 *  don't accidentally lock in a score they meant to revisit. */
export function SubmitConfirmModal({
  unanswered, totalQuestions, t, onCancel, onConfirm,
  title, body, confirmLabel,
}: {
  unanswered: number
  totalQuestions: number
  /** UI-language translator (from useTranslation) — not the test's
   *  content language, which is locked per family. A Korean user
   *  taking SAT sees Korean chrome via this t(). */
  t: (key: string, params?: Record<string, string | number>) => string | string[]
  onCancel: () => void
  onConfirm: () => void
  /** Optional copy overrides so the same modal can gate an irreversible
   *  step other than final submit (e.g. the SAT module-1 → module-2
   *  transition, which locks Module 1). */
  title?: string
  body?: string
  confirmLabel?: string
}) {
  const bodyKey = unanswered === 0
    ? 'study.test.submitConfirm.bodyAllAnswered'
    : unanswered === 1
      ? 'study.test.submitConfirm.bodyUnansweredOne'
      : 'study.test.submitConfirm.bodyUnansweredMany'
  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up"
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {title ?? String(t('study.test.submitConfirm.titleSubmit'))}
          </h3>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {body ?? String(t(bodyKey, { count: unanswered, total: totalQuestions }))}
          </p>
        </div>
        <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            {String(t('study.test.submitConfirm.cancel'))}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-all ${
              unanswered > 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {confirmLabel ?? String(t('study.test.submitConfirm.confirm'))}
          </button>
        </div>
      </div>
    </>
  )
}

/** Stepped progress UI driven by the NDJSON event stream from the
 *  generator route. Each step lights up when the server emits its
 *  phase event; the progress bar tracks the carried percent. */
const PROGRESS_STEPS: { name: string; labelKey: string; minPercent: number }[] = [
  { name: 'format', labelKey: 'study.test.progress.format', minPercent: 5 },
  { name: 'drafting_questions', labelKey: 'study.test.progress.draftingQuestions', minPercent: 15 },
  { name: 'drafting_hard', labelKey: 'study.test.progress.draftingHard', minPercent: 40 },
  { name: 'verifying', labelKey: 'study.test.progress.verifying', minPercent: 60 },
  { name: 'assembling', labelKey: 'study.test.progress.assembling', minPercent: 92 },
  { name: 'done', labelKey: 'study.test.progress.done', minPercent: 100 },
]

export function GenerationProgress({
  progress, t,
}: {
  progress: { name: string; labelKey: string; percent: number } | null
  t: (key: string) => string | string[]
}) {
  const percent = progress?.percent ?? 0
  const activeStepIndex = progress
    ? PROGRESS_STEPS.findIndex(s => s.name === progress.name)
    : -1
  // Special-case the polling stream — when the client connects to a
  // session whose server-side generation is already in flight on a
  // prior request, we get 'resuming' phase events. Tell the user
  // we're waiting for the existing run, not starting a new one.
  const isResuming = progress?.name === 'resuming'
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {/* Mascot in loading state — the grab→spin→catch gag runs on
              a 2.7s loop, so the ~90s test-gen wait is the one place it
              has time to land (short waits get "thinking" instead). */}
          <div className="inline-flex items-center justify-center mb-3">
            <PathMascot state="loading" size={72} />
          </div>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {String(t('study.test.progress.title'))}
          </h2>
          <p className="text-[12.5px] text-gray-500 mt-1">
            {String(t('study.test.progress.subtitle'))}
          </p>
        </div>

        {isResuming && (
          <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12.5px] text-amber-900 leading-relaxed">
            {String(t('study.test.progress.resuming'))}
          </div>
        )}

        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-2.5">
          {PROGRESS_STEPS.filter(s => s.name !== 'done').map((step, i) => {
            const done = activeStepIndex > i || percent >= 100
            const active = activeStepIndex === i && percent < 100
            return (
              <li key={step.name} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary/15 ring-2 ring-primary/30' : 'bg-gray-100'
                }`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : active
                      ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                </div>
                <span className={`text-[13.5px] ${
                  done ? 'text-gray-500' : active ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}>
                  {String(t(step.labelKey))}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
