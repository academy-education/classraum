'use client'

/**
 * Drafts — AI-drafted SSAT reading passages for a person to fix before our
 * checks run. The owner's method (2026-10-11): the co-founder spends about
 * ten minutes per passage rewriting answer choices that give the answer
 * away. Contract: scripts/study-bank/SSAT-DRAFT-EDIT-CONTRACT.md.
 *
 * Saving never makes anything live. Draft rows are verified=false, which the
 * test assembler ignores; nothing on this screen can change that.
 *
 * English only by design (admin tool for one reviewer).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Pencil, RotateCcw, Save, SkipForward } from 'lucide-react'
import { validateItemEdit, type DraftQc, type DraftStatus, type PassageSummary } from '@/lib/study/ssat-draft'

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'
const FIELD = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm leading-relaxed'
const LETTERS = 'ABCDE'

interface LoadedItem {
  id: string
  sha: string | null
  status: DraftStatus
  prompt: string
  choices: string[]
  correctAnswer: string
  explanation: string
  subskill: string | null
  qc: DraftQc | null
  editedAt: string | null
}
interface LoadedPassage { group: string; cohort: string; passage: string; items: LoadedItem[] }
interface EditItem { prompt: string; choices: string[]; correctIndex: number; explanation: string }
interface LocalDraft { shas: Record<string, string | null>; passage: string; editPassage: boolean; note: string; items: Record<string, EditItem> }

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
  if (!res.ok) throw Object.assign(new Error(json.error || `${res.status}`), { status: res.status, body: json })
  return json
}

const storageKey = (group: string) => `bank-qc:ssat-draft:${group}`
function readLocal(group: string): LocalDraft | null {
  try { const s = window.localStorage.getItem(storageKey(group)); return s ? JSON.parse(s) as LocalDraft : null } catch { return null }
}
function writeLocal(group: string, d: LocalDraft) {
  try { window.localStorage.setItem(storageKey(group), JSON.stringify(d)) } catch { /* private mode / quota: autosave is a convenience */ }
}
function clearLocal(group: string) {
  try { window.localStorage.removeItem(storageKey(group)) } catch { /* ignore */ }
}

function toEdit(it: LoadedItem): EditItem {
  const choices = [...it.choices]
  while (choices.length < 5) choices.push('')
  return { prompt: it.prompt, choices, correctIndex: choices.indexOf(it.correctAnswer), explanation: it.explanation }
}
const sameEdit = (a: EditItem, b: EditItem) => JSON.stringify(a) === JSON.stringify(b)

