"use client"

import { useState } from 'react'
import { Sparkles, ListOrdered, Baby, Loader2, Check } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { hapticSelection } from '@/lib/nativeHaptics'

/**
 * On-demand follow-up explanations for a single graded question. Sits
 * under the grader's static explanation (practice feedback, wrong
 * notebook) and lets the student pull a step-by-step walkthrough or a
 * simpler re-explanation — each one short model call to /api/study/explain.
 *
 * Per-question cap: each mode is a single billed call, so it's allowed
 * once. When `attemptId` is passed (wrong-answer notebook) the generated
 * text is persisted server-side and re-seeded here via `savedSteps` /
 * `savedSimpler`, so the explanation stays visible across reloads without
 * re-billing.
 */

interface Props {
  prompt: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  language: 'en' | 'ko'
  /** When set, generated explanations are saved against this attempt. */
  attemptId?: string
  /** Previously saved output, re-shown on mount (wrong-notebook only). */
  savedSteps?: string | null
  savedSimpler?: string | null
}

type Mode = 'steps' | 'simpler'
interface Item { id: number; mode: Mode; label: string; text: string; loading: boolean; error?: boolean }

let seq = 0

export function ExplainMore({
  prompt, choices, correctAnswer, studentAnswer, priorExplanation, language,
  attemptId, savedSteps, savedSimpler,
}: Props) {
  const ko = language === 'ko'
  const stepsLabel = ko ? '단계별 풀이' : 'Step-by-step'
  const simplerLabel = ko ? '더 쉽게' : 'Explain simply'

  // Seed from any saved output so a revisit shows it immediately (and the
  // buttons read as already-used). Step-by-step is always ordered first.
  const [items, setItems] = useState<Item[]>(() => {
    const out: Item[] = []
    if (savedSteps) out.push({ id: ++seq, mode: 'steps', label: stepsLabel, text: savedSteps, loading: false })
    if (savedSimpler) out.push({ id: ++seq, mode: 'simpler', label: simplerLabel, text: savedSimpler, loading: false })
    return out
  })
  const [busy, setBusy] = useState(false)

  // A mode is "spent" once it has a non-errored item (loading counts, so a
  // second tap can't fire mid-flight). Errors don't count → retry allowed.
  const spent = (mode: Mode) => items.some(it => it.mode === mode && !it.error)
  const stepsUsed = spent('steps')
  const simplerUsed = spent('simpler')

  const run = async (mode: Mode, label: string) => {
    if (busy || spent(mode)) return
    hapticSelection()
    setBusy(true)
    const id = ++seq
    setItems(prev => [...prev, { id, mode, label, text: '', loading: true }])
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/explain', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt, choices, correctAnswer, studentAnswer, priorExplanation,
          mode, language, attemptId,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const json = await res.json()
      setItems(prev => prev.map(it => it.id === id ? { ...it, text: String(json.text ?? ''), loading: false } : it))
    } catch {
      setItems(prev => prev.map(it => it.id === id ? { ...it, loading: false, error: true } : it))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2.5">
      {/* Quick-action chips — step-by-step first, then simpler. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          <Sparkles className="w-3 h-3" />
          {ko ? '더 알아보기' : 'Explain more'}
        </span>
        <button
          type="button"
          onClick={() => void run('steps', stepsLabel)}
          disabled={busy || stepsUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {stepsUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ListOrdered className="w-3.5 h-3.5" />}
          {stepsLabel}
        </button>
        <button
          type="button"
          onClick={() => void run('simpler', simplerLabel)}
          disabled={busy || simplerUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {simplerUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Baby className="w-3.5 h-3.5" />}
          {simplerLabel}
        </button>
      </div>

      {/* Answer stack */}
      {items.map(it => (
        <div key={it.id} className="rounded-xl bg-primary/[0.04] ring-1 ring-primary/15 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/80 mb-1.5">{it.label}</p>
          {it.loading ? (
            <p className="inline-flex items-center gap-2 text-[13px] text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {ko ? '설명을 준비 중…' : 'Thinking…'}
            </p>
          ) : it.error ? (
            <p className="text-[13px] text-rose-600">
              {ko ? '설명을 불러오지 못했어요. 다시 시도해 주세요.' : "Couldn't load that. Try again."}
            </p>
          ) : (
            <p className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">{it.text}</p>
          )}
        </div>
      ))}
    </div>
  )
}
