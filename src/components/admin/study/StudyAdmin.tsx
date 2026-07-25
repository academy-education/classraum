'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Layers, Target, Trophy, ReceiptText, Flag, CalendarClock, Search, Inbox } from 'lucide-react'
import { useAdminFetch } from '@/components/admin/useAdminFetch'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { DashboardCard } from '@/components/admin/DashboardCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

/**
 * Study admin console — two operator surfaces:
 *   • User lookup  — search a student, see their study state (plan,
 *     credits + ledger, league, streak, activity). For support.
 *   • Reports queue — triage student-filed question reports; resolve /
 *     dismiss, and archive the offending bank item.
 *
 * All data comes from the admin-gated /api/admin/study/* routes.
 * All copy is localized under admin.studyConsole.*.
 */

type Tab = 'lookup' | 'reports'

export function StudyAdmin() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('lookup')
  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={String(t('admin.studyConsole.kicker'))}
        title={String(t('admin.studyConsole.title'))}
        description={String(t('admin.studyConsole.subtitle'))}
      />

      <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
        {(['lookup', 'reports'] as Tab[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {k === 'lookup' ? t('admin.studyConsole.tabUserLookup') : t('admin.studyConsole.tabReports')}
          </button>
        ))}
      </div>

      <div>
        {tab === 'lookup' ? <UserLookup /> : <ReportsQueue />}
      </div>
    </div>
  )
}

/* ─────────────────────────── User lookup ─────────────────────────── */

interface SearchRow { id: string; name: string | null; email: string | null; role: string }

function UserLookup() {
  const { t } = useTranslation()
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={String(t('admin.studyConsole.searchPlaceholder'))}
            className="pl-9"
          />
        </div>
        <div className="mt-2 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-100/80 overflow-hidden">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => openUser(r.id)}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm font-medium text-gray-900 truncate">{r.name || t('admin.studyConsole.noName')}</div>
              <div className="text-xs text-gray-500 truncate">{r.email}</div>
            </button>
          ))}
          {q.trim().length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">{t('admin.studyConsole.noMatches')}</div>
          )}
        </div>
      </div>

      <div>
        {loading && <div className="text-sm text-gray-400">{t('admin.studyConsole.loading')}</div>}
        {!loading && !detail && <div className="text-sm text-gray-400">{t('admin.studyConsole.pickPrompt')}</div>}
        {!loading && detail && <UserDetail data={detail} />}
      </div>
    </div>
  )
}

function money(n: unknown) { return typeof n === 'number' ? n.toLocaleString() : '—' }
function when(s: unknown) { return typeof s === 'string' ? new Date(s).toLocaleString() : '—' }

