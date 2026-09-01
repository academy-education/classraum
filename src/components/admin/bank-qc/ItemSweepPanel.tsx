'use client'

/**
 * The open sweep — read every SSAT/ISEE item with its key showing.
 *
 * ReviewPanel next door hides the key and measures guessability on a
 * SAMPLE. This is the other half: the whole cohort, key and rationale
 * visible, one Keep/Flag/Reject per item. It exists because the defect
 * that survives every automated gate is semantic — two defensible
 * answers, a key that is wrong, vocabulary above the grade band — and
 * none of those can be judged without seeing the answer.
 *
 * Unreviewed items stay visibly unreviewed. That is the point: the
 * denominator is the whole bank, so "we checked the questions" is a
 * number here rather than an impression.
 */

import React from 'react'
import { AlertTriangle, Check, ChevronDown, Flag, Loader2, Search, X } from 'lucide-react'

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'
const FIELD = 'px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm'

type Verdict = 'keep' | 'flag' | 'reject'

interface SweepItem {
  id: string
  family: string
  section: string
  skill: string
  difficulty: string
  cohort: string
  passageGroupId: string | null
  passage: string | null
  prompt: string
  choices: string[]
  correctAnswer: string
  explanation: string
  distractorRationales: string[]
  sha: string
}

interface SweepVerdictRow {
  itemId: string
  reviewerId: string
  mine: boolean
  verdict: Verdict
  note: string
  stale: boolean
  updatedAt: string
}

interface SweepData {
  reviewerId: string
  items: SweepItem[]
  verdicts: SweepVerdictRow[]
  totals: { items: number; reviewed: number; keep: number; flag: number; reject: number; stale: number }
  generatedAt: string
}

const VERDICT_STYLE: Record<Verdict, { on: string; rail: string; label: string; Icon: typeof Check }> = {
  keep:   { on: 'bg-emerald-600 border-emerald-600 text-white', rail: 'border-l-emerald-500', label: 'Keep',   Icon: Check },
  flag:   { on: 'bg-amber-500 border-amber-500 text-white',     rail: 'border-l-amber-500',   label: 'Flag',   Icon: Flag },
  reject: { on: 'bg-red-600 border-red-600 text-white',         rail: 'border-l-red-500',     label: 'Reject', Icon: X },
}

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
  if (!res.ok) throw new Error(json.error || `${res.status}`)
  return json
}

const LETTERS = 'ABCDEFGH'

