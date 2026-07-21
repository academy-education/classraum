"use client"

import { useState } from 'react'
import { Sparkles, ListOrdered, Baby, Send, Loader2, Check } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { hapticSelection } from '@/lib/nativeHaptics'

/**
 * On-demand follow-up explanations for a single graded question. Sits
 * under the grader's static explanation (practice feedback, wrong
 * notebook) and lets the student pull a step-by-step walkthrough, a
 * simpler re-explanation, or ask their own follow-up — each one short
 * model call to /api/study/explain. No session, no persistence.
 */

interface Props {
  prompt: string
  choices?: string[]
  correctAnswer?: string
  studentAnswer?: string
  priorExplanation?: string
  language: 'en' | 'ko'
}

type Mode = 'steps' | 'simpler' | 'followup'
interface Item { id: number; mode: Mode; label: string; text: string; loading: boolean; error?: boolean }

/** Per-question cap: each canned mode is a single billed model call, so
 *  allow it once; free-form follow-ups are capped low. Keeps a stuck or
 *  bored student from re-tapping the same explanation and melting tokens.
 *  A failed call doesn't count (so the student can retry). */
const FOLLOWUP_LIMIT = 3

let seq = 0

export function ExplainMore({ prompt, choices, correctAnswer, studentAnswer, priorExplanation, language }: Props) {
  const ko = language === 'ko'
  const [items, setItems] = useState<Item[]>([])
  const [followup, setFollowup] = useState('')
  const [busy, setBusy] = useState(false)

  // A mode is "spent" once it has a non-errored item (loading counts, so a
  // second tap can't fire mid-flight). Errors don't count → retry allowed.
  const spent = (mode: Mode) => items.some(it => it.mode === mode && !it.error)
  const stepsUsed = spent('steps')
  const simplerUsed = spent('simpler')
  const followupsUsed = items.filter(it => it.mode === 'followup' && !it.error).length
  const followupsLeft = Math.max(0, FOLLOWUP_LIMIT - followupsUsed)

  const run = async (mode: Mode, label: string, followupText?: string) => {
    if (busy) return
    // Guard the per-question caps client-side too (buttons are disabled,
    // but this stops any programmatic double-fire).
    if (mode !== 'followup' && spent(mode)) return
    if (mode === 'followup' && followupsLeft <= 0) return
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
          mode, followup: followupText, language,
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

  const submitFollowup = (e: React.FormEvent) => {
    e.preventDefault()
    const q = followup.trim()
    if (!q || followupsLeft <= 0) return
    setFollowup('')
    void run('followup', q, q)
  }

  return (
    <div className="mt-3 space-y-2.5">
      {/* Quick-action chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
          <Sparkles className="w-3 h-3" />
          {ko ? '더 알아보기' : 'Explain more'}
        </span>
        <button
          type="button"
          onClick={() => void run('steps', ko ? '단계별 풀이' : 'Step-by-step')}
          disabled={busy || stepsUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {stepsUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ListOrdered className="w-3.5 h-3.5" />}
          {ko ? '단계별 풀이' : 'Step-by-step'}
        </button>
        <button
          type="button"
          onClick={() => void run('simpler', ko ? '더 쉽게' : 'Explain simply')}
          disabled={busy || simplerUsed}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white text-gray-700 ring-1 ring-gray-200/70 text-[12.5px] font-medium hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:hover:ring-gray-200/70 disabled:hover:text-gray-700 transition-all"
        >
          {simplerUsed ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Baby className="w-3.5 h-3.5" />}
          {ko ? '더 쉽게' : 'Explain simply'}
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

      {/* Free-form follow-up — capped per question. */}
      {followupsLeft > 0 ? (
        <form onSubmit={submitFollowup} className="relative">
          <input
            type="text"
            value={followup}
            onChange={e => setFollowup(e.target.value)}
            disabled={busy}
            placeholder={ko ? '이 문제에 대해 물어보기…' : 'Ask about this question…'}
            className="w-full h-10 pl-3.5 pr-11 rounded-xl bg-white ring-1 ring-gray-200/70 text-[13.5px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !followup.trim()}
            aria-label={ko ? '보내기' : 'Send'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-primary text-white inline-flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <p className="text-[11.5px] text-gray-400 px-1">
          {ko ? '이 문제의 추가 질문 한도에 도달했어요.' : "You've reached the follow-up limit for this question."}
        </p>
      )}
    </div>
  )
}
