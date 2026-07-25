'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Layers, Target, Trophy, ReceiptText, Flag, CalendarClock, Search, Inbox, Download, UserRound, Settings2 } from 'lucide-react'
import { useAdminFetch } from '@/components/admin/useAdminFetch'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { DashboardCard } from '@/components/admin/DashboardCard'
import { AdminTableShell, AdminMobileRow } from '@/components/admin/AdminTableShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { getDateLocale } from '@/utils/dateUtils'
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

type Tab = 'lookup' | 'subscriptions' | 'payments' | 'reports'

const TAB_LABELS: Record<Tab, string> = {
  lookup: 'admin.studyConsole.tabUserLookup',
  subscriptions: 'admin.studyConsole.tabSubscriptions',
  payments: 'admin.studyConsole.tabPayments',
  reports: 'admin.studyConsole.tabReports',
}

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

      <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-gray-100 p-0.5">
        {(['lookup', 'subscriptions', 'payments', 'reports'] as Tab[]).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {String(t(TAB_LABELS[k]))}
          </button>
        ))}
      </div>

      <div>
        {tab === 'lookup' && <UserLookup />}
        {tab === 'subscriptions' && <SubscriptionsList />}
        {tab === 'payments' && <PaymentsList />}
        {tab === 'reports' && <ReportsQueue />}
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    setLoading(true); setDetail(null); setSelectedId(id)
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
        {!loading && detail && <UserDetail data={detail} studentId={selectedId} />}
      </div>
    </div>
  )
}

function money(n: unknown) { return typeof n === 'number' ? n.toLocaleString() : '—' }
function when(s: unknown, locale: string) { return typeof s === 'string' ? new Date(s).toLocaleString(locale) : '—' }

/** Everything the student configured in study mode (study_user_prefs). */
interface StudyPrefs {
  nickname?: string | null
  nickname_changed?: boolean | null
  grade_level?: string | null
  target_test?: string | null
  target_tests?: string[] | null
  goal_score?: number | null
  /** Per-test goals, e.g. { sat: 1500, toefl: 110 } — supersedes goal_score. */
  goal_scores?: Record<string, number> | null
  test_date?: string | null
  daily_goal_minutes?: number | null
  default_language?: string | null
  default_difficulty?: string | null
  onboarded_at?: string | null
}

/** target_tests (multi) superseded target_test (single) — read both. */
function targetTests(p: StudyPrefs | null): string[] {
  const many = p?.target_tests ?? []
  if (many.length) return many
  return p?.target_test ? [p.target_test] : []
}

/** Prefer the per-test goal map; fall back to the legacy single score. */
function goalScoreLabel(p: StudyPrefs | null): string {
  const map = p?.goal_scores
  if (map && typeof map === 'object' && Object.keys(map).length) {
    return Object.entries(map).map(([test, score]) => `${test} ${score}`).join(' · ')
  }
  return typeof p?.goal_score === 'number' ? String(p.goal_score) : '—'
}

function hasGoals(p: StudyPrefs | null): boolean {
  return !!(targetTests(p).length || p?.goal_score || p?.goal_scores || p?.test_date || p?.daily_goal_minutes)
}

/** Label/value rows — the shared shape for every grouped detail panel. */
function FieldList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-gray-100/80 -my-1.5">{children}</dl>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 text-right min-w-0 break-words">{children}</dd>
    </div>
  )
}

