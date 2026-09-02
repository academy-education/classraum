'use client'

/**
 * Human item review — the two-phase sitting.
 *
 * Phase 1 shows four options and nothing else. Phase 2 reveals the
 * stimulus and the key. The reveal arrives from the server only after
 * the blind pick is recorded, so this component never holds the answer
 * while the blind question is on screen — that is deliberate and is the
 * reason the flow is two round trips instead of one.
 *
 * Every automated check in this repo has been fooled at least once, and
 * three times a person reading the same items named the defect in a
 * single pass. This is that person, wired in.
 */

import React from 'react'
import { CheckCircle2, HelpCircle, Loader2, ShieldQuestion, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQcT } from './i18n'

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'

// Matched to the admin forms elsewhere (AcademyDetailModal) rather than
// invented here, so this panel does not read as a different product.
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'
const SELECT = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm'
const FIELD = 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-transparent text-sm resize-y'
const SLOTS = ['A', 'B', 'C', 'D'] as const
type Slot = (typeof SLOTS)[number]

type Verdict = 'unique' | 'alternative' | 'broken'
type Realism = 'authentic' | 'artificial'

interface Reveal {
  stimulus: string
  prompt: string
  options: string[]
  keySlot: Slot
  wasCorrect: boolean
}

/** Pairwise reviewer agreement, as returned by the review GET. Mirrors
 *  AgreementPair in src/lib/study/item-review.ts, where the reasoning
 *  for each field lives. */
interface AgreementPair {
  a: string; b: string
  shared: number; samePick: number; bothCorrect: number; sameWrongOption: number
  pickAgreement: number | null; kappa: number | null
  verdictShared: number; verdictAgree: number
}

interface RunResult {
  runId: string
  reviewerId: string
  isMine: boolean
  drawn: number; answered: number; skipped: number
  correct: number; cantTell: number
  pct: number | null; controlPct: number | null; margin: number | null
  reviewed: number; unique: number; alternative: number; broken: number; artificial: number
  reading: 'leaks' | 'clean' | 'inconclusive' | 'not-enough'
  why: string
}

