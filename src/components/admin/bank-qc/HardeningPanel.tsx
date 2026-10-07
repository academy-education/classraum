'use client'

/**
 * Hardening — one near-hard item at a time, for a super_admin to lift with
 * one human twist (a stem condition, one distractor, the explanation).
 *
 * Saving NEVER changes what students see. The route stages a new bank row
 * (verified=false) linked to the original and queues it for the gate
 * (scripts/study-bank/hardening-gate.ts). The original stays live until the
 * gate passes the edit at its exact text and swaps it in. The panel says so
 * on the button and after every save, because "I pressed save and it is
 * live" is the wrong belief to leave a reviewer with.
 */

import React from 'react'
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, Send } from 'lucide-react'
import { useQcT } from './i18n'

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'
const FIELD = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm'
const LETTERS = 'ABCDEFGH'

interface Vote { source: string; grader: string; difficulty: string; note: string | null }

interface HardeningItem {
  id: string
  family: string
  section: string
  domain: string
  subskill: string | null
  difficulty: string
  cohort: string | null
  sha: string
  passageShared: boolean
  passage: string | null
  prompt: string
  choices: string[] | null
  correctAnswer: string
  explanation: string
  hasGraphic: boolean
  votes: Vote[]
  hardVotes: number
  totalVotes: number
  signals: string[]
  hint: { en: string; ko: string; source: string }
  queuedEdit: { id: string; note: string | null; changed: string[]; staged: { prompt?: string; passage?: string | null; choices?: string[]; correct_answer?: string; explanation?: string } | null } | null
  lastFailed: { id: string; result: { reasons?: string[] } | null } | null
}

interface Counts { candidates: number; open: number; staleVotes: number; queued: number; inGate: number; passed: number; swapped: number; failed: number }

interface Draft { prompt: string; passage: string; choices: string[]; correctIndex: number; explanation: string; note: string }

async function authed(url: string, init?: RequestInit) {
  const { db } = await import('@/lib/supabase')
  const { data: { session } } = await db.auth.getSession()
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error || `${res.status}`), { status: res.status })
  return json
}

function draftFrom(it: HardeningItem): Draft {
  const s = it.queuedEdit?.staged
  const choices = (s?.choices ?? it.choices ?? []).slice()
  const key = s?.correct_answer ?? it.correctAnswer
  return {
    prompt: s?.prompt ?? it.prompt,
    passage: (s?.passage ?? it.passage) ?? '',
    choices,
    correctIndex: Math.max(0, choices.indexOf(key)),
    explanation: s?.explanation ?? it.explanation,
    note: it.queuedEdit?.note ?? '',
  }
}