export function ItemSweepPanel() {
  const [data, setData] = React.useState<SweepData | null>(null)
  const [err, setErr] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const [family, setFamily] = React.useState('all')
  const [section, setSection] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const [query, setQuery] = React.useState('')

  // Local echo of the caller's own verdicts so a click paints immediately
  // and the note field is not fighting a round trip on every keystroke.
  const [mine, setMine] = React.useState<Record<string, { verdict: Verdict | ''; note: string }>>({})
  const [saving, setSaving] = React.useState<Record<string, boolean>>({})
  const [rowErr, setRowErr] = React.useState<Record<string, string>>({})

  /*
   * The 40-item sample is the DEFAULT, and the full bank is opt-in.
   *
   * 982 items is five to eight hours. Forty is twenty minutes and
   * answers the question that actually gates the bank: is the defect
   * rate near zero or not. Defaulting to the whole bank makes the
   * realistic action ("do some of it") a self-selected sample, which is
   * the least representative one available and how three earlier
   * sittings came to measure the draw rather than the items.
   */
  const [sampleOnly, setSampleOnly] = React.useState(true)

  const load = React.useCallback(async (sample = true) => {
    setLoading(true); setErr('')
    try {
      const d: SweepData = await authed(
        sample ? '/api/admin/bank-qc/sweep?sample=40' : '/api/admin/bank-qc/sweep')
      setData(d)
      const m: Record<string, { verdict: Verdict | ''; note: string }> = {}
      for (const v of d.verdicts) if (v.mine) m[v.itemId] = { verdict: v.verdict, note: v.note }
      setMine(m)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  /*
   * `err` is in the guard on purpose. Without it a failed load set the
   * error, cleared `loading`, and the effect immediately re-ran and
   * fetched again — an infinite retry that rendered as a PERMANENT
   * "Loading the bank…" and never let the error appear on screen. That
   * is what a reviewer saw: the panel open, the spinner forever, and no
   * way to tell that anything had gone wrong.
   */
  React.useEffect(() => {
    if (open && !data && !loading && !err) void load(sampleOnly)
  }, [open, data, loading, err, load, sampleOnly])

  const save = async (itemId: string, verdict: Verdict | '', note: string) => {
    setSaving(s => ({ ...s, [itemId]: true }))
    setRowErr(e => ({ ...e, [itemId]: '' }))
    try {
      await authed('/api/admin/bank-qc/sweep', {
        method: 'POST',
        body: JSON.stringify({ itemId, verdict, note }),
      })
    } catch (e) {
      // The server refused — most often a flag/reject with no note. Say so
      // on the row rather than silently keeping an optimistic tick that
      // was never written.
      setRowErr(er => ({ ...er, [itemId]: e instanceof Error ? e.message : 'Not saved' }))
    } finally {
      setSaving(s => ({ ...s, [itemId]: false }))
    }
  }

  const setVerdict = (it: SweepItem, v: Verdict) => {
    const cur = mine[it.id] ?? { verdict: '' as const, note: '' }
    const next: Verdict | '' = cur.verdict === v ? '' : v
    setMine(m => ({ ...m, [it.id]: { verdict: next, note: cur.note } }))
    // A flag or reject needs its note first; saving now would just bounce.
    if (next && (next === 'flag' || next === 'reject') && !cur.note.trim()) {
      setRowErr(e => ({ ...e, [it.id]: 'Add a note, then it saves.' }))
      return
    }
    void save(it.id, next, cur.note)
  }

  const noteTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const setNote = (it: SweepItem, note: string) => {
    const cur = mine[it.id] ?? { verdict: '' as const, note: '' }
    setMine(m => ({ ...m, [it.id]: { verdict: cur.verdict, note } }))
    if (!cur.verdict) return
    clearTimeout(noteTimers.current[it.id])
    noteTimers.current[it.id] = setTimeout(() => { void save(it.id, cur.verdict, note) }, 600)
  }

  const visible = React.useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.items.filter(it => {
      if (family !== 'all' && it.family !== family) return false
      if (section !== 'all' && it.section !== section) return false
      const v = mine[it.id]?.verdict ?? ''
      if (status === 'todo' && v) return false
      if (status !== 'all' && status !== 'todo' && v !== status) return false
      if (q && !(`${it.prompt} ${it.choices.join(' ')} ${it.skill}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [data, family, section, status, query, mine])

  const tally = React.useMemo(() => {
    const t = { keep: 0, flag: 0, reject: 0 }
    for (const k of Object.keys(mine)) {
      const v = mine[k].verdict
      if (v === 'keep') t.keep++
      else if (v === 'flag') t.flag++
      else if (v === 'reject') t.reject++
    }
    return t
  }, [mine])

  const reviewed = tally.keep + tally.flag + tally.reject
  const total = data?.items.length ?? 0
  const others = React.useMemo(() => {
    const m: Record<string, SweepVerdictRow[]> = {}
    for (const v of data?.verdicts ?? []) if (!v.mine) (m[v.itemId] = m[v.itemId] || []).push(v)
    return m
  }, [data])

  return (
    <section className={`${CARD} p-5`}>
      {/*
        * The collapsed state has to READ as a control. The first version
        * was a heading with a small grey chevron, and a reviewer opened
        * the page and reported seeing nothing — the list is lazy-loaded
        * (490 items with passages is not something to fetch for every
        * admin who visits), so an unopened panel is genuinely empty.
        * Lazy loading is right; looking inert was not.
        */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left rounded-xl -m-1 p-1 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Read every question — SSAT &amp; ISEE</h2>
          <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed max-w-3xl">
            A 40-question sample with the answer showing, one Keep / Flag / Reject per item — about
            twenty minutes. This is the pass that catches what no script here can: a second
            defensible answer, a wrong key, vocabulary above the grade band. Your marks save as you
            make them, so you can stop and come back.
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-gray-700">
          {open ? 'Hide' : 'Open the list'}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="mt-4">
          {/* The sample is the default; the full bank is a deliberate choice.
              Shown rather than hidden so nobody reads 40 marks as coverage
              of 982 items. */}
          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 ring-1 ring-gray-200 px-3 py-2 mb-3">
            <p className="text-[12.5px] text-gray-600 leading-relaxed">
              {sampleOnly
                ? 'Showing a 40-question sample, drawn across all 31 authoring batches so none is missed. It answers whether there is a problem — not which batch it is in.'
                : 'Showing all 982 questions. Five to eight hours; only worth it if the sample found something.'}
            </p>
            <button
              onClick={() => { const next = !sampleOnly; setSampleOnly(next); setData(null); setErr(''); void load(next) }}
              className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[12.5px] font-medium text-gray-700 hover:bg-gray-100"
            >
              {sampleOnly ? 'Show all 982' : 'Back to the 40'}
            </button>
          </div>
          {err && (
            <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2 mb-3">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {err}
              </span>
              {/* It no longer retries itself, so there has to be a way back. */}
              <button
                onClick={() => { setErr(''); void load(sampleOnly) }}
                className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-[12.5px] font-medium hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading the bank…
            </div>
          )}

          {data && (
            <>
              {/* What a person still has to look for. The automated gates are
                  listed too, so nobody spends an afternoon re-checking them. */}
              <div className="grid gap-4 sm:grid-cols-2 bg-gray-50 rounded-xl p-4 mb-4">
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                    Already checked — skip these
                  </h3>
                  <ul className="text-[12.5px] text-gray-600 space-y-1 list-disc pl-4">
                    <li>Whether the answer is guessable from the options alone — every cohort passed a
                        blind attack where solvers saw only the choices.</li>
                    <li>Answer-letter spread, key length, duplicate option sets, reused stems.</li>
                    <li>The arithmetic in maths items — each was re-solved in a sandbox.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-gray-500 font-medium mb-1.5">
                    What only a person catches
                  </h3>
                  <ul className="text-[12.5px] text-gray-600 space-y-1 list-disc pl-4">
                    <li><strong>Two defensible answers</strong> — the most common real defect. Can you
                        argue a distractor from the passage or stem?</li>
                    <li><strong>Wrong key</strong> — solve it yourself before looking at the mark.</li>
                    <li><strong>Grade fit</strong> — these are middle-school exams.</li>
                    <li>Tone, cultural assumptions, and whether the difficulty label matches.</li>
                  </ul>
                </div>
                <div className="sm:col-span-2 text-[12.5px] text-gray-600 border-t border-gray-200 pt-3">
                  <strong className="text-gray-800">Reading works differently.</strong> Each passage exists
                  in four or five parallel versions differing on a few facts, and the one shown was picked
                  at random after the questions were frozen — that is why the answer cannot be guessed. The
                  side effect is that a wrong option is another version&rsquo;s correct answer, so an option
                  that looks <em>nearly</em> right is exactly the defect to flag. Judge it against the
                  passage on screen only.
                </div>
              </div>

              {/* Progress. Reviewed is over the whole bank, never over the filtered view. */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-3 text-sm">
                <div className="text-gray-900 font-medium tabular-nums">
                  {reviewed} <span className="text-gray-400 font-normal">/ {total} reviewed</span>
                </div>
                <div className="flex items-center gap-3 text-[12.5px] tabular-nums">
                  <span className="text-emerald-700">{tally.keep} keep</span>
                  <span className="text-amber-700">{tally.flag} flag</span>
                  <span className="text-red-700">{tally.reject} reject</span>
                  {data.totals.stale > 0 && (
                    <span className="text-violet-700">{data.totals.stale} need re-reading (item edited since)</span>
                  )}
                </div>
                <div className="flex-1 min-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all"
                       style={{ width: `${total ? (100 * reviewed) / total : 0}%` }} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <select className={FIELD} value={family} onChange={e => setFamily(e.target.value)} aria-label="Test">
                  <option value="all">Both tests</option>
                  <option value="ssat">SSAT</option>
                  <option value="isee">ISEE</option>
                </select>
                <select className={FIELD} value={section} onChange={e => setSection(e.target.value)} aria-label="Section">
                  <option value="all">All sections</option>
                  <option value="verbal">Verbal</option>
                  <option value="math">Math</option>
                  <option value="reading">Reading</option>
                </select>
                <select className={FIELD} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
                  <option value="all">Any status</option>
                  <option value="todo">Not yet reviewed</option>
                  <option value="keep">Kept</option>
                  <option value="flag">Flagged</option>
                  <option value="reject">Rejected</option>
                </select>
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className={`${FIELD} w-full pl-9`}
                    placeholder="Search question, options, skill…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    aria-label="Search items"
                  />
                </div>
              </div>

              <p className="text-[12px] text-gray-400 mb-2 tabular-nums">{visible.length} shown</p>

              <div className="space-y-3">
                {visible.map((it, idx) => {
                  const prev = idx > 0 ? visible[idx - 1] : null
                  const newPassage = !!it.passage && it.passageGroupId !== prev?.passageGroupId
                  const rec = mine[it.id] ?? { verdict: '' as const, note: '' }
                  const rail = rec.verdict ? VERDICT_STYLE[rec.verdict].rail : 'border-l-gray-200'
                  return (
                    <React.Fragment key={it.id}>
                      {newPassage && (
                        <div className="bg-gray-50 ring-1 ring-gray-200 rounded-xl p-4">
                          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Passage</div>
                          {it.passage!.split(/\n\s*\n/).filter(Boolean).map((p, i) => (
                            <p key={i} className="text-[15px] leading-relaxed text-gray-800 mb-2 last:mb-0 max-w-3xl">{p}</p>
                          ))}
                        </div>
                      )}
                      <article className={`ring-1 ring-gray-100 rounded-xl border-l-4 ${rail} p-4`}>
                        <div className="flex flex-wrap gap-1.5 mb-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {it.family.toUpperCase()} · {it.section}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{it.difficulty}</span>
                          {it.skill && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">{it.skill}</span>}
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-400">{it.cohort}</span>
                        </div>

                        <p className="text-[14.5px] text-gray-900 mb-2.5 max-w-3xl">{it.prompt}</p>

                        {/*
                          * Free-response items (SSAT Writing Sample, ISEE
                          * Essay) have no options and no key. Rendering the
                          * normal empty <ol> made them look like a broken
                          * multiple-choice item; they are a different kind
                          * of item and say so.
                          */}
                        {it.choices.length === 0 ? (
                          <p className="text-[13px] text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mb-3">
                            Free response — no options and no answer key. Judge the prompt
                            itself: is it answerable in the time allowed, two-sided enough
                            to argue either way, and free of knowledge a 13-year-old may
                            not have?
                          </p>
                        ) : (
                        <ol className="space-y-1 mb-3">
                          {it.choices.map((c, i) => {
                            const isKey = c.trim() === it.correctAnswer.trim()
                            return (
                              <li key={i} className={`flex gap-2.5 text-[14px] rounded-lg px-3 py-1.5 ring-1 ${
                                isKey ? 'bg-emerald-50 ring-emerald-300 text-gray-900' : 'ring-gray-100 text-gray-700'}`}>
                                <span className={`font-mono text-[12px] pt-0.5 shrink-0 ${isKey ? 'text-emerald-700 font-semibold' : 'text-gray-400'}`}>
                                  {LETTERS[i]}{isKey ? ' ✓' : ''}
                                </span>
                                <span>{c}</span>
                              </li>
                            )
                          })}
                        </ol>
                        )}

                        {(it.explanation || it.distractorRationales.length > 0) && (
                          <div className="text-[12.5px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
                            <strong className="text-gray-800">Why the key is the key.</strong> {it.explanation}
                            {it.distractorRationales.length > 0 && (
                              <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                                {it.distractorRationales.map((d, i) => <li key={i}>{d}</li>)}
                              </ul>
                            )}
                          </div>
                        )}

                        {others[it.id]?.length > 0 && (
                          <p className="text-[12px] text-violet-700 mb-2">
                            Another reviewer marked this {others[it.id].map(o => o.verdict).join(', ')}.
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                          {(['keep', 'flag', 'reject'] as Verdict[]).map(v => {
                            const st = VERDICT_STYLE[v]
                            const on = rec.verdict === v
                            return (
                              <button
                                key={v}
                                onClick={() => setVerdict(it, v)}
                                aria-pressed={on}
                                className={`inline-flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg border transition-colors ${
                                  on ? st.on : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                              >
                                <st.Icon className="w-3.5 h-3.5" /> {st.label}
                              </button>
                            )
                          })}
                          <input
                            className={`${FIELD} flex-1 min-w-[180px]`}
                            placeholder="Note — what is wrong, or what to change"
                            value={rec.note}
                            onChange={e => setNote(it, e.target.value)}
                            aria-label="Reviewer note"
                          />
                          {saving[it.id] && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        </div>
                        {rowErr[it.id] && <p className="text-[12px] text-red-600 mt-1.5">{rowErr[it.id]}</p>}
                      </article>
                    </React.Fragment>
                  )
                })}
                {visible.length === 0 && (
                  <p className="text-sm text-gray-400 py-8 text-center">No items match these filters.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
