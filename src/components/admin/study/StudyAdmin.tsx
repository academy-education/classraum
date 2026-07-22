'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAdminFetch } from '@/components/admin/useAdminFetch'

/**
 * Study admin console — two operator surfaces:
 *   • User lookup  — search a student, see their study state (plan,
 *     credits + ledger, league, streak, activity). For support.
 *   • Reports queue — triage student-filed question reports; resolve /
 *     dismiss, and archive the offending bank item.
 *
 * All data comes from the admin-gated /api/admin/study/* routes.
 */

type Tab = 'lookup' | 'reports'

export function StudyAdmin() {
  const [tab, setTab] = useState<Tab>('lookup')
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900">Study</h1>
      <p className="text-sm text-gray-500 mt-0.5">User lookup + question-report review.</p>

      <div className="mt-4 inline-flex rounded-lg bg-gray-100 p-0.5">
        {(['lookup', 'reports'] as Tab[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {k === 'lookup' ? 'User lookup' : 'Reports'}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'lookup' ? <UserLookup /> : <ReportsQueue />}
      </div>
    </div>
  )
}

/* ─────────────────────────── User lookup ─────────────────────────── */

interface SearchRow { id: string; name: string | null; email: string | null; role: string }

function UserLookup() {
  const adminFetch = useAdminFetch()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchRow[]>([])
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    const h = setTimeout(async () => {
      try {
        const res = await adminFetch(`/api/admin/study/user?q=${encodeURIComponent(q.trim())}`)
        const json = await res.json()
        setResults(json.results ?? [])
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(h)
  }, [q, adminFetch])

  const openUser = useCallback(async (id: string) => {
    setLoading(true); setDetail(null)
    try {
      const res = await adminFetch(`/api/admin/study/user?id=${id}`)
      setDetail(await res.json())
    } catch { setDetail(null) } finally { setLoading(false) }
  }, [adminFetch])

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-5">
      <div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search name or email…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
        />
        <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => openUser(r.id)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 truncate">{r.name || '(no name)'}</div>
              <div className="text-xs text-gray-500 truncate">{r.email}</div>
            </button>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">No matches.</div>
          )}
        </div>
      </div>

      <div>
        {loading && <div className="text-sm text-gray-400">Loading…</div>}
        {!loading && !detail && <div className="text-sm text-gray-400">Search and pick a student to see their study profile.</div>}
        {!loading && detail && <UserDetail data={detail} />}
      </div>
    </div>
  )
}

function money(n: unknown) { return typeof n === 'number' ? n.toLocaleString() : '—' }
function when(s: unknown) { return typeof s === 'string' ? new Date(s).toLocaleString() : '—' }

