'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SegmentedTabs } from '@/app/mobile/study/_shared/SegmentedTabs'

function PillFilter({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <SegmentedTabs variant="pill" aria-label={label} value={value} onChange={onChange} options={options} />
    </div>
  )
}

/**
 * Standalone read-only browser for the SAT question bank (study_item_bank).
 * Lives OUTSIDE the (app) route group so it isn't blocked by the manager/
 * teacher RoleBasedAuthWrapper — the reviewer (raphael.student@gmail.com) is a
 * student. Access is enforced by the API (/api/study-item-bank) email allowlist.
 */

interface Graphic {
  type?: string | null
  svg?: string | null
  caption?: string | null
  rowLabels?: string[]
  colLabels?: string[]
  cells?: (string | number)[][]
  bars?: { label?: string; value?: number }[]
  xLabel?: string
  yLabel?: string
}
interface BankItemPayload {
  passage?: string | null
  prompt?: string
  choices?: string[]
  correct_answer?: string
  explanation?: string
  graphic?: Graphic | null
}
interface Row {
  id: string
  section: string
  domain: string
  subskill: string | null
  difficulty: string
  topic_tag: string | null
  cohort: string | null
  archived: boolean
  verified: boolean
  source: string | null
  created_at: string
  item: BankItemPayload
}

const MATH_DOMAINS = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry']
const RW_DOMAINS = ['Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions']
const LETTERS = ['A', 'B', 'C', 'D', 'E']

function diffClass(d: string) {
  if (d === 'hard') return 'bg-red-100 text-red-700'
  if (d === 'medium') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}
function sectionLabel(s: string) {
  return s === 'math' ? 'Math' : s === 'reading_writing' ? 'R&W' : s
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-gray-500">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export default function BankBrowserPage() {
  const [authState, setAuthState] = useState<'loading' | 'noauth' | 'forbidden' | 'ok'>('loading')
  const [token, setToken] = useState<string | null>(null)

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)

  const [section, setSection] = useState('')
  const [domain, setDomain] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [cohort, setCohort] = useState('v2')
  const [archived, setArchived] = useState('false')
  const [verified, setVerified] = useState('true')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const t = data.session?.access_token
      if (!t) { setAuthState('noauth'); return }
      setToken(t)
      setAuthState('ok')
    })
  }, [])

  const domainOptions = useMemo(() => {
    const base = section === 'math' ? MATH_DOMAINS : section === 'reading_writing' ? RW_DOMAINS : [...RW_DOMAINS, ...MATH_DOMAINS]
    return [{ value: '', label: 'All domains' }, ...base.map(d => ({ value: d, label: d }))]
  }, [section])

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1) }, [section, domain, difficulty, cohort, archived, verified, q])
  // Clear domain if it no longer belongs to the chosen section.
  useEffect(() => {
    if (section === 'math' && domain && !MATH_DOMAINS.includes(domain)) setDomain('')
    if (section === 'reading_writing' && domain && !RW_DOMAINS.includes(domain)) setDomain('')
  }, [section, domain])

  const fetchRows = useCallback(async (signal?: AbortSignal) => {
    if (!token) return
    setLoading(true)
    const p = new URLSearchParams()
    if (section) p.set('section', section)
    if (domain) p.set('domain', domain)
    if (difficulty) p.set('difficulty', difficulty)
    p.set('cohort', cohort)
    p.set('archived', archived)
    p.set('verified', verified)
    if (q.trim()) p.set('q', q.trim())
    p.set('page', String(page))
    p.set('pageSize', String(pageSize))
    try {
      const res = await fetch('/api/study-item-bank?' + p.toString(), {
        headers: { authorization: `Bearer ${token}` },
        signal,
      })
      if (res.status === 403) { setAuthState('forbidden'); return }
      const json = await res.json()
      setRows(json.items || [])
      setTotal(json.total || 0)
      setPageCount(json.pageCount || 1)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setRows([]); setTotal(0) }
    } finally {
      setLoading(false)
    }
  }, [token, section, domain, difficulty, cohort, archived, verified, q, page])

  useEffect(() => {
    if (authState !== 'ok') return
    const ctrl = new AbortController()
    const t = setTimeout(() => fetchRows(ctrl.signal), 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [fetchRows, authState])

  if (authState === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>
  }
  if (authState === 'noauth') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-gray-700">You need to sign in to view the question bank.</p>
        <a href="/auth" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Go to sign in</a>
      </div>
    )
  }
  if (authState === 'forbidden') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-gray-800 font-medium">Not authorized</p>
        <p className="text-sm text-gray-500">This account doesn&apos;t have access to the question bank browser.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold">SAT Question Bank</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse verified items. Filter by section, domain, and difficulty; click any row to see the full question, answer, and explanation.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <PillFilter label="Section" value={section} onChange={setSection} options={[
            { value: '', label: 'All' },
            { value: 'reading_writing', label: 'R&W' },
            { value: 'math', label: 'Math' },
          ]} />
          <Select label="Domain" value={domain} onChange={setDomain} options={domainOptions} />
          <PillFilter label="Difficulty" value={difficulty} onChange={setDifficulty} options={[
            { value: '', label: 'All' }, { value: 'hard', label: 'Hard' }, { value: 'medium', label: 'Medium' }, { value: 'easy', label: 'Easy' },
          ]} />
          <Select label="Cohort" value={cohort} onChange={setCohort} options={[
            { value: 'v2', label: 'v2 (current)' }, { value: 'legacy', label: 'Legacy (archived)' }, { value: 'all', label: 'All cohorts' },
          ]} />
          <Select label="Archived" value={archived} onChange={setArchived} options={[
            { value: 'false', label: 'Served only' }, { value: 'true', label: 'Archived only' }, { value: 'all', label: 'All' },
          ]} />
          <Select label="Verified" value={verified} onChange={setVerified} options={[
            { value: 'true', label: 'Verified' }, { value: 'false', label: 'Unverified' }, { value: 'all', label: 'All' },
          ]} />
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ minWidth: 200 }}>
            <span className="font-medium text-gray-500">Search prompt / passage</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="e.g. tangent, tardigrade, Vieta…"
              className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Result meta */}
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>{loading ? 'Loading…' : `${total.toLocaleString()} question${total === 1 ? '' : 's'}`}</span>
          <span>Page {page} of {pageCount}</span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="w-16 px-3 py-2.5">#</th>
                <th className="w-16 px-3 py-2.5">Sec</th>
                <th className="px-3 py-2.5">Domain / Subskill</th>
                <th className="w-24 px-3 py-2.5">Difficulty</th>
                <th className="px-3 py-2.5">Question</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-indigo-50/40"
                >
                  <td className="px-3 py-2.5 tabular-nums text-gray-400">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${r.section === 'math' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {sectionLabel(r.section)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-800">{r.domain}</div>
                    {r.subskill && <div className="text-xs text-gray-400">{r.subskill}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${diffClass(r.difficulty)}`}>{r.difficulty}</span>
                  </td>
                  <td className="max-w-md px-3 py-2.5 text-gray-600">
                    <div className="line-clamp-2">{r.item?.prompt || '(no prompt)'}</div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-16 text-center text-gray-400">No questions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-40"
          >← Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {pageCount}</span>
          <button
            disabled={page >= pageCount || loading}
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-40"
          >Next →</button>
        </div>
      </div>

      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function GraphicView({ g }: { g: Graphic }) {
  const t = (g.type || '').toLowerCase()
  const card = 'mb-4 rounded-lg border border-gray-200 bg-white p-3'

  if (g.svg || t === 'rawsvg') {
    return <div className={`${card} flex justify-center [&_svg]:h-auto [&_svg]:max-h-[280px] [&_svg]:w-full [&_svg]:overflow-visible`} dangerouslySetInnerHTML={{ __html: g.svg || '' }} />
  }

  if (t === 'table' || t === 'twowaytable') {
    const rows = g.rowLabels || []
    const cols = g.colLabels || []
    const cells = g.cells || []
    return (
      <div className={card}>
        {g.caption && <div className="mb-2 text-xs italic text-gray-500">{g.caption}</div>}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-50 px-3 py-1.5"></th>
                {cols.map((c, i) => <th key={i} className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left text-xs font-semibold text-gray-600">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((rl, ri) => (
                <tr key={ri}>
                  <th className="border border-gray-300 bg-gray-50 px-3 py-1.5 text-left font-medium text-gray-700">{rl}</th>
                  {(cells[ri] || []).map((cell, ci) => <td key={ci} className="border border-gray-300 px-3 py-1.5 text-right tabular-nums text-gray-800">{String(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (t === 'bar') {
    const bars = (g.bars || []).filter(b => typeof b.value === 'number')
    const max = Math.max(1, ...bars.map(b => b.value as number))
    return (
      <div className={card}>
        {g.caption && <div className="mb-2 text-xs italic text-gray-500">{g.caption}</div>}
        <div className="space-y-1.5">
          {bars.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 truncate text-right text-gray-600">{b.label}</span>
              <div className="h-4 flex-1 rounded bg-gray-100">
                <div className="h-4 rounded bg-indigo-400" style={{ width: `${((b.value as number) / max) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 tabular-nums text-gray-700">{b.value}</span>
            </div>
          ))}
        </div>
        {(g.xLabel || g.yLabel) && <div className="mt-1 text-[11px] text-gray-400">{[g.yLabel, g.xLabel].filter(Boolean).join(' vs ')}</div>}
      </div>
    )
  }

  if (g.caption) return <div className="mb-4 rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs italic text-gray-400">[{g.caption}]</div>
  return null
}

function DetailModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const it = row.item || {}
  const choices = it.choices || []
  const key = it.correct_answer
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded px-1.5 py-0.5 font-medium ${row.section === 'math' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{sectionLabel(row.section)}</span>
            <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${diffClass(row.difficulty)}`}>{row.difficulty}</span>
            <span className="text-gray-500">{row.domain}{row.subskill ? ` · ${row.subskill}` : ''}</span>
            {row.cohort && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">{row.cohort}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">✕</button>
        </div>

        {it.graphic && <GraphicView g={it.graphic} />}

        {it.passage && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[13px] leading-relaxed text-gray-700">
            {it.passage.split('\n\n').map((para, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{para}</p>)}
          </div>
        )}

        <p className="mb-3 font-medium text-gray-900">{it.prompt}</p>

        <ol className="mb-4 space-y-2">
          {choices.map((c, i) => {
            const correct = c === key
            return (
              <li key={i} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${correct ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
                <span className={`font-mono text-xs font-semibold ${correct ? 'text-emerald-700' : 'text-gray-400'}`}>{LETTERS[i]}</span>
                <span className={correct ? 'text-emerald-900' : 'text-gray-700'}>{c}</span>
                {correct && <span className="ml-auto text-xs font-medium text-emerald-600">correct</span>}
              </li>
            )
          })}
        </ol>

        {it.explanation && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Explanation</div>
            {it.explanation}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
          <span>{row.verified ? '✓ verified' : 'unverified'}</span>
          <span>·</span>
          <span>{row.archived ? 'archived' : 'served'}</span>
          {row.topic_tag && <><span>·</span><span>{row.topic_tag}</span></>}
          {row.source && <><span>·</span><span>source: {row.source}</span></>}
        </div>
      </div>
    </div>
  )
}