const READING_KEY: Record<string, string> = { leaks: 'leaks', clean: 'clean', inconclusive: 'inconclusive', 'not-enough': 'notEnough' }
const READING: Record<RunResult['reading'], { chip: string; label: string }> = {
  leaks:         { chip: 'bg-red-50 text-red-700 ring-red-200',           label: 'Items leak' },
  clean:         { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Clean' },
  inconclusive:  { chip: 'bg-amber-50 text-amber-700 ring-amber-200',      label: 'Promising, not proven' },
  'not-enough':  { chip: 'bg-gray-50 text-gray-600 ring-gray-200',         label: 'Not enough yet' },
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

export function ReviewPanel({ domains }: { domains: string[] }) {
  const { t } = useQcT()
  const [domain, setDomain] = React.useState(domains[0] ?? '')
  const [size, setSize] = React.useState(12)
  const [mirrorOf, setMirrorOf] = React.useState('')
  const [runId, setRunId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [itemId, setItemId] = React.useState<string | null>(null)
  const [options, setOptions] = React.useState<string[] | null>(null)
  const [reveal, setReveal] = React.useState<Reveal | null>(null)
  const [note, setNote] = React.useState('')
  const [verdict, setVerdict] = React.useState<Verdict | null>(null)
  const [realism, setRealism] = React.useState<Realism | null>(null)
  const [results, setResults] = React.useState<RunResult[]>([])
  const [agreement, setAgreement] = React.useState<AgreementPair[]>([])

  /*
   * Resume on load. Without this the panel forgot the sitting on every
   * refresh, and because the default run name carries the date, the
   * next day's Start drew a SECOND sample while the first one's
   * unanswered items were stranded — two partial runs, neither of them
   * the sample anybody actually sat.
   */
  React.useEffect(() => {
    void (async () => {
      const open = await refresh()
      if (open) { setRunId(open); await nextItem(open) }
    })()
    // Mount only, deliberately. `nextItem` is redefined every render, so
    // listing it would re-fetch the blind item on each one — and each
    // fetch is what the reviewer is looking at, so it would flicker
    // under them mid-answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Returns the reviewer's unfinished run id, if any. */
  async function refresh(): Promise<string | null> {
    try {
      const json = await authed('/api/admin/bank-qc/review')
      setResults(json.runs ?? [])
      setAgreement(json.agreement ?? [])
      return json.openRun ?? null
    } catch (e) { setError((e as Error).message); return null }
  }

  async function nextItem(rid: string) {
    setReveal(null); setVerdict(null); setRealism(null); setNote('')
    const json = await authed(`/api/admin/bank-qc/review?runId=${encodeURIComponent(rid)}&next=1`)
    if (json.done) { setItemId(null); setOptions(null); setRunId(null); await refresh(); return }
    setItemId(json.itemId); setOptions(json.options)
  }

  async function start() {
    setBusy(true); setError(null)
    try {
      const json = await authed('/api/admin/bank-qc/review', {
        method: 'POST', body: JSON.stringify({ domain, size }),
      })
      setRunId(json.runId)
      await nextItem(json.runId)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  /* Sit someone else's run item-for-item. See the mirrorOf branch in the
   * route: the normal draw is random, so two reviewers overlap only by
   * luck, and a second sitting on different items cannot answer whether
   * a score belongs to the items or to the reader. */
  async function startMirror() {
    if (!mirrorOf.trim()) return
    setBusy(true); setError(null)
    try {
      const json = await authed('/api/admin/bank-qc/review', {
        method: 'POST', body: JSON.stringify({ mirrorOf: mirrorOf.trim() }),
      })
      setRunId(json.runId)
      await nextItem(json.runId)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  async function answerBlind(pick: Slot | null) {
    if (!runId || !itemId) return
    setBusy(true); setError(null)
    try {
      const json = await authed('/api/admin/bank-qc/review', {
        method: 'PATCH', body: JSON.stringify({ runId, itemId, phase: 'blind', pick }),
      })
      setReveal(json.reveal)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  async function submitReveal() {
    if (!runId || !itemId || !verdict || !realism) return
    setBusy(true); setError(null)
    try {
      await authed('/api/admin/bank-qc/review', {
        method: 'PATCH', body: JSON.stringify({ runId, itemId, phase: 'reveal', verdict, realism, note }),
      })
      await nextItem(runId)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <div className={`${CARD} p-5 mb-6`}>
      <div className="flex items-start gap-2 mb-1">
        <ShieldQuestion className="w-[18px] h-[18px] text-gray-400 mt-px shrink-0" />
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">{t('admin.bankQc.review.title')}</h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5 max-w-2xl">
            {t('admin.bankQc.review.intro')}
          </p>
        </div>
      </div>

      {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}

      {/* ── setup ─────────────────────────────────────────────────── */}
      {!runId && (
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="min-w-[220px]">
            <label htmlFor="review-cohort" className={LABEL}>{t('admin.bankQc.review.cohort')}</label>
            <select
              id="review-cohort" value={domain} onChange={e => setDomain(e.target.value)}
              className={SELECT}
            >
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label htmlFor="review-size" className={LABEL}>{t('admin.bankQc.review.items')}</label>
            <select
              id="review-size" value={size} onChange={e => setSize(Number(e.target.value))}
              className={SELECT}
            >
              {[8, 12, 20, 24, 40].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Button onClick={start} disabled={busy || !domain}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.bankQc.review.start')}
          </Button>
          <p className="text-[11.5px] text-gray-400 basis-full">
            {t('admin.bankQc.review.startHint')}
          </p>

          {/* Second reviewer, SAME items. A fresh draw is random, so two
              readers overlap only by luck — and a second sitting on
              different items cannot tell whether a score belongs to the
              items or to the reader. */}
          <div className="basis-full border-t border-gray-100 pt-3 mt-1">
            <label htmlFor="review-mirror" className={LABEL}>
              {t('admin.bankQc.review.mirrorLabel')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="review-mirror" value={mirrorOf} onChange={e => setMirrorOf(e.target.value)}
                placeholder="choose-a-response-2026-08-05"
                className={FIELD + ' max-w-[320px]'}
              />
              <Button variant="outline" onClick={startMirror} disabled={busy || !mirrorOf.trim()}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.bankQc.review.mirrorButton')}
              </Button>
            </div>
            <p className="text-[11.5px] text-gray-400 mt-1.5">
              {t('admin.bankQc.review.mirrorHint')}
            </p>
          </div>
        </div>
      )}

      {/* ── phase 1: blind ────────────────────────────────────────── */}
      {runId && options && !reveal && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
            {t('admin.bankQc.review.blindQuestion')}
          </p>
          <div className="grid gap-2">
            {options.map((o, i) => (
              <button
                key={i} disabled={busy} onClick={() => void answerBlind(SLOTS[i])}
                className="text-left rounded-xl ring-1 ring-gray-200 hover:ring-gray-900 hover:bg-gray-50 px-4 py-3 text-[13.5px] text-gray-800 disabled:opacity-40 transition"
              >
                <span className="font-semibold text-gray-400 mr-2">{SLOTS[i]}</span>{o}
              </button>
            ))}
          </div>
          {/* ── NO ABSTAIN BUTTON. Deleted 2026-08-11. ──────────────
              There was one here, and it destroyed four consecutive
              sittings: abstention ran 0-8% before the button was
              emphasised, then 85%, 92.5%, 95% and 70%. Three separate
              rewordings — the brief twice, then the button label itself
              — each produced another unusable run.

              It was never needed. This instrument asks ONE question:
              can a person pick the key without the source, better than
              chance? The CONTROL already prices guessing at 25%. A
              reviewer forced to choose scores about 25% on items with no
              signal and above it on items that leak, so the margin over
              control survives forced choice completely intact.

              Abstention only buys the ability to separate "no signal"
              from "wrong signal", and no verdict in this project has
              ever needed that distinction. It cost four sittings and
              roughly 80 minutes of a co-founder's time and bought
              nothing.

              Historic rows keep their NULL blind_pick; item-review.ts
              and the scorers still handle them, and score-*.mjs now
              treats any abstention in a NEW run as a validity failure
              rather than a datum. */}
          <p className="mt-3 text-[11.5px] leading-relaxed text-gray-500">
            {t('admin.bankQc.review.blindHintLead')}
            <strong className="text-gray-700">{t('admin.bankQc.review.blindHintStrong')}</strong>
            {t('admin.bankQc.review.blindHintTail')}
          </p>
        </div>
      )}

      {/* ── phase 2: revealed ─────────────────────────────────────── */}
      {runId && reveal && (
        <div className="mt-5">
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 mb-3 ${
            reveal.wasCorrect ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
            {reveal.wasCorrect
              ? <><XCircle className="w-3.5 h-3.5" /> {t('admin.bankQc.review.gotItBlind')}</>
              : <><CheckCircle2 className="w-3.5 h-3.5" /> {t('admin.bankQc.review.notGuessable')}</>}
          </div>

          <p className="text-[13.5px] text-gray-900 bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
            {reveal.stimulus || <em className="text-gray-400">{t('admin.bankQc.review.noStimulus')}</em>}
          </p>
          {reveal.prompt && <p className="text-[12.5px] text-gray-500 mt-2">{reveal.prompt}</p>}

          <div className="grid gap-1.5 mt-3">
            {reveal.options.map((o, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-[13px] ring-1 ${
                SLOTS[i] === reveal.keySlot
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200 font-medium'
                  : 'text-gray-600 ring-gray-100'}`}>
                <span className="font-semibold text-gray-400 mr-2">{SLOTS[i]}</span>{o}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3">
            <Choice
              label={t('admin.bankQc.review.onlyDefensible')}
              value={verdict} onChange={setVerdict}
              options={[
                ['unique', t('admin.bankQc.review.unique')],
                ['alternative', t('admin.bankQc.review.alternative')],
                ['broken', t('admin.bankQc.review.broken')],
              ]}
            />
            <Choice
              label={t('admin.bankQc.review.realism')}
              value={realism} onChange={setRealism}
              options={[['authentic', t('admin.bankQc.review.authentic')], ['artificial', t('admin.bankQc.review.artificial')]]}
            />
            <textarea
              value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder={t('admin.bankQc.review.notePlaceholder')}
              className={FIELD}
            />
            <Button
              onClick={submitReveal} disabled={busy || !verdict || !realism}
              className="self-start"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.bankQc.review.nextItem')}
            </Button>
          </div>
        </div>
      )}

      {/* ── results ───────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">{t('admin.bankQc.review.sittings')}</p>
          <div className="grid gap-2">
            {results.map(r => (
              <div key={r.runId} className="rounded-xl ring-1 ring-gray-100 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-900">{r.runId}</span>
                  {!r.isMine && (
                    // Scores are per reviewer, never averaged across them —
                    // two people disagreeing is the signal, and a merged
                    // number would erase exactly that.
                    <span className="rounded-full px-2 py-0.5 text-[11px] ring-1 bg-gray-50 text-gray-500 ring-gray-200">
                      {t('admin.bankQc.review.anotherReviewer')}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${READING[r.reading].chip}`}>
                    {t(`admin.bankQc.review.status.${READING_KEY[r.reading]}`)}
                  </span>
                  <span className="text-[12px] text-gray-500 tabular-nums">
                    {t('admin.bankQc.review.answered', { answered: r.answered, drawn: r.drawn })}
                    {r.margin !== null && <> · blind {r.pct}% vs control {r.controlPct}% · <strong className="text-gray-900">{r.margin >= 0 ? '+' : ''}{r.margin}pts</strong></>}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-1">{r.why}</p>
                {r.reviewed > 0 && (
                  <p className="text-[12px] text-gray-500 mt-1 tabular-nums">
                    {t('admin.bankQc.review.judgedLine', { reviewed: r.reviewed, unique: r.unique, alternative: r.alternative, broken: r.broken, artificial: r.artificial })}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/*
            * Agreement between reviewers.
            *
            * Shown even when empty, because empty is the current state
            * of the evidence and hiding it would let a one-reader
            * finding read as settled. The whole repair programme rests
            * on one person scoring 55.0% blind against a 25.0% control;
            * nothing yet says that is a property of the items rather
            * than of that reader.
            */}
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">
              {t('admin.bankQc.review.agreement')}
            </p>
            {agreement.length === 0 ? (
              <p className="text-[12px] text-gray-500">
                No two reviewers have answered the same item yet, so every
                number above rests on one reader. A second sitting that
                overlaps an existing one is what turns a score into evidence.
              </p>
            ) : (
              <div className="grid gap-2">
                {agreement.map(p => (
                  <div key={`${p.a}\t${p.b}`} className="rounded-xl ring-1 ring-gray-100 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-2 text-[12px] text-gray-500 tabular-nums">
                      <span className="text-[13px] font-medium text-gray-900">
                        {p.shared} item{p.shared === 1 ? '' : 's'} in common
                      </span>
                      <span>
                        same pick {p.samePick}/{p.shared}
                        {p.pickAgreement !== null && <> ({p.pickAgreement}%)</>}
                        {p.kappa !== null && <> · kappa {p.kappa}</>}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-1">
                      {p.bothCorrect > 0 && (
                        <>Both found the key on <strong className="text-gray-900">{p.bothCorrect}</strong>. </>
                      )}
                      {p.sameWrongOption > 0 && (
                        <>
                          Both picked the same WRONG option on{' '}
                          <strong className="text-gray-900">{p.sameWrongOption}</strong> — an
                          option set pulling two readers to one place is a defect even
                          though it scores as a miss.{' '}
                        </>
                      )}
                      {p.samePick === 0 && (
                        <>They agreed on nothing, which is the result that would retire the finding rather than confirm it. </>
                      )}
                      {p.verdictShared > 0 && (
                        <>Judged the same item type {p.verdictAgree}/{p.verdictShared} the same way.</>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Choice<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T | null
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div>
      <p className="text-[12px] text-gray-600 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <Button
            key={v} size="sm" variant={value === v ? 'default' : 'outline'}
            onClick={() => onChange(v)}
          >
            {l}
          </Button>
        ))}
      </div>
    </div>
  )
}
