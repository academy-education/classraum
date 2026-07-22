"use client"

import { useState } from 'react'
import { Flag, CheckCircle2, Loader2 } from './icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

/**
 * "Report a problem" affordance shown under a reviewed question. Lets a
 * student flag a wrong answer key / ambiguous stem / typo / off-topic
 * item straight from the review, feeding the question-report queue that
 * drives bank QC.
 *
 * Self-contained: collapsed to a single quiet link until tapped, so it
 * never competes with the explanation. POSTs to /api/study/report-question
 * (which de-dupes by content hash), then settles into a thank-you state.
 */

type ReportReason = 'wrong_key' | 'ambiguous' | 'typo' | 'off_topic' | 'other'

const REASONS: ReportReason[] = ['wrong_key', 'ambiguous', 'typo', 'off_topic', 'other']

export interface ReportableQuestion {
  prompt: string
  type?: string
  choices?: string[]
  correct_answer?: string | null
  explanation?: string | null
}

export function ReportQuestion({
  question,
  sessionId,
}: {
  question: ReportableQuestion
  sessionId?: string | null
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle')

  async function submit() {
    if (!reason || status === 'saving') return
    setStatus('saving')
    try {
      const headers = await authHeaders()
      await fetch('/api/study/report-question', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId ?? null,
          reason,
          note: note.trim() || undefined,
          question: {
            prompt: question.prompt,
            type: question.type,
            choices: question.choices,
            correct_answer: question.correct_answer ?? null,
            explanation: question.explanation ?? null,
          },
        }),
      })
      // Treat any resolved response as success — the report is advisory and
      // the endpoint de-dupes, so we never want to nag the student to retry.
      setStatus('done')
    } catch {
      setStatus('done')
    }
  }

  if (status === 'done') {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('study.report.thanks')}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Flag className="w-3.5 h-3.5" />
        {t('study.report.cta')}
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
      <div className="text-[12px] font-semibold text-gray-700">{t('study.report.title')}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REASONS.map(r => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={`px-2.5 py-1 rounded-full text-[12px] font-medium ring-1 transition-colors ${
              reason === r
                ? 'bg-gray-900 text-white ring-gray-900'
                : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'
            }`}
          >
            {t(`study.report.reason.${r}`)}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={t('study.report.notePlaceholder')}
        className="mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(null); setNote('') }}
          className="px-3 py-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-700"
        >
          {t('study.report.cancel')}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!reason || status === 'saving'}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
        >
          {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('study.report.submit')}
        </button>
      </div>
    </div>
  )
}