function UserDetail({ data, studentId }: { data: Record<string, unknown>; studentId: string | null }) {
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const user = data.user as { name?: string; email?: string; role?: string } | null
  const sub = data.subscription as Record<string, unknown> | null
  const counts = data.counts as { sessions: number; attempts: number }
  const streak = data.streak as Record<string, unknown> | null
  const ledger = (data.ledger as Array<Record<string, unknown>>) ?? []
  const memberships = (data.memberships as Array<Record<string, unknown>>) ?? []
  const reports = (data.reports as Array<Record<string, unknown>>) ?? []
  const prefs = data.prefs as StudyPrefs | null

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
              <div className="text-xs text-gray-500">{t('admin.studyConsole.renews', { date: when(sub.current_period_end, locale) })}{sub.pending_plan ? ` · ${t('admin.studyConsole.pendingPlan', { plan: String(sub.pending_plan) })}` : ''}</div>
              {sub.last_payment_failure ? <div className="text-xs text-rose-600">{t('admin.studyConsole.lastPaymentFailure', { reason: String(sub.last_payment_failure) })}</div> : null}
            </div>
          ) : <Empty>{t('admin.studyConsole.noSubscription')}</Empty>}
        </Panel>

        {/* Profile — who they are inside study mode */}
        <Panel title={String(t('admin.studyConsole.secProfile'))} icon={UserRound}>
          <FieldList>
            <Field label={String(t('admin.studyConsole.fldNickname'))}>
              {prefs?.nickname || '—'}
              {prefs?.nickname_changed && (
                <span className="ml-1.5 text-[11px] text-gray-400">({String(t('admin.studyConsole.fldNicknameLocked'))})</span>
              )}
            </Field>
            <Field label={String(t('admin.studyConsole.fldGradeLevel'))}>{prefs?.grade_level || '—'}</Field>
            <Field label={String(t('admin.studyConsole.fldRole'))}>{user?.role || '—'}</Field>
            <Field label={String(t('admin.studyConsole.fldOnboarded'))}>
              {prefs?.onboarded_at
                ? new Date(prefs.onboarded_at).toLocaleDateString(locale)
                : <span className="text-amber-600">{String(t('admin.studyConsole.notOnboarded'))}</span>}
            </Field>
          </FieldList>
        </Panel>

        {/* Goals — what they're working toward */}
        <Panel title={String(t('admin.studyConsole.secGoals'))} icon={Target}>
          {hasGoals(prefs) ? (
            <FieldList>
              <Field label={String(t('admin.studyConsole.fldTargetTests'))}>
                {targetTests(prefs).length
                  ? <span className="flex flex-wrap gap-1">
                      {targetTests(prefs).map(tt => (
                        <span key={tt} className="inline-flex items-center h-5 px-2 rounded-full bg-primary/8 text-primary text-[11px] font-semibold ring-1 ring-primary/15">{tt}</span>
                      ))}
                    </span>
                  : '—'}
              </Field>
              <Field label={String(t('admin.studyConsole.fldGoalScore'))}>{goalScoreLabel(prefs)}</Field>
              <Field label={String(t('admin.studyConsole.fldTestDate'))}>
                {prefs?.test_date ? new Date(prefs.test_date).toLocaleDateString(locale) : '—'}
              </Field>
              <Field label={String(t('admin.studyConsole.fldDailyGoal'))}>
                {typeof prefs?.daily_goal_minutes === 'number'
                  ? String(t('admin.studyConsole.fldMinutes', { n: prefs.daily_goal_minutes }))
                  : '—'}
              </Field>
            </FieldList>
          ) : <Empty>{t('admin.studyConsole.noGoals')}</Empty>}
        </Panel>

        {/* Study settings — session defaults they chose */}
        <Panel title={String(t('admin.studyConsole.secStudySetup'))} icon={Settings2}>
          <FieldList>
            <Field label={String(t('admin.studyConsole.fldLanguage'))}>{prefs?.default_language || '—'}</Field>
            <Field label={String(t('admin.studyConsole.fldDifficulty'))}>{prefs?.default_difficulty || '—'}</Field>
          </FieldList>
        </Panel>

        {/* Streak — consistency signal */}
        <Panel title={String(t('admin.studyConsole.secStreak'))} icon={CalendarClock}>
          {streak ? (
            <FieldList>
              <Field label={String(t('admin.studyConsole.fldBestStreak'))}>
                {String(t('admin.studyConsole.fldDays', { n: Number(streak.max_streak ?? 0) }))}
              </Field>
              <Field label={String(t('admin.studyConsole.fldFreezes'))}>{String(streak.freezes ?? 0)}</Field>
              <Field label={String(t('admin.studyConsole.fldProtectedDays'))}>
                {Array.isArray(streak.protected_days) ? streak.protected_days.length : 0}
              </Field>
            </FieldList>
          ) : <Empty>{t('admin.studyConsole.noStreakYet')}</Empty>}
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
              {reports.map((r, i) => <li key={i}>{String(r.reason)} · {String(r.status)} · <span className="text-gray-400">{when(r.created_at, locale)}</span></li>)}
            </ul>
          ) : <Empty>{t('admin.studyConsole.noReportsFiled')}</Empty>}
        </Panel>
      </div>

      {/* Credit ledger — full width, proper table. Only 3 short columns, so
          horizontal scroll is fine; the gutter just has to match the Panel's
          p-4 or the scroll edge reads as clipped. */}
      <Panel title={String(t('admin.studyConsole.creditLedger'))} icon={ReceiptText}>
        {ledger.length ? (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {ledger.map((l, i) => (
                  <tr key={i}>
                    <td className={`py-2 pr-3 tabular-nums font-semibold whitespace-nowrap ${(l.delta as number) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {(l.delta as number) >= 0 ? '+' : ''}{String(l.delta)}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{String(l.bucket)} · {String(l.kind)}</td>
                    <td className="py-2 text-gray-400 text-xs whitespace-nowrap text-right">{when(l.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>{t('admin.studyConsole.noLedger')}</Empty>}
      </Panel>

      {/* Payments — the PortOne income side, with refund action */}
      {studentId && <PaymentsPanel studentId={studentId} locale={locale} />}
    </div>
  )
}

interface PaymentRow {
  paymentId: string
  studentId?: string
  studentName?: string | null
  studentEmail?: string | null
  kind: string
  amountWon: number | null
  createdAt: string | null
  refunded: boolean
  refundedAt: string | null
}

// Shared payment helpers (used by the per-student panel and the global list).
function usePaymentFormatters(locale: string) {
  const { t } = useTranslation()
  const kindLabel = (kind: string) => {
    if (kind === 'study_exam_pass') return String(t('admin.studyConsole.paymentKindPass'))
    if (kind === 'study_subscription') return String(t('admin.studyConsole.paymentKindSubscription'))
    return String(t('admin.studyConsole.paymentKindPack'))
  }
  const statusMeta = (refunded: boolean) => refunded
    ? { label: String(t('admin.studyConsole.payStatusCancelled')), cls: 'bg-gray-100 text-gray-600 ring-gray-200/70' }
    : { label: String(t('admin.studyConsole.payStatusPaid')), cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' }
  const won = (n: number | null) => (typeof n === 'number' ? `₩${n.toLocaleString(locale)}` : '—')
  return { kindLabel, statusMeta, won }
}

// Student's study purchases (credit packs / exam passes) with live PortOne
// status and an operator-initiated refund. This is the study system's income
// view — money in via PortOne, refundable from here.
function PaymentsPanel({ studentId, locale }: { studentId: string; locale: string }) {
  const { t } = useTranslation()
  const adminFetch = useAdminFetch()
  const { kindLabel, statusMeta, won } = usePaymentFormatters(locale)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [grossWon, setGrossWon] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/study/payments?studentId=${studentId}`)
      const json = await res.json()
      setRows(json.payments ?? [])
      setGrossWon(json.grossWon ?? 0)
    } catch { setRows([]) } finally { setLoading(false) }
  }, [adminFetch, studentId])

  useEffect(() => { void load() }, [load])

  return (
    <Panel
      title={String(t('admin.studyConsole.payments'))}
      icon={CreditCard}
    >
      {loading ? (
        <Empty>{t('admin.studyConsole.paymentsLoading')}</Empty>
      ) : rows.length === 0 ? (
        <Empty>{t('admin.studyConsole.paymentsEmpty')}</Empty>
      ) : (
        <>
          <div className="mb-3 text-xs text-gray-500">
            {String(t('admin.studyConsole.paymentsGross'))}: <span className="font-semibold text-gray-900 tabular-nums">{won(grossWon)}</span>
          </div>
          {/* Below md the row action (refund) would sit off the right edge of a
              scrolled table, so swap to a card stack — same trade the manager
              dashboard's DataTable makes. */}
          <div className="md:hidden -mx-4 border-t border-gray-100 divide-y divide-gray-100">
            {rows.map((p) => {
              const meta = statusMeta(p.refunded)
              return (
                <AdminMobileRow
                  key={p.paymentId}
                  title={kindLabel(p.kind)}
                  badge={
                    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${meta.cls}`}>{meta.label}</span>
                  }
                  meta={[
                    { label: String(t('admin.studyConsole.colAmount')), value: <span className="tabular-nums">{won(p.amountWon)}</span> },
                    { label: String(t('admin.studyConsole.colDate')), value: p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—' },
                  ]}
                  actions={!p.refunded ? (
                    <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>
                      {String(t('admin.studyConsole.refund'))}
                    </Button>
                  ) : undefined}
                />
              )
            })}
          </div>

          <div className="hidden md:block overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => {
                  const meta = statusMeta(p.refunded)
                  return (
                    <tr key={p.paymentId}>
                      <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{kindLabel(p.kind)}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium text-gray-900 whitespace-nowrap">{won(p.amountWon)}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—'}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {!p.refunded && (
                          <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>
                            {String(t('admin.studyConsole.refund'))}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {refundTarget && (
        <RefundDialog
          payment={refundTarget}
          kindLabel={kindLabel(refundTarget.kind)}
          amountLabel={won(refundTarget.amountWon)}
          onClose={() => setRefundTarget(null)}
          onDone={() => { setRefundTarget(null); void load() }}
        />
      )}
    </Panel>
  )
}

function RefundDialog({ payment, kindLabel, amountLabel, onClose, onDone }: {
  payment: PaymentRow
  kindLabel: string
  amountLabel: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const adminFetch = useAdminFetch()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const res = await adminFetch('/api/admin/study/payments', {
        method: 'POST',
        body: JSON.stringify({ paymentId: payment.paymentId, reason: reason.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(String(t('admin.studyConsole.refundFailed', { message: json.error ?? res.status }))); return }
      onDone()
    } catch (e) {
      setError(String(t('admin.studyConsole.refundFailed', { message: (e as Error).message })))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900">{String(t('admin.studyConsole.refundTitle'))}</h3>
        <p className="mt-2 text-sm text-gray-600">
          {String(t('admin.studyConsole.refundBody', { kind: kindLabel, amount: amountLabel }))}
        </p>
        <label className="block mt-4">
          <span className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundReason'))}</span>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={String(t('admin.studyConsole.refundReasonPlaceholder'))} className="mt-1" autoFocus />
        </label>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>{String(t('admin.studyConsole.refundCancel'))}</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || reason.trim().length === 0}>
            {busy ? String(t('admin.studyConsole.refundProcessing')) : String(t('admin.studyConsole.refundConfirm'))}
          </Button>
        </div>
      </div>
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
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
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
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] mb-4">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {['open', 'reviewing', 'resolved', 'dismissed', 'all'].map(s => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}{s !== 'all' && counts[s] != null ? ` (${counts[s]})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 && (
        <AdminEmptyState icon={Inbox} title={String(t('admin.studyConsole.noReportsBucket'))} />
      )}

      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold whitespace-nowrap">{r.reason}</span>
              <span className="text-gray-400 whitespace-nowrap">{new Date(r.created_at).toLocaleString(locale)}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 truncate min-w-0">{r.reporter?.email ?? r.reporter?.name ?? t('admin.studyConsole.unknownReporter')}</span>
              <span className="ml-auto text-gray-400 whitespace-nowrap">{statusLabel(r.status)}</span>
            </div>
            <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap break-words">{r.question_snapshot?.prompt}</p>
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

/* ─────────────────────── Global subscriptions list ─────────────────────── */

interface SubListRow {
  studentId: string
  studentName: string | null
  studentEmail: string | null
  status: string
  plan: string
  priceWon: number | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  creditsTotal: number
  pendingPlan: string | null
  lastPaymentFailure: string | null
  updatedAt: string | null
}

const SUB_STATUS_OPTIONS = ['all', 'active', 'past_due', 'cancelled', 'free', 'trial']
const SUB_PLAN_OPTIONS = [
  'all', 'free_v1', 'general_v1', 'premium_v1', 'premium_plus_v1',
  'premium_3mo_v1', 'premium_6mo_v1', 'general_annual_v1', 'premium_annual_v1', 'premium_plus_annual_v1',
]

function subStatusMeta(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
    case 'past_due': return 'bg-rose-50 text-rose-700 ring-rose-200/60'
    case 'cancelled': return 'bg-gray-100 text-gray-600 ring-gray-200/70'
    case 'trial': return 'bg-violet-50 text-violet-700 ring-violet-200/60'
    default: return 'bg-gray-100 text-gray-500 ring-gray-200/70' // free
  }
}

function SubscriptionsList() {
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const adminFetch = useAdminFetch()
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<SubListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { const h = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300); return () => clearTimeout(h) }, [q])

  const query = useCallback((pg: number) => {
    const p = new URLSearchParams({ status, plan, page: String(pg) })
    if (debouncedQ) p.set('q', debouncedQ)
    return `/api/admin/study/subscriptions?${p.toString()}`
  }, [status, plan, debouncedQ])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(query(page))
      const json = await res.json()
      setRows(json.subscriptions ?? [])
      setTotal(json.total ?? 0)
    } catch { setRows([]) } finally { setLoading(false) }
  }, [adminFetch, query, page])

  useEffect(() => { void load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / 20))
  const statusLabel = (s: string) => s === 'all' ? String(t('admin.studyConsole.subAll')) : String(t(`admin.studyConsole.subStatus_${s}`))
  const when = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale) : '—')

  const exportCsv = async () => {
    // Pull every page for the current filter, then download.
    const acc: SubListRow[] = []
    for (let pg = 1; pg <= totalPages; pg++) {
      const res = await adminFetch(query(pg))
      const json = await res.json()
      acc.push(...(json.subscriptions ?? []))
    }
    const header = ['name', 'email', 'plan', 'status', 'credits', 'renews', 'priceWon']
    const lines = acc.map(r => [r.studentName ?? '', r.studentEmail ?? '', r.plan, r.status, r.creditsTotal, r.currentPeriodEnd ?? '', r.priceWon ?? ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    downloadCsv('study-subscriptions.csv', [header.join(','), ...lines].join('\n'))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={String(t('admin.studyConsole.searchPlaceholder'))} className="pl-9" />
        </div>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SUB_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={plan} onValueChange={v => { setPlan(v); setPage(1) }}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>{SUB_PLAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p === 'all' ? String(t('admin.studyConsole.subAllPlans')) : p}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="w-4 h-4 mr-1.5" />{String(t('admin.studyConsole.exportCsv'))}
        </Button>
      </div>

      <AdminTableShell
        mobile={!loading && rows.length > 0 ? rows.map((r) => (
          <AdminMobileRow
            key={r.studentId}
            title={r.studentName || String(t('admin.studyConsole.noName'))}
            subtitle={r.studentEmail}
            badge={
              <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${subStatusMeta(r.status)}`}>{statusLabel(r.status)}</span>
            }
            meta={[
              {
                label: String(t('admin.studyConsole.colPlan')),
                value: <>{r.plan}{r.pendingPlan ? ` → ${r.pendingPlan}` : ''}</>,
              },
              {
                label: String(t('admin.studyConsole.colCredits')),
                value: <span className="tabular-nums">{r.creditsTotal.toLocaleString(locale)}</span>,
              },
              {
                label: String(t('admin.studyConsole.colRenews')),
                value: (
                  <>
                    {when(r.currentPeriodEnd)}
                    {r.cancelAtPeriodEnd && <span className="ml-1.5 text-[11px] text-amber-600">{String(t('admin.studyConsole.cancelsShort'))}</span>}
                  </>
                ),
              },
            ]}
          />
        )) : undefined}
      >
        {loading ? (
          <div className="p-6 text-sm text-gray-400">{t('admin.studyConsole.loading')}</div>
        ) : rows.length === 0 ? (
          <AdminEmptyState icon={CreditCard} title={String(t('admin.studyConsole.subsEmpty'))} />
        ) : (
          <table className="w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colStudent'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colPlan'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colStatus'))}</th>
                  <th className="px-4 py-3 text-right">{String(t('admin.studyConsole.colCredits'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colRenews'))}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[220px]">{r.studentName || t('admin.studyConsole.noName')}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[220px]">{r.studentEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.plan}{r.pendingPlan ? ` → ${r.pendingPlan}` : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${subStatusMeta(r.status)}`}>{statusLabel(r.status)}</span>
                      {r.cancelAtPeriodEnd && <span className="ml-1.5 text-[11px] text-amber-600">{String(t('admin.studyConsole.cancelsShort'))}</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{r.creditsTotal.toLocaleString(locale)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{when(r.currentPeriodEnd)}</td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
      </AdminTableShell>

      {total > 20 && <Pager page={page} totalPages={totalPages} total={total} onPage={setPage} />}
    </div>
  )
}

/* ─────────────────────── Global payments list ─────────────────────── */

const PAY_KIND_OPTIONS = ['all', 'study_subscription', 'study_credit_pack', 'study_exam_pass']

function PaymentsList() {
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const adminFetch = useAdminFetch()
  const { kindLabel, statusMeta, won } = usePaymentFormatters(locale)
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [total, setTotal] = useState(0)
  const [grossWon, setGrossWon] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null)

  useEffect(() => { const h = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300); return () => clearTimeout(h) }, [q])

  const query = useCallback((pg: number) => {
    const p = new URLSearchParams({ scope: 'all', page: String(pg) })
    if (kind !== 'all') p.set('kind', kind)
    if (debouncedQ) p.set('q', debouncedQ)
    return `/api/admin/study/payments?${p.toString()}`
  }, [kind, debouncedQ])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(query(page))
      const json = await res.json()
      setRows(json.payments ?? [])
      setTotal(json.total ?? 0)
      setGrossWon(json.grossWon ?? 0)
    } catch { setRows([]) } finally { setLoading(false) }
  }, [adminFetch, query, page])

  useEffect(() => { void load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / 20))
  const kindOptLabel = (k: string) => k === 'all' ? String(t('admin.studyConsole.payAllKinds')) : kindLabel(k)

  const exportCsv = async () => {
    const acc: PaymentRow[] = []
    for (let pg = 1; pg <= totalPages; pg++) {
      const res = await adminFetch(query(pg))
      const json = await res.json()
      acc.push(...(json.payments ?? []))
    }
    const header = ['name', 'email', 'kind', 'amountWon', 'status', 'date', 'paymentId']
    const lines = acc.map(r => [r.studentName ?? '', r.studentEmail ?? '', r.kind, r.amountWon ?? '', r.refunded ? 'refunded' : 'paid', r.createdAt ?? '', r.paymentId].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    downloadCsv('study-payments.csv', [header.join(','), ...lines].join('\n'))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={String(t('admin.studyConsole.searchPlaceholder'))} className="pl-9" />
        </div>
        <Select value={kind} onValueChange={v => { setKind(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{PAY_KIND_OPTIONS.map(k => <SelectItem key={k} value={k}>{kindOptLabel(k)}</SelectItem>)}</SelectContent>
        </Select>
        <div className="text-xs text-gray-500 ml-auto">
          {String(t('admin.studyConsole.paymentsGross'))}: <span className="font-semibold text-gray-900 tabular-nums">{won(grossWon)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="w-4 h-4 mr-1.5" />{String(t('admin.studyConsole.exportCsv'))}
        </Button>
      </div>

      <AdminTableShell
        mobile={!loading && rows.length > 0 ? rows.map((p) => {
          const meta = statusMeta(p.refunded)
          return (
            <AdminMobileRow
              key={p.paymentId}
              title={p.studentName || String(t('admin.studyConsole.noName'))}
              subtitle={p.studentEmail}
              badge={
                <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${meta.cls}`}>{meta.label}</span>
              }
              meta={[
                { label: String(t('admin.studyConsole.colKind')), value: kindLabel(p.kind) },
                { label: String(t('admin.studyConsole.colAmount')), value: <span className="tabular-nums">{won(p.amountWon)}</span> },
                { label: String(t('admin.studyConsole.colDate')), value: p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—' },
              ]}
              actions={!p.refunded ? (
                <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>{String(t('admin.studyConsole.refund'))}</Button>
              ) : undefined}
            />
          )
        }) : undefined}
      >
        {loading ? (
          <div className="p-6 text-sm text-gray-400">{t('admin.studyConsole.loading')}</div>
        ) : rows.length === 0 ? (
          <AdminEmptyState icon={CreditCard} title={String(t('admin.studyConsole.paymentsEmpty'))} />
        ) : (
          <table className="w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colStudent'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colKind'))}</th>
                  <th className="px-4 py-3 text-right">{String(t('admin.studyConsole.colAmount'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colStatus'))}</th>
                  <th className="px-4 py-3 text-left">{String(t('admin.studyConsole.colDate'))}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((p) => {
                  const meta = statusMeta(p.refunded)
                  return (
                    <tr key={p.paymentId} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[220px]">{p.studentName || t('admin.studyConsole.noName')}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[220px]">{p.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{kindLabel(p.kind)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 whitespace-nowrap">{won(p.amountWon)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[11px] font-semibold ring-1 ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!p.refunded && (
                          <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>{String(t('admin.studyConsole.refund'))}</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
          </table>
        )}
      </AdminTableShell>

      {total > 20 && <Pager page={page} totalPages={totalPages} total={total} onPage={setPage} />}

      {refundTarget && (
        <RefundDialog
          payment={refundTarget}
          kindLabel={kindLabel(refundTarget.kind)}
          amountLabel={won(refundTarget.amountWon)}
          onClose={() => setRefundTarget(null)}
          onDone={() => { setRefundTarget(null); void load() }}
        />
      )}
    </div>
  )
}

/* ─────────────────────── shared: pager + csv ─────────────────────── */

function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{String(t('admin.studyConsole.pageOf', { page, totalPages, total }))}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{String(t('admin.common.previous'))}</Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>{String(t('admin.common.next'))}</Button>
      </div>
    </div>
  )
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