const STATUS_CHIP: Record<DraftStatus, { label: string; cls: string }> = {
  awaiting_edit: { label: 'Needs editing', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  edited: { label: 'Edited', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  skipped: { label: 'Skipped', cls: 'bg-gray-50 text-gray-600 ring-gray-200' },
}
const RISK: Record<string, { label: string; box: string; dot: string }> = {
  high: { label: 'High risk', box: 'bg-red-50 ring-red-200 text-red-900', dot: 'bg-red-500' },
  med: { label: 'Some risk', box: 'bg-amber-50 ring-amber-200 text-amber-900', dot: 'bg-amber-500' },
  low: { label: 'Low risk', box: 'bg-emerald-50 ring-emerald-200 text-emerald-900', dot: 'bg-emerald-500' },
}

function Chip({ status }: { status: DraftStatus }) {
  const s = STATUS_CHIP[status]
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${s.cls}`}>{s.label}</span>
}

function Guidance() {
  return (
    <div className="rounded-xl bg-sky-50 ring-1 ring-sky-100 px-4 py-3 text-sm text-sky-950 leading-relaxed">
      <p className="font-semibold mb-1">How to fix a passage</p>
      <p>
        The giveaway is usually that the right answer is the only thoughtful or warm option. Make at least two wrong
        answers just as reasonable-sounding, but contradicted by the passage. Don&apos;t make the right answer longer or
        fancier than the others.
      </p>
      <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
        <li>The right answers across the 6 questions tell one story; each wrong answer tells a different one. Make some wrong answers fit the other questions too.</li>
        <li>Main idea: the right answer is the only one that covers everything. Make wrong answers broad too, just wrong in focus.</li>
        <li>Purpose: the right answer uses a stock phrase (&ldquo;to prepare for&hellip;&rdquo;, &ldquo;to contrast&hellip;&rdquo;). Give wrong answers the same kind of phrasing.</li>
        <li>Inference: the right answer is the big theme cause. Make a wrong answer equally deep but unsupported.</li>
        <li>Attitude: AI guesses the warm word (admiring, wistful). Include a second warm or reflective option.</li>
        <li>Detail: if common sense alone picks the answer, make a wrong answer just as sensible.</li>
      </ul>
      <p className="mt-1.5 text-[12px] text-sky-800">
        Saving does not put anything in front of students. These questions stay hidden until our checks run on your version.
      </p>
    </div>
  )
}

function QcPanel({ qc }: { qc: DraftQc | null }) {
  if (!qc) return <div className="rounded-xl ring-1 ring-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-500">No AI check results for this question.</div>
  const r = RISK[qc.risk ?? ''] ?? { label: 'Risk not rated', box: 'bg-gray-50 ring-gray-200 text-gray-800', dot: 'bg-gray-400' }
  const hits = typeof qc.oo_hits === 'number' ? qc.oo_hits : null
  return (
    <div className={`rounded-xl ring-1 px-3 py-2.5 text-[12.5px] leading-snug ${r.box}`} data-testid="qc-panel">
      <div className="flex items-center gap-1.5 font-semibold"><span className={`h-2 w-2 rounded-full ${r.dot}`} />{r.label}</div>
      {hits !== null && (
        <p className="mt-1">{hits} of 3 AI solvers guessed this without the passage</p>
      )}
      {!!qc.oo_notes?.length && (
        <div className="mt-2">
          <p className="font-medium">Why they picked it</p>
          <ul className="mt-0.5 list-disc pl-4 space-y-0.5">{qc.oo_notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
      {!!qc.grader_flags?.length && (
        <div className="mt-2">
          <p className="font-medium">Reviewer concerns</p>
          <ul className="mt-0.5 list-disc pl-4 space-y-0.5">{qc.grader_flags.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

// ── List ──────────────────────────────────────────────────────────────

function DraftList({ onOpen }: { onOpen: (group: string) => void }) {
  const [data, setData] = useState<{ passages: PassageSummary[]; counts: Record<DraftStatus, number> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    setError(null)
    authed('/api/admin/bank-qc/drafts').then(setData).catch(e => setError(e.message))
  }, [])
  useEffect(() => { load() }, [load])

  if (error) return <div className={`${CARD} p-5 text-sm text-red-700`}>Could not load drafts: {error} <button className="underline ml-2" onClick={load}>Retry</button></div>
  if (!data) return <div className={`${CARD} p-5 text-sm text-gray-500 flex items-center gap-2`}><Loader2 className="h-4 w-4 animate-spin" />Loading drafts...</div>
  return (
    <div className={`${CARD} p-5 space-y-4`}>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[15px] font-semibold text-gray-900">Draft passages</h2>
        <span className="text-[12px] text-gray-600">{data.counts.awaiting_edit} need editing · {data.counts.edited} edited · {data.counts.skipped} skipped</span>
      </div>
      {data.passages.length === 0 ? (
        <p className="text-sm text-gray-500">No draft passages yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {data.passages.map(p => (
            <li key={p.group}>
              <button type="button" onClick={() => onOpen(p.group)} className="w-full text-left py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 flex items-center gap-3">
                <Chip status={p.status} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900 truncate">{p.title}</span>
                  <span className="block text-[11px] text-gray-500 truncate">{p.items} questions · {p.cohort} · {p.group}</span>
                </span>
                {p.highRisk > 0 && (
                  <span className="shrink-0 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 px-2 py-0.5 text-[11px] font-medium">{p.highRisk} high-risk</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────

function PassageEditor({ group, onBack }: { group: string; onBack: () => void }) {
  const [loaded, setLoaded] = useState<LoadedPassage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [passage, setPassage] = useState('')
  const [editPassage, setEditPassage] = useState(false)
  const [note, setNote] = useState('')
  const [items, setItems] = useState<Record<string, EditItem>>({})
  const [restored, setRestored] = useState(false)
  const [busy, setBusy] = useState<null | 'save' | 'skip'>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})

  const load = useCallback((keepMessage?: boolean) => {
    setError(null); setLoaded(null); setServerErrors({})
    if (!keepMessage) setMessage(null)
    authed(`/api/admin/bank-qc/drafts?group=${encodeURIComponent(group)}`).then((p: LoadedPassage) => {
      setLoaded(p)
      const base = Object.fromEntries(p.items.map(it => [it.id, toEdit(it)]))
      const shas = Object.fromEntries(p.items.map(it => [it.id, it.sha]))
      const local = readLocal(group)
      // Restore unsaved work only onto the exact text it was made against.
      if (local && JSON.stringify(local.shas) === JSON.stringify(shas)) {
        setPassage(local.passage); setEditPassage(local.editPassage); setNote(local.note)
        setItems({ ...base, ...local.items }); setRestored(true)
      } else {
        if (local) clearLocal(group)
        setPassage(p.passage); setEditPassage(false); setNote(''); setItems(base); setRestored(false)
      }
    }).catch(e => setError(e.message))
  }, [group])
  useEffect(() => { load() }, [load])

  const base = useMemo(() => loaded ? Object.fromEntries(loaded.items.map(it => [it.id, toEdit(it)])) : {}, [loaded])
  const dirtyIds = useMemo(() => Object.keys(items).filter(id => base[id] && !sameEdit(items[id], base[id])), [items, base])
  const passageDirty = !!loaded && passage !== loaded.passage
  const dirty = dirtyIds.length > 0 || passageDirty

  // Autosave unsaved edits locally.
  useEffect(() => {
    if (!loaded) return
    if (!dirty && !note) { clearLocal(group); return }
    writeLocal(group, {
      shas: Object.fromEntries(loaded.items.map(it => [it.id, it.sha])),
      passage, editPassage, note,
      items: Object.fromEntries(dirtyIds.map(id => [id, items[id]])),
    })
  }, [loaded, group, passage, editPassage, note, items, dirty, dirtyIds])

  const validations = useMemo(() => Object.fromEntries(Object.entries(items).map(([id, e]) => [id, validateItemEdit({
    prompt: e.prompt, choices: e.choices, correct_answer: e.correctIndex >= 0 ? e.choices[e.correctIndex] ?? '' : '', explanation: e.explanation,
  })])), [items])
  const errorCount = Object.values(validations).filter(v => v.errors.length).length + (editPassage && !passage.trim() ? 1 : 0)

  const setItem = (id: string, f: (e: EditItem) => EditItem) => setItems(prev => ({ ...prev, [id]: f(prev[id]) }))

  const save = async () => {
    if (!loaded || errorCount) return
    setBusy('save'); setMessage(null); setServerErrors({})
    try {
      const res = await authed('/api/admin/bank-qc/drafts', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save', group, note,
          ...(passageDirty ? { passage } : {}),
          items: loaded.items.map(it => {
            const e = items[it.id]
            return { id: it.id, expectedSha: it.sha, prompt: e.prompt, choices: e.choices, correct_answer: e.choices[e.correctIndex] ?? '', explanation: e.explanation }
          }),
        }),
      })
      clearLocal(group)
      setMessage({ tone: 'ok', text: `Saved. ${res.changed} question(s) changed. Nothing is live; our checks run on your version next.` })
      load(true)
    } catch (e) {
      const err = e as Error & { body?: { details?: Record<string, string[]> } }
      setServerErrors(err.body?.details ?? {})
      setMessage({ tone: 'err', text: `Not saved: ${err.message}` })
    } finally { setBusy(null) }
  }

  const skip = async () => {
    if (!loaded) return
    if (!window.confirm('Skip this passage? It will be set aside and not used.')) return
    setBusy('skip'); setMessage(null)
    try {
      await authed('/api/admin/bank-qc/drafts', { method: 'POST', body: JSON.stringify({ action: 'skip', group }) })
      clearLocal(group)
      onBack()
    } catch (e) {
      setMessage({ tone: 'err', text: `Not skipped: ${(e as Error).message}` })
    } finally { setBusy(null) }
  }

  const back = () => {
    if (dirty && !window.confirm('You have unsaved changes. They are kept on this computer and will come back when you reopen this passage. Leave?')) return
    onBack()
  }

  const discard = () => {
    if (!loaded || !window.confirm('Throw away your unsaved changes to this passage?')) return
    clearLocal(group)
    setPassage(loaded.passage); setEditPassage(false); setNote(''); setItems(base); setRestored(false)
  }

  if (error) return (
    <div className={`${CARD} p-5 text-sm text-red-700 space-y-2`}>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />All passages</button>
      <p>Could not open this passage: {error}</p>
    </div>
  )
  if (!loaded) return <div className={`${CARD} p-5 text-sm text-gray-500 flex items-center gap-2`}><Loader2 className="h-4 w-4 animate-spin" />Loading passage...</div>

  const status = loaded.items.some(i => i.status === 'awaiting_edit') ? 'awaiting_edit' : loaded.items.some(i => i.status === 'edited') ? 'edited' : 'skipped'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={back} className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />All passages</button>
        <Chip status={status} />
        <span className="text-[11px] text-gray-500 truncate">{loaded.cohort} · {group}</span>
      </div>

      <Guidance />

      {restored && dirty && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2 text-[13px] text-amber-900 flex flex-wrap items-center gap-2">
          <span>Your unsaved changes from last time were restored.</span>
          <button type="button" onClick={discard} className="inline-flex items-center gap-1 underline"><RotateCcw className="h-3.5 w-3.5" />Discard them</button>
        </div>
      )}

      <section className={`${CARD} p-5`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Passage</h3>
          <button type="button" onClick={() => setEditPassage(v => !v)} className="inline-flex items-center gap-1 text-[13px] text-gray-700 hover:text-gray-900 rounded-lg px-2 py-1 ring-1 ring-gray-200">
            <Pencil className="h-3.5 w-3.5" />{editPassage ? 'Stop editing passage' : 'Edit passage'}
          </button>
        </div>
        {editPassage ? (
          <textarea aria-label="Passage text" className={`${FIELD} font-serif`} rows={16} value={passage} onChange={e => setPassage(e.target.value)} />
        ) : (
          <div className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-gray-900 max-h-[28rem] overflow-y-auto pr-2">{passage}</div>
        )}
        {passageDirty && <p className="mt-2 text-[12px] text-amber-700">Passage changed (saved to all {loaded.items.length} questions).</p>}
      </section>

      {loaded.items.map((it, qi) => {
        const e = items[it.id]
        if (!e) return null
        const v = validations[it.id] ?? { errors: [], warnings: [] }
        const srv = serverErrors[it.id] ?? []
        const changed = dirtyIds.includes(it.id)
        return (
          <section key={it.id} className={`${CARD} p-5`} data-testid="draft-item">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Question {qi + 1}</h3>
              {it.subskill && <span className="text-[11px] text-gray-500">{it.subskill}</span>}
              {changed && <span className="text-[11px] font-medium text-sky-700">changed</span>}
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-3 min-w-0">
                <label className="block">
                  <span className="text-[12px] font-medium text-gray-600">Question</span>
                  <textarea className={FIELD} rows={2} value={e.prompt} onChange={ev => setItem(it.id, x => ({ ...x, prompt: ev.target.value }))} />
                </label>
                <fieldset>
                  <legend className="text-[12px] font-medium text-gray-600 mb-1">Answer choices (select the right one)</legend>
                  <div className="space-y-2">
                    {e.choices.map((c, ci) => (
                      <div key={ci} className={`flex items-start gap-2 rounded-lg p-1.5 ${e.correctIndex === ci ? 'bg-emerald-50 ring-1 ring-emerald-200' : ''}`}>
                        <label className="flex items-center gap-1.5 pt-2 shrink-0 cursor-pointer">
                          <input type="radio" name={`key-${it.id}`} checked={e.correctIndex === ci} onChange={() => setItem(it.id, x => ({ ...x, correctIndex: ci }))} aria-label={`Choice ${LETTERS[ci]} is the right answer`} />
                          <span className="w-4 text-sm font-semibold text-gray-700">{LETTERS[ci]}</span>
                        </label>
                        <textarea className={FIELD} rows={1} value={c} aria-label={`Choice ${LETTERS[ci]}`}
                          onChange={ev => setItem(it.id, x => ({ ...x, choices: x.choices.map((y, j) => j === ci ? ev.target.value : y) }))} />
                        {e.correctIndex === ci && <span className="pt-2 text-[11px] font-medium text-emerald-700 shrink-0">Right answer</span>}
                      </div>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className="text-[12px] font-medium text-gray-600">Explanation (why the right answer is right)</span>
                  <textarea className={FIELD} rows={3} value={e.explanation} onChange={ev => setItem(it.id, x => ({ ...x, explanation: ev.target.value }))} />
                </label>
                {[...v.errors, ...srv.filter(s => !v.errors.includes(s))].map((m, i) => (
                  <p key={`e${i}`} className="text-[12.5px] text-red-700 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{m}</p>
                ))}
                {v.warnings.map((m, i) => (
                  <p key={`w${i}`} className="text-[12.5px] text-amber-700 flex items-start gap-1"><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{m}</p>
                ))}
              </div>
              <QcPanel qc={it.qc} />
            </div>
          </section>
        )
      })}

      <div className={`${CARD} p-4 sticky bottom-3 z-10 space-y-3`}>
        <label className="block">
          <span className="text-[12px] font-medium text-gray-600">Note (optional): what you changed or anything odd</span>
          <input className={FIELD} value={note} onChange={e => setNote(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={save} disabled={!!busy || errorCount > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-40">
            {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save passage
          </button>
          <button type="button" onClick={skip} disabled={!!busy || status === 'edited'}
            title={status === 'edited' ? 'An edited passage cannot be skipped' : 'Set this passage aside'}
            className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-gray-300 px-4 py-2 text-sm text-gray-800 disabled:opacity-40">
            {busy === 'skip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="h-4 w-4" />}Skip passage
          </button>
          <span className="text-[12px] text-gray-500">
            {errorCount > 0 ? `${errorCount} question(s) need fixing before you can save.` : dirty ? `${dirtyIds.length} question(s) changed${passageDirty ? ', passage changed' : ''}. Unsaved edits are kept on this computer.` : 'No unsaved changes.'}
          </span>
        </div>
        {message && (
          <p className={`text-[13px] flex items-start gap-1.5 ${message.tone === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>
            {message.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}{message.text}
          </p>
        )}
      </div>
    </div>
  )
}

export function DraftsPanel() {
  const [group, setGroup] = useState<string | null>(null)
  // Keep the open passage in the URL so a reload lands back on it.
  useEffect(() => {
    try { setGroup(new URLSearchParams(window.location.search).get('passage')) } catch { /* ignore */ }
  }, [])
  const open = (g: string | null) => {
    setGroup(g)
    try {
      const u = new URL(window.location.href)
      if (g) u.searchParams.set('passage', g); else u.searchParams.delete('passage')
      window.history.replaceState(null, '', u.toString())
    } catch { /* ignore */ }
    window.scrollTo?.({ top: 0 })
  }
  return (
    <div className="space-y-4">
      {group ? <PassageEditor key={group} group={group} onBack={() => open(null)} /> : (<><Guidance /><DraftList onOpen={g => open(g)} /></>)}
    </div>
  )
}