export function HardeningPanel() {
  const { t, language } = useQcT()
  const [index, setIndex] = React.useState(0)
  const [item, setItem] = React.useState<HardeningItem | null>(null)
  const [counts, setCounts] = React.useState<Counts | null>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [forbidden, setForbidden] = React.useState(false)
  const [saved, setSaved] = React.useState('')
  const [loaded, setLoaded] = React.useState(false)

  const load = React.useCallback(async (i: number) => {
    setLoading(true); setErr(''); setSaved('')
    try {
      const d = await authed(`/api/admin/bank-qc/hardening?index=${i}`)
      setCounts(d.counts)
      setItem(d.item)
      setIndex(d.index)
      setDraft(d.item ? draftFrom(d.item) : null)
    } catch (e) {
      if ((e as { status?: number }).status === 403) setForbidden(true)
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false); setLoaded(true)
    }
  }, [])

  React.useEffect(() => { if (!loaded && !loading) void load(0) }, [loaded, loading, load])

  const save = async () => {
    if (!item || !draft) return
    setSaving(true); setErr(''); setSaved('')
    try {
      const r = await authed('/api/admin/bank-qc/hardening', {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.id, expectedSha: item.sha,
          prompt: draft.prompt, passage: draft.passage, choices: draft.choices,
          correctIndex: draft.correctIndex, explanation: draft.explanation, note: draft.note,
        }),
      })
      setSaved(t('admin.bankQc.hardening.savedQueued', { fields: (r.changed ?? []).join(', ') }))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Not saved')
    } finally {
      setSaving(false)
    }
  }

  if (forbidden) {
    return <section className={`${CARD} p-5`}><p className="text-sm text-gray-600">{t('admin.bankQc.hardening.forbidden')}</p></section>
  }

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <header>
        <h2 className="text-[15px] font-semibold text-gray-900">{t('admin.bankQc.hardening.title')}</h2>
        <p className="text-[12.5px] text-gray-500 mt-1 max-w-3xl leading-relaxed">{t('admin.bankQc.hardening.description')}</p>
        {counts && (
          <p className="text-[12px] text-gray-600 mt-2 tabular-nums">
            {t('admin.bankQc.hardening.counts', {
              open: counts.open, candidates: counts.candidates, queued: counts.queued,
              inGate: counts.inGate, swapped: counts.swapped, failed: counts.failed,
            })}
            {counts.staleVotes > 0 && <> · {t('admin.bankQc.hardening.staleVotes', { n: counts.staleVotes })}</>}
          </p>
        )}
      </header>

      {loading && <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('admin.bankQc.hardening.loading')}</p>}
      {err && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      {!loading && loaded && !item && !err && <p className="text-sm text-gray-600">{t('admin.bankQc.hardening.empty')}</p>}

      {item && draft && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-gray-600">
            <span className="font-medium text-gray-900">{item.family.toUpperCase()} · {item.section} · {item.domain}</span>
            {item.subskill && <span className="text-gray-500">· {item.subskill}</span>}
            <span className="ml-auto tabular-nums">{index + 1} / {counts?.open ?? '?'}</span>
            <button type="button" aria-label={t('admin.bankQc.hardening.previous')} disabled={index === 0 || loading} onClick={() => load(index - 1)} className="p-1.5 rounded-lg ring-1 ring-gray-200 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /></button>
            <button type="button" aria-label={t('admin.bankQc.hardening.next')} disabled={loading || !counts || index >= counts.open - 1} onClick={() => load(index + 1)} className="p-1.5 rounded-lg ring-1 ring-gray-200 disabled:opacity-40"><ArrowRight className="w-4 h-4" /></button>
          </div>

          <div className="rounded-xl bg-amber-50/70 ring-1 ring-amber-100 px-3 py-2 text-[12.5px] text-amber-900">
            <div className="font-medium">{t('admin.bankQc.hardening.hintTitle')}</div>
            <p className="mt-0.5 leading-snug">{language === 'korean' ? item.hint.ko : item.hint.en}</p>
            <p className="mt-1 text-[11px] text-amber-700">{item.hint.source}</p>
          </div>

          <div>
            <div className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.votesTitle', { hard: item.hardVotes, total: item.totalVotes })}</div>
            <ul className="mt-1 space-y-1 text-[12px] text-gray-700">
              {item.votes.map((v, i) => (
                <li key={i} className="leading-snug">
                  <span className={`inline-block min-w-14 font-medium ${v.difficulty === 'hard' || v.difficulty === 'medium-hard' ? 'text-red-700' : 'text-gray-600'}`}>{v.difficulty}</span>
                  <span className="text-gray-400"> {v.grader} · {v.source}</span>
                  {v.note && <span className="block text-gray-600">{v.note}</span>}
                </li>
              ))}
            </ul>
          </div>

          {item.lastFailed?.result?.reasons?.length ? (
            <p className="text-[12px] text-red-800 bg-red-50 rounded-lg px-3 py-2">{t('admin.bankQc.hardening.lastFailed', { reasons: item.lastFailed.result.reasons.join('; ') })}</p>
          ) : null}
          {item.queuedEdit && <p className="text-[12px] text-blue-800 bg-blue-50 rounded-lg px-3 py-2">{t('admin.bankQc.hardening.alreadyQueued')}</p>}
          {item.hasGraphic && <p className="text-[12px] text-gray-500">{t('admin.bankQc.hardening.hasGraphic')}</p>}

          <label className="block">
            <span className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.passage')}{item.passageShared ? ` — ${t('admin.bankQc.hardening.passageShared')}` : ''}</span>
            <textarea className={`${FIELD} mt-1 min-h-24`} value={draft.passage} disabled={item.passageShared}
              onChange={e => setDraft({ ...draft, passage: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.stem')}</span>
            <textarea className={`${FIELD} mt-1 min-h-16`} value={draft.prompt} onChange={e => setDraft({ ...draft, prompt: e.target.value })} />
          </label>
          <fieldset>
            <legend className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.options')}</legend>
            <div className="mt-1 space-y-1.5">
              {draft.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" name="hardening-key" aria-label={t('admin.bankQc.hardening.markKey', { letter: LETTERS[i] })}
                    checked={draft.correctIndex === i} onChange={() => setDraft({ ...draft, correctIndex: i })} />
                  <span className="w-4 text-[12px] font-medium text-gray-500">{LETTERS[i]}</span>
                  <input className={FIELD} value={c} onChange={e => {
                    const next = draft.choices.slice(); next[i] = e.target.value; setDraft({ ...draft, choices: next })
                  }} />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">{t('admin.bankQc.hardening.keyNote')}</p>
          </fieldset>
          <label className="block">
            <span className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.explanation')}</span>
            <textarea className={`${FIELD} mt-1 min-h-20`} value={draft.explanation} onChange={e => setDraft({ ...draft, explanation: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-gray-700">{t('admin.bankQc.hardening.note')}</span>
            <input className={`${FIELD} mt-1`} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder={t('admin.bankQc.hardening.notePlaceholder')} />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-[13px] font-medium disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{t('admin.bankQc.hardening.save')}
            </button>
            <button type="button" onClick={() => setDraft(draftFrom(item))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg ring-1 ring-gray-200 text-[13px] text-gray-700">
              <RotateCcw className="w-4 h-4" />{t('admin.bankQc.hardening.reset')}
            </button>
            <span className="text-[11.5px] text-gray-500">{t('admin.bankQc.hardening.notLive')}</span>
          </div>
          {saved && <p role="status" className="text-[12.5px] text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">{saved}</p>}
        </div>
      )}
    </section>
  )
}