function UserDetail({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation()
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

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-semibold shadow-sm shadow-primary/20 flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-gray-900 truncate">{user?.name || t('admin.studyConsole.noName')}</div>
          <div className="text-xs text-gray-500 truncate">{user?.email} · {user?.role}</div>
        </div>
      </div>

      {/* Headline stats — same primitive as the manager dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardCard
          title={String(t('admin.studyConsole.credits'))}
          value={sub ? money(sub.creditsTotal) : '0'}
          subtitle={sub ? String(t('admin.studyConsole.creditsBreakdown', { grant: money(sub.grant_credits_remaining), bought: money(sub.purchased_credits_remaining) })) : String(t('admin.studyConsole.noSub'))}
          icon={<CreditCard className="w-5 h-5" strokeWidth={2} />}
          accent="violet"
        />
        <DashboardCard
          title={String(t('admin.studyConsole.sessions'))}
          value={String(counts.sessions)}
          icon={<Layers className="w-5 h-5" strokeWidth={2} />}
          accent="blue"
        />
        <DashboardCard
          title={String(t('admin.studyConsole.attempts'))}
          value={String(counts.attempts)}
          icon={<Target className="w-5 h-5" strokeWidth={2} />}
          accent="emerald"
        />
      </div>

      {/* Detail panels — two-up so the operator sees everything without scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={String(t('admin.studyConsole.subscription'))} icon={CreditCard}>
          {sub ? (
            <div className="text-sm text-gray-700 space-y-1">
              <div><b className="text-gray-900">{String(sub.plan)}</b> · {String(sub.status)}{sub.cancel_at_period_end ? ` · ${t('admin.studyConsole.cancelsAtPeriodEnd')}` : ''}</div>
              <div className="text-xs text-gray-500">{t('admin.studyConsole.renews', { date: when(sub.current_period_end) })}{sub.pending_plan ? ` · ${t('admin.studyConsole.pendingPlan', { plan: String(sub.pending_plan) })}` : ''}</div>
              {sub.last_payment_failure ? <div className="text-xs text-rose-600">{t('admin.studyConsole.lastPaymentFailure', { reason: String(sub.last_payment_failure) })}</div> : null}
            </div>
          ) : <Empty>{t('admin.studyConsole.noSubscription')}</Empty>}
        </Panel>

        <Panel title={String(t('admin.studyConsole.prefsStreak'))} icon={CalendarClock}>
          <div className="text-sm text-gray-700 space-y-1">
            {prefs ? <div>{t('admin.studyConsole.nickname')}: <span className="text-gray-900">{prefs.nickname || '—'}</span> · {t('admin.studyConsole.targets')}: <span className="text-gray-900">{(prefs.target_tests ?? []).join(', ') || prefs.target_test || '—'}</span></div> : <span className="text-gray-400">{t('admin.studyConsole.noPrefs')}</span>}
            {streak ? <div className="text-xs text-gray-500">{t('admin.studyConsole.bestStreak')}: {String(streak.max_streak ?? 0)} · {t('admin.studyConsole.freezes')}: {String(streak.freezes ?? 0)}</div> : null}
          </div>
        </Panel>

        <Panel title={String(t('admin.studyConsole.leaguesRecent'))} icon={Trophy}>
          {memberships.length ? (
            <ul className="text-sm text-gray-700 space-y-1">
              {memberships.map((m, i) => (
                <li key={i}>{tier(m)} · {String(m.xp_this_week ?? 0)} XP{m.final_rank ? ` · ${t('admin.studyConsole.rank', { n: String(m.final_rank) })}` : ''}{m.promotion_event ? ` · ${String(m.promotion_event)}` : ''}</li>
              ))}
            </ul>
          ) : <Empty>{t('admin.studyConsole.neverJoinedLeague')}</Empty>}
        </Panel>

        <Panel title={String(t('admin.studyConsole.questionReports'))} icon={Flag}>
          {reports.length ? (
            <ul className="text-sm text-gray-700 space-y-1">
              {reports.map((r, i) => <li key={i}>{String(r.reason)} · {String(r.status)} · <span className="text-gray-400">{when(r.created_at)}</span></li>)}
            </ul>
          ) : <Empty>{t('admin.studyConsole.noReportsFiled')}</Empty>}
        </Panel>
      </div>

      {/* Credit ledger — full width, proper table */}
      <Panel title={String(t('admin.studyConsole.creditLedger'))} icon={ReceiptText}>
        {ledger.length ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {ledger.map((l, i) => (
                  <tr key={i}>
                    <td className={`py-2 pr-3 tabular-nums font-semibold whitespace-nowrap ${(l.delta as number) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {(l.delta as number) >= 0 ? '+' : ''}{String(l.delta)}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{String(l.bucket)} · {String(l.kind)}</td>
                    <td className="py-2 text-gray-400 text-xs whitespace-nowrap text-right">{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{t('admin.studyConsole.noLedger')}</Empty>}
      </Panel>
    </div>
  )
}

// Canonical white panel — matches the manager dashboard card surface.
function Panel({ title, icon: Icon, children, className }: { title: string; icon?: typeof CreditCard; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400" strokeWidth={2} />}
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{title}</h3>
      </div>
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
  const { t } = useTranslation()
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

  const statusLabel = (s: string) => {
    switch (s) {
      case 'open': return t('admin.studyConsole.statusOpen')
      case 'reviewing': return t('admin.studyConsole.statusReviewing')
      case 'resolved': return t('admin.studyConsole.statusResolved')
      case 'dismissed': return t('admin.studyConsole.statusDismissed')
      default: return t('admin.studyConsole.reportsAll')
    }
  }

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
            {statusLabel(s)}{s !== 'all' && counts[s] != null ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {reports.length === 0 && (
        <AdminEmptyState icon={Inbox} title={String(t('admin.studyConsole.noReportsBucket'))} />
      )}

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">{r.reason}</span>
              <span className="text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 truncate">{r.reporter?.email ?? r.reporter?.name ?? t('admin.studyConsole.unknownReporter')}</span>
              <span className="ml-auto text-gray-400">{statusLabel(r.status)}</span>
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
                <Button size="sm" disabled={busy === r.id} onClick={() => act(r.id, 'resolved', false)}>{t('admin.studyConsole.resolve')}</Button>
                <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => act(r.id, 'resolved', true)}>{t('admin.studyConsole.resolveArchive')}</Button>
                <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, 'dismissed', false)}>{t('admin.studyConsole.dismiss')}</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
