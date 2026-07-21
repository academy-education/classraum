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
 * The student picks the explanation language (English / 한국어) via a small
 * toggle; it defaults to the app language. The per-question cap is per
 * (mode, language), so switching languages lets them get the other one.
 *
 * When `attemptId` is passed (wrong-answer notebook) the generated text +
 * its language are persisted and re-seeded here via `savedSteps` /
 * `savedSimpler`, so the explanation stays visible across reloads without
 * re-billing.
 */

type Lang = 'en' | 'ko'

interface Props {
  prompt: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  language: Lang
  /** When set, generated explanations are saved against this attempt. */
  attemptId?: string
  /** Previously saved output + its language, re-shown on mount. */
  savedSteps?: string | null
  savedSimpler?: string | null
  savedStepsLang?: string | null
  savedSimplerLang?: string | null
}

type Mode = 'steps' | 'simpler'
interface Item { id: number; mode: Mode; lang: Lang; label: string; text: string; loading: boolean; error?: boolean }

let seq = 0

const asLang = (v: string | null | undefined, fallback: Lang): Lang => (v === 'ko' || v === 'en' ? v : fallback)

export function ExplainMore({
  prompt, choices, correctAnswer, studentAnswer, priorExplanation, language,
  attemptId, savedSteps, savedSimpler, savedStepsLang, savedSimplerLang,
}: Props) {
  const label = (mode: Mode, l: Lang) =>
    mode === 'steps' ? (l === 'ko' ? '단계별 풀이' : 'Step-by-step') : (l === 'ko' ? '더 쉽게' : 'Explain simply')

  // The language the student wants explanations in — defaults to the app
  // language, but seed from any saved output so a revisit reflects it.
  const [lang, setLang] = useState<Lang>(() =>
    savedSteps ? asLang(savedStepsLang, language) : savedSimpler ? asLang(savedSimplerLang, language) : language)

  // Seed from saved output so a revisit shows it immediately (and the
  // matching button reads as already-used). Step-by-step is ordered first.
  const [items, setItems] = useState<Item[]>(() => {
    const out: Item[] = []
    if (savedSteps) {
      const l = asLang(savedStepsLang, language)
      out.push({ id: ++seq, mode: 'steps', lang: l, label: label('steps', l), text: savedSteps, loading: false })
    }
    if (savedSimpler) {
      const l = asLang(savedSimplerLang, language)
      out.push({ id: ++seq, mode: 'simpler', lang: l, label: label('simpler', l), text: savedSimpler, loading: false })
    }
    return out
  })
  const [busy, setBusy] = useState(false)

  // "Spent" per (mode, language): a non-errored item exists for this mode
  // in the selected language. Switching language re-enables the buttons.
  const spent = (mode: Mode) => items.some(it => it.mode === mode && it.lang === lang && !it.error)
  const stepsUsed = spent('steps')
  const simplerUsed = spent('simpler')
  const ko = lang === 'ko'

  const run = async (mode: Mode) => {
    if (busy || spent(mode)) return
    hapticSelection()
    setBusy(true)
    const id = ++seq
    const itemLang = lang
    setItems(prev => [...prev, { id, mode, lang: itemLang, label: label(mode, itemLang), text: '', loading: true }])
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/explain', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt, choices, correctAnswer, studentAnswer, priorExplanation,
          mode, language: itemLang, attemptId,
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
      {/* Header row: label + language toggle. */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          <Sparkles className="w-3 h-3" />
          {ko ? '더 알아보기' : 'Explain more'}
        </span>
        <div className="inline-flex items-center rounded-full bg-gray-100 p-0.5" role="group" aria-label={ko ? '설명 언어' : 'Explanation language'}>
          {(['en', 'ko'] as Lang[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`h-6 px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                lang === l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l === 'en' ? 'EN' : '한국어'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-action chips — step-by-step first, then simpler. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run('steps')}
          disabled={busy || stepsUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {stepsUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ListOrdered className="w-3.5 h-3.5" />}
          {label('steps', lang)}
        </button>
        <button
          type="button"
          onClick={() => void run('simpler')}
          disabled={busy || simplerUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {simplerUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Baby className="w-3.5 h-3.5" />}
          {label('simpler', lang)}
        </button>
      </div>

      {/* Answer stack */}
      {items.map(it => (
        <div key={it.id} className="rounded-xl bg-primary/[0.04] ring-1 ring-primary/15 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary/80 mb-1.5">{it.label}</p>
          {it.loading ? (
            <p className="inline-flex items-center gap-2 text-[13px] text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {it.lang === 'ko' ? '설명을 준비 중…' : 'Thinking…'}
            </p>
          ) : it.error ? (
            <p className="text-[13px] text-rose-600">
              {it.lang === 'ko' ? '설명을 불러오지 못했어요. 다시 시도해 주세요.' : "Couldn't load that. Try again."}
            </p>
          ) : (
            <p className="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">{it.text}</p>
          )}
        </div>
      ))}
    </div>
  )
}