function UserDetail({ data }: { data: Record<string, unknown> }) {
  const user = data.user as { name?: string; email?: string; role?: string } | null
  const sub = data.subscription as Record<string, unknown> | null
  const counts = data.counts as { sessions: number; attempts: number }
  const streak = data.streak as Record<string, unknown> | null
  const ledger = (data.ledger as Array<Record<string, unknown>>) ?? []
  const memberships = (data.memberships as Array<Record<string, unknown>>) ?? []
  const reports = (data.reports as Array<Record<string, unknown>>) ?? []
  const prefs = data.prefs as { nickname?: string; target_test?: string; target_tests?: string[] } | null

  const tier = (m: Record<string, unknown>) => {
    const lg = m.league as { tier?: string } | { tier?: string }[] | null
    return (Array.isArray(lg) ? lg[0]?.tier : lg?.tier) ?? '—'
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-base font-semibold text-gray-900">{user?.name || '(no name)'}</div>
        <div className="text-xs text-gray-500">{user?.email} · {user?.role}</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Credits" value={sub ? money(sub.creditsTotal) : '0'} sub={sub ? `${money(sub.grant_credits_remaining)} grant · ${money(sub.purchased_credits_remaining)} bought` : 'no sub row'} />
        <Stat label="Sessions" value={String(counts.sessions)} />
        <Stat label="Attempts" value={String(counts.attempts)} />
      </div>

      <Section title="Subscription">
        {sub ? (
          <div className="text-sm text-gray-700 space-y-0.5">
            <div><b>{String(sub.plan)}</b> · {String(sub.status)}{sub.cancel_at_period_end ? ' · cancels at period end' : ''}</div>
            <div className="text-xs text-gray-500">Renews {when(sub.current_period_end)}{sub.pending_plan ? ` · pending → ${String(sub.pending_plan)}` : ''}</div>
            {sub.last_payment_failure ? <div className="text-xs text-rose-600">Last payment failure: {String(sub.last_payment_failure)}</div> : null}
          </div>
        ) : <Empty>No study subscription row (free / never purchased).</Empty>}
      </Section>

      <Section title="Preferences & streak">
        <div className="text-sm text-gray-700">
          {prefs ? <>Nickname: {prefs.nickname || '—'} · Targets: {(prefs.target_tests ?? []).join(', ') || prefs.target_test || '—'}</> : <span className="text-gray-400">no prefs</span>}
          {streak ? <> · Best streak: {String(streak.max_streak ?? 0)} · Freezes: {String(streak.freezes ?? 0)}</> : null}
        </div>
      </Section>

      <Section title="Leagues (recent)">
        {memberships.length ? (
          <ul className="text-sm text-gray-700 space-y-0.5">
            {memberships.map((m, i) => (
              <li key={i}>{tier(m)} · {String(m.xp_this_week ?? 0)} XP{m.final_rank ? ` · rank ${String(m.final_rank)}` : ''}{m.promotion_event ? ` · ${String(m.promotion_event)}` : ''}</li>
            ))}
          </ul>
        ) : <Empty>Never joined a league.</Empty>}
      </Section>

      <Section title="Credit ledger (last 10)">
        {ledger.length ? (
          <table className="w-full text-xs">
            <tbody>
              {ledger.map((l, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-1 tabular-nums font-medium" style={{ color: (l.delta as number) >= 0 ? '#047857' : '#be123c' }}>
                    {(l.delta as number) >= 0 ? '+' : ''}{String(l.delta)}
                  </td>
                  <td className="py-1 text-gray-600">{String(l.bucket)} · {String(l.kind)}</td>
                  <td className="py-1 text-gray-400">{when(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty>No credit ledger entries.</Empty>}
      </Section>

      <Section title="Question reports">
        {reports.length ? (
          <ul className="text-sm text-gray-700 space-y-0.5">
            {reports.map((r, i) => <li key={i}>{String(r.reason)} · {String(r.status)} · {when(r.created_at)}</li>)}
          </ul>
        ) : <Empty>No reports filed.</Empty>}
      </Section>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-900 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{title}</div>
      {children}
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-400">{children}</div>
}

/* ─────────────────────────── Reports queue ─────────────────────────── */

interface Report {
  id: string
  reason: string
  note: string | null
  status: string
  created_at: string
  question_snapshot: { prompt?: string; choices?: string[]; correct_answer?: string | null; type?: string }
  reporter: { name: string | null; email: string | null } | null
}

function ReportsQueue() {
  const adminFetch = useAdminFetch()
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState<Report[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/study/reports?status=${status}`)
      const json = await res.json()
      setReports(json.reports ?? [])
      setCounts(json.counts ?? {})
    } catch { setReports([]) }
  }, [adminFetch, status])

  useEffect(() => { void load() }, [load])

  const act = useCallback(async (id: string, next: string, archiveItem = false) => {
    setBusy(id)
    try {
      await adminFetch('/api/admin/study/reports', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: next, archiveItem }),
      })
      await load()
    } finally { setBusy(null) }
  }, [adminFetch, load])

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {['open', 'reviewing', 'resolved', 'dismissed', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium ring-1 transition-colors ${
              status === s ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'
            }`}
          >
            {s}{s !== 'all' && counts[s] != null ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {reports.length === 0 && <div className="text-sm text-gray-400">No reports in this bucket.</div>}

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">{r.reason}</span>
              <span className="text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 truncate">{r.reporter?.email ?? r.reporter?.name ?? 'unknown'}</span>
              <span className="ml-auto text-gray-400">{r.status}</span>
            </div>
            <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{r.question_snapshot?.prompt}</p>
            {Array.isArray(r.question_snapshot?.choices) && (
              <ul className="mt-1.5 text-xs text-gray-600 space-y-0.5">
                {r.question_snapshot.choices.map((c, i) => (
                  <li key={i} className={c === r.question_snapshot.correct_answer ? 'text-emerald-700 font-medium' : ''}>
                    {c === r.question_snapshot.correct_answer ? '✓ ' : '· '}{c}
                  </li>
                ))}
              </ul>
            )}
            {r.note && <p className="mt-2 text-xs text-gray-500 italic">“{r.note}”</p>}

            {r.status !== 'resolved' && r.status !== 'dismissed' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={busy === r.id} onClick={() => act(r.id, 'resolved', false)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white disabled:opacity-40">Resolve</button>
                <button disabled={busy === r.id} onClick={() => act(r.id, 'resolved', true)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 text-white disabled:opacity-40">Resolve + archive item</button>
                <button disabled={busy === r.id} onClick={() => act(r.id, 'dismissed', false)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 disabled:opacity-40">Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
