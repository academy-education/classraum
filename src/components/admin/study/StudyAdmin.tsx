'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CreditCard, Layers, Target, Trophy, ReceiptText, Flag, CalendarClock, Search, Inbox, Download, UserRound, Settings2 } from 'lucide-react'
import { useAdminFetch } from '@/components/admin/useAdminFetch'
import { filterSortStudyUsers, type DirectoryUser } from '@/lib/study/admin-user-search'
import { accessRevocationFor } from '@/lib/study/refund-revocation'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { DashboardCard } from '@/components/admin/DashboardCard'
import { AdminMobileRow } from '@/components/admin/AdminTableShell'
import { Card } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/dashboard'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { getDateLocale } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'
import { initialsFromName } from '@/lib/name'

/**
 * Study admin console — two operator surfaces:
 *   • User lookup  — search a student, see their study state (plan,
 *     credits + ledger, league, streak, activity). For support.
 *   • Reports queue — triage student-filed question reports; resolve /
 *     dismiss, and archive the offending bank item.
 *
 * All data comes from the admin-gated /api/admin/study/* routes.
 * All copy is localized under admin.studyConsole.*.
 *
 * Presentation follows the academy dashboard idioms (classrooms-page /
 * assignments-page / camp): Card shells, the shared DataTable, StatusPill
 * chips, ModalShell dialogs, skeleton loading, EmptyState empties.
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

      {/* View tabs — the underline idiom shared by the camp/payments pages. */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {(['lookup', 'subscriptions', 'payments', 'reports'] as Tab[]).map(k => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                tab === k
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {String(t(TAB_LABELS[k]))}
            </button>
          ))}
        </nav>
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

/** Small "TEST" pill shown wherever a flagged user appears. */
function TestBadge() {
  const { t } = useTranslation()
  return (
    <StatusPill tone="amber" className="h-4 px-1.5 font-bold uppercase tracking-wide flex-shrink-0">
      {String(t('admin.studyConsole.testBadge'))}
    </StatusPill>
  )
}

/** How many directory rows to render per "load more" click — filtering is
 *  over ALL users, this only caps the DOM. */
const LOOKUP_RENDER_CAP = 100

/** All / Test / Real dropdown shared by the lookup + subscriptions tabs.
 *  'real' is the default everywhere: day-to-day operating views should not
 *  be polluted by flagged test accounts. */
type TestFilter = 'all' | 'test' | 'real'
const TEST_FILTER_OPTIONS: TestFilter[] = ['all', 'test', 'real']

function TestFilterSelect({ value, onChange, className }: {
  value: TestFilter
  onChange: (v: TestFilter) => void
  className?: string
}) {
  const { t } = useTranslation()
  const label = (v: TestFilter) => String(t(
    v === 'all' ? 'admin.studyConsole.testFilterAll'
      : v === 'test' ? 'admin.studyConsole.testFilterTest'
      : 'admin.studyConsole.testFilterReal'
  ))
  return (
    <Select value={value} onValueChange={v => onChange(v as TestFilter)}>
      <SelectTrigger className={className ?? 'w-[150px]'}><SelectValue /></SelectTrigger>
      <SelectContent>
        {TEST_FILTER_OPTIONS.map(v => <SelectItem key={v} value={v}>{label(v)}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function UserLookup() {
  const { t } = useTranslation()
  const adminFetch = useAdminFetch()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [all, setAll] = useState<DirectoryUser[]>([])
  const [dirLoading, setDirLoading] = useState(true)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testFilter, setTestFilter] = useState<TestFilter>('real')
  const [visibleCount, setVisibleCount] = useState(LOOKUP_RENDER_CAP)

  // The full directory loads once; the search bar filters + ranks in memory.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await adminFetch('/api/admin/study/user?list=all')
        const json = await res.json()
        if (!cancelled) setAll(json.users ?? [])
      } catch { if (!cancelled) setAll([]) }
      finally { if (!cancelled) setDirLoading(false) }
    })()
    return () => { cancelled = true }
  }, [adminFetch])

  useEffect(() => { const h = setTimeout(() => setDebouncedQ(q), 150); return () => clearTimeout(h) }, [q])

  // Changing the query or the test filter re-collapses the list — "load
  // more" progress is per result set, not global.
  useEffect(() => { setVisibleCount(LOOKUP_RENDER_CAP) }, [debouncedQ, testFilter])

  const pool = useMemo(
    () => testFilter === 'all' ? all : all.filter(u => u.isTestUser === (testFilter === 'test')),
    [all, testFilter]
  )
  const filtered = useMemo(() => filterSortStudyUsers(pool, debouncedQ), [pool, debouncedQ])
  const visible = filtered.slice(0, visibleCount)

  const openUser = useCallback(async (id: string) => {
    setLoading(true); setDetail(null); setSelectedId(id)
    try {
      const res = await adminFetch(`/api/admin/study/user?id=${id}`)
      setDetail(await res.json())
    } catch { setDetail(null) } finally { setLoading(false) }
  }, [adminFetch])

  // Toggle the TEST flag for the currently open user; keeps the directory
  // list and the open detail in sync without a full reload.
  const toggleTest = useCallback(async (studentId: string, next: boolean) => {
    const res = await adminFetch('/api/admin/study/user', {
      method: 'PATCH',
      body: JSON.stringify({ studentId, isTestUser: next }),
    })
    if (!res.ok) return
    setAll(prev => prev.map(u => (u.id === studentId ? { ...u, isTestUser: next } : u)))
    setDetail(prev => (prev ? { ...prev, isTestUser: next } : prev))
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
        <div className="mt-1.5">
          <TestFilterSelect value={testFilter} onChange={setTestFilter} className="w-full" />
        </div>
        <div className="mt-1.5 px-1 text-[11px] text-gray-400">
          {dirLoading
            ? String(t('admin.studyConsole.loading'))
            : String(t('admin.studyConsole.lookupShowing', { shown: visible.length, total: filtered.length }))}
        </div>
        <div className="mt-1.5 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-100/80 overflow-hidden max-h-[70vh] overflow-y-auto">
          {dirLoading && Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="px-3 py-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-44" />
            </div>
          ))}
          {!dirLoading && visible.map(r => (
            <button
              key={r.id}
              onClick={() => openUser(r.id)}
              className={`block w-full text-left px-3 py-2 hover:bg-gray-50 ${r.id === selectedId ? 'bg-gray-50' : ''}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">{r.name || t('admin.studyConsole.noName')}</span>
                {r.nickname && <span className="text-xs text-gray-400 truncate">@{r.nickname}</span>}
                {r.isTestUser && <TestBadge />}
              </div>
              <div className="text-xs text-gray-500 truncate">{r.email}</div>
            </button>
          ))}
          {!dirLoading && filtered.length === 0 && (
            <EmptyState icon={Search} title={String(t('admin.studyConsole.noMatches'))} size="sm" variant="subtle" />
          )}
          {filtered.length > visible.length && (
            <button
              onClick={() => setVisibleCount(c => c + LOOKUP_RENDER_CAP)}
              className="block w-full px-3 py-2.5 text-center text-xs font-medium text-primary hover:bg-gray-50"
            >
              {String(t('admin.studyConsole.loadMore', { remaining: filtered.length - visible.length }))}
            </button>
          )}
        </div>
      </div>

      <div>
        {loading && (
          <div className="space-y-5">
            {/* Identity + panel skeletons, matching the loaded layout */}
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <div className="h-5 bg-gray-200 rounded w-40 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-56" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5 gap-0 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4 gap-0 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-28 mb-4" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </Card>
              ))}
            </div>
          </div>
        )}
        {!loading && !detail && (
          <Card className="gap-0">
            <EmptyState icon={UserRound} title={String(t('admin.studyConsole.pickPrompt'))} variant="subtle" />
          </Card>
        )}
        {!loading && detail && <UserDetail data={detail} studentId={selectedId} onToggleTest={toggleTest} />}
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

function UserDetail({ data, studentId, onToggleTest }: {
  data: Record<string, unknown>
  studentId: string | null
  onToggleTest: (studentId: string, next: boolean) => Promise<void>
}) {
  const { t, language } = useTranslation()
  const [flagBusy, setFlagBusy] = useState(false)
  const isTestUser = !!data.isTestUser
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

  const initial = initialsFromName(user?.name || user?.email) || '?'

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary flex items-center justify-center text-white font-semibold shadow-sm shadow-primary/20 flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-semibold text-gray-900 truncate">{user?.name || t('admin.studyConsole.noName')}</span>
            {isTestUser && <TestBadge />}
          </div>
          <div className="text-xs text-gray-500 truncate">{user?.email} · {user?.role}</div>
        </div>
        {studentId && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto flex-shrink-0"
            disabled={flagBusy}
            onClick={async () => {
              setFlagBusy(true)
              try { await onToggleTest(studentId, !isTestUser) } finally { setFlagBusy(false) }
            }}
          >
            {String(t(isTestUser ? 'admin.studyConsole.unmarkTest' : 'admin.studyConsole.markTest'))}
          </Button>
        )}
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
                        <StatusPill key={tt} tone="primary" className="h-5 text-[11px]">{tt}</StatusPill>
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

interface RefundRecord {
  id: string
  amountWon: number
  reason: string | null
  createdAt: string
}

/** Server-computed "refund unused credits" preset; null when the payment's
 *  credit grant could not be attributed unambiguously (no guessing). */
interface CreditPreset {
  grantedCredits: number
  unusedCredits: number
  presetWon: number
}

interface PaymentRow {
  paymentId: string
  studentId?: string
  studentName?: string | null
  studentEmail?: string | null
  isTestUser?: boolean
  kind: string
  amountWon: number | null
  createdAt: string | null
  refunded: boolean
  refundedAt: string | null
  refundedWon: number
  remainingWon: number
  refunds: RefundRecord[]
  creditPreset: CreditPreset | null
}

// A payment stays refundable while anything remains.
function isRefundable(p: PaymentRow) { return !p.refunded && p.remainingWon > 0 }

// Shared payment helpers (used by the per-student panel and the global list).
function usePaymentFormatters(locale: string) {
  const { t } = useTranslation()
  const kindLabel = (kind: string) => {
    if (kind === 'study_exam_pass') return String(t('admin.studyConsole.paymentKindPass'))
    if (kind === 'study_subscription') return String(t('admin.studyConsole.paymentKindSubscription'))
    return String(t('admin.studyConsole.paymentKindPack'))
  }
  const statusMeta = (p: PaymentRow): { label: string; tone: StatusPillTone } => {
    if (p.refunded) return { label: String(t('admin.studyConsole.payStatusCancelled')), tone: 'gray' }
    if (p.refundedWon > 0) return { label: String(t('admin.studyConsole.payStatusPartial')), tone: 'amber' }
    return { label: String(t('admin.studyConsole.payStatusPaid')), tone: 'emerald' }
  }
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
        <div className="animate-pulse space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 bg-gray-200 rounded w-28" />
              <div className="h-4 bg-gray-100 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded flex-1" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CreditCard} title={String(t('admin.studyConsole.paymentsEmpty'))} size="sm" variant="subtle" />
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
              const meta = statusMeta(p)
              return (
                <AdminMobileRow
                  key={p.paymentId}
                  title={kindLabel(p.kind)}
                  badge={
                    <StatusPill tone={meta.tone} className="h-5 text-[11px]">{meta.label}</StatusPill>
                  }
                  meta={[
                    { label: String(t('admin.studyConsole.colAmount')), value: <span className="tabular-nums">{won(p.amountWon)}</span> },
                    { label: String(t('admin.studyConsole.colDate')), value: p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—' },
                  ]}
                  actions={isRefundable(p) ? (
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
                  const meta = statusMeta(p)
                  return (
                    <tr key={p.paymentId}>
                      <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{kindLabel(p.kind)}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium text-gray-900 whitespace-nowrap">{won(p.amountWon)}</td>
                      <td className="py-2 pr-3">
                        <StatusPill tone={meta.tone} className="h-5 text-[11px]">{meta.label}</StatusPill>
                      </td>
                      <td className="py-2 pr-3 text-gray-400 text-xs whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—'}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {isRefundable(p) && (
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
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const adminFetch = useAdminFetch()
  const remaining = payment.remainingWon
  const [amountStr, setAmountStr] = useState(String(remaining))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revokeCredits, setRevokeCredits] = useState(false)
  const [revokeAccess, setRevokeAccess] = useState(false)

  const wonFmt = (n: number) => `₩${n.toLocaleString(locale)}`
  const amount = /^\d+$/.test(amountStr.trim()) ? parseInt(amountStr.trim(), 10) : NaN
  const amountValid = Number.isInteger(amount) && amount > 0 && amount <= remaining

  // Revocation options — same rules the server enforces (refund-revocation.ts):
  // credits only when the server attributed the grant unambiguously (the
  // creditPreset doubles as that signal), access only for pass/plan payments
  // and only when THIS refund returns the entire remaining balance.
  const creditsAttributed = payment.creditPreset !== null
  const accessKind = accessRevocationFor(payment.kind)
  const fullRefundSelected = amountValid && amount === remaining
  const creditsChecked = revokeCredits && creditsAttributed
  const accessChecked = revokeAccess && accessKind !== null && fullRefundSelected
  const revokableCount = payment.creditPreset?.unusedCredits ?? 0

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const res = await adminFetch('/api/admin/study/payments', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: payment.paymentId,
          reason: reason.trim(),
          amountWon: amount,
          revokeCredits: creditsChecked,
          revokeAccess: accessChecked,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(String(t('admin.studyConsole.refundFailed', { message: json.error ?? res.status }))); return }
      onDone()
    } catch (e) {
      setError(String(t('admin.studyConsole.refundFailed', { message: (e as Error).message })))
    } finally { setBusy(false) }
  }

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      size="md"
      title={String(t('admin.studyConsole.refundTitle'))}
      closeDisabled={busy}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose} disabled={busy}>{String(t('admin.studyConsole.refundCancel'))}</Button>
          <Button variant="destructive" onClick={submit} disabled={busy || reason.trim().length === 0 || !amountValid}>
            {busy ? String(t('admin.studyConsole.refundProcessing')) : String(t('admin.studyConsole.refundConfirm'))}
          </Button>
        </ModalShell.Footer>
      }
    >
      <div>
        <p className="text-sm text-gray-600">
          {String(t('admin.studyConsole.refundBody', { kind: kindLabel, amount: amountLabel }))}
        </p>

        {/* Remaining refundable — the number the amount is validated against. */}
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundRemaining'))}</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">{wonFmt(remaining)}</span>
        </div>

        {/* Prior refunds on this payment. */}
        {payment.refunds.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundHistory'))}</div>
            <ul className="mt-1 divide-y divide-gray-100 rounded-lg ring-1 ring-gray-100/80 overflow-hidden">
              {payment.refunds.map(r => (
                <li key={r.id} className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-600 truncate">{r.reason || '—'}</span>
                  <span className="text-gray-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                  <span className="font-semibold text-rose-700 tabular-nums whitespace-nowrap">−{wonFmt(r.amountWon)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* "Refund unused credits" preset — server-attributed; the button
            only fills the amount field, so the result passes through exactly
            the same remaining-amount validation as a typed value. */}
        {payment.creditPreset ? (
          <div className="mt-3 rounded-lg ring-1 ring-gray-100/80 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600">
                {String(t('admin.studyConsole.refundPresetMath', {
                  amount: wonFmt(payment.amountWon ?? 0),
                  unused: payment.creditPreset.unusedCredits,
                  granted: payment.creditPreset.grantedCredits,
                  result: wonFmt(payment.creditPreset.presetWon),
                }))}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || payment.creditPreset.presetWon <= 0}
                onClick={() => setAmountStr(String(payment.creditPreset!.presetWon))}
              >
                {String(t('admin.studyConsole.refundPresetButton'))}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-gray-400">{String(t('admin.studyConsole.refundPresetUnavailable'))}</p>
        )}

        <label className="block mt-4">
          <span className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundAmountLabel'))}</span>
          <Input
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
            inputMode="numeric"
            className="mt-1 tabular-nums"
            autoFocus
          />
          {!amountValid && amountStr.trim() !== '' && (
            <span className="mt-1 block text-xs text-rose-600">{String(t('admin.studyConsole.refundAmountInvalid', { remaining: wonFmt(remaining) }))}</span>
          )}
        </label>
        <label className="block mt-3">
          <span className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundReason'))}</span>
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={String(t('admin.studyConsole.refundReasonPlaceholder'))} className="mt-1" />
        </label>

        {/* Revocation options — what this refund ALSO takes back. Mirrors
            the server rules; the server re-validates both regardless. */}
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500">{String(t('admin.studyConsole.refundRevokeHeading'))}</div>
          <div className="mt-1.5 space-y-2">
            <label className={`flex items-start gap-2 ${creditsAttributed ? 'cursor-pointer' : 'opacity-60'}`}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={creditsChecked}
                disabled={busy || !creditsAttributed}
                onChange={e => setRevokeCredits(e.target.checked)}
              />
              <span className="text-xs text-gray-700">
                {String(t('admin.studyConsole.refundRevokeCredits', { n: revokableCount }))}
                {!creditsAttributed && (
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {String(t('admin.studyConsole.refundRevokeCreditsUnavailable'))}
                  </span>
                )}
              </span>
            </label>
            {accessKind && (
              <label className={`flex items-start gap-2 ${fullRefundSelected ? 'cursor-pointer' : 'opacity-60'}`}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={accessChecked}
                  disabled={busy || !fullRefundSelected}
                  onChange={e => setRevokeAccess(e.target.checked)}
                />
                <span className="text-xs text-gray-700">
                  {String(t(accessKind === 'pass'
                    ? 'admin.studyConsole.refundRevokeAccessPass'
                    : 'admin.studyConsole.refundRevokeAccessPlan'))}
                  {!fullRefundSelected && (
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      {String(t('admin.studyConsole.refundRevokeAccessNeedsFull'))}
                    </span>
                  )}
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Plain-language statement of everything this action will do. */}
        {amountValid && (
          <div className="mt-4 rounded-lg bg-amber-50/70 ring-1 ring-amber-200/60 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              {String(t('admin.studyConsole.refundSummaryHeading'))}
            </div>
            <ul className="mt-1 text-xs text-amber-900 space-y-0.5 list-disc pl-4">
              <li>{String(t('admin.studyConsole.refundSummaryRefund', { amount: wonFmt(amount) }))}</li>
              {creditsChecked && (
                <li>{String(t('admin.studyConsole.refundSummaryCredits', { n: revokableCount }))}</li>
              )}
              {accessChecked && (
                <li>{String(t(accessKind === 'pass'
                  ? 'admin.studyConsole.refundSummaryAccessPass'
                  : 'admin.studyConsole.refundSummaryAccessPlan'))}</li>
              )}
            </ul>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>
    </ModalShell>
  )
}

// Canonical white panel — the shared dashboard Card shell with the admin
// section-header treatment inside.
function Panel({ title, icon: Icon, children, className }: { title: string; icon?: typeof CreditCard; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('p-4 gap-0', className)}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400" strokeWidth={2} />}
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{title}</h3>
      </div>
      {children}
    </Card>
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
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/study/reports?status=${status}`)
      const json = await res.json()
      setReports(json.reports ?? [])
      setCounts(json.counts ?? {})
    } catch { setReports([]) }
    finally { setLoading(false) }
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

  // Capitalized at the render layer (the locale strings stay lowercase and
  // the data is never mutated). No-op for Korean, which has no case.
  const statusLabel = (s: string) => {
    const label = (() => {
      switch (s) {
        case 'open': return String(t('admin.studyConsole.statusOpen'))
        case 'reviewing': return String(t('admin.studyConsole.statusReviewing'))
        case 'resolved': return String(t('admin.studyConsole.statusResolved'))
        case 'dismissed': return String(t('admin.studyConsole.statusDismissed'))
        default: return String(t('admin.studyConsole.reportsAll'))
      }
    })()
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  return (
    <div>
      <Card className="p-4 gap-0 mb-4">
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
      </Card>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 gap-0 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 bg-gray-200 rounded-full w-20" />
                <div className="h-4 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {!loading && reports.length === 0 && (
        <Card className="gap-0">
          <EmptyState icon={Inbox} title={String(t('admin.studyConsole.noReportsBucket'))} variant="subtle" />
        </Card>
      )}

      <div className="space-y-3">
        {!loading && reports.map(r => (
          <Card key={r.id} className="p-4 gap-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusPill tone="rose" className="whitespace-nowrap">{r.reason}</StatusPill>
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
          </Card>
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
  isTestUser: boolean
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

/** Must list every value study_subscriptions_status_check allows, or a real
 *  subscription becomes both unfilterable and untranslatable — `expired`
 *  existed in the DB while missing from here AND from both locale files, so
 *  the console rendered the raw key `admin.studyConsole.subStatus_expired`.
 *  A test pins this to the constraint. */
const SUB_STATUS_OPTIONS = ['all', 'active', 'past_due', 'cancelled', 'free', 'trial', 'expired']
const SUB_PLAN_OPTIONS = [
  'all', 'free_v1', 'general_v1', 'premium_v1', 'premium_plus_v1',
  'premium_3mo_v1', 'premium_6mo_v1', 'general_annual_v1', 'premium_annual_v1', 'premium_plus_annual_v1',
]

function subStatusTone(status: string): StatusPillTone {
  switch (status) {
    case 'active': return 'emerald'
    case 'past_due': return 'rose'
    case 'cancelled': return 'gray'
    case 'trial': return 'violet'
    // Lapsed at period end. Distinct from `free`, which never paid, and from
    // `cancelled`, which was cancelled deliberately — sharing the free grey
    // made a churned payer indistinguishable from someone who never bought.
    case 'expired': return 'amber'
    default: return 'gray' // free
  }
}

function SubscriptionsList() {
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const adminFetch = useAdminFetch()
  const [status, setStatus] = useState('all')
  const [plan, setPlan] = useState('all')
  // Default REAL: test accounts stay out of the operating view unless asked for.
  const [test, setTest] = useState<TestFilter>('real')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<SubListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [flagBusy, setFlagBusy] = useState<string | null>(null)

  useEffect(() => { const h = setTimeout(() => { setDebouncedQ(q); setPage(1) }, 300); return () => clearTimeout(h) }, [q])

  // Mark/unmark a student as a TEST USER straight from the list.
  const toggleTest = useCallback(async (r: SubListRow) => {
    setFlagBusy(r.studentId)
    try {
      const res = await adminFetch('/api/admin/study/user', {
        method: 'PATCH',
        body: JSON.stringify({ studentId: r.studentId, isTestUser: !r.isTestUser }),
      })
      if (res.ok) {
        setRows(prev => prev.map(x => (x.studentId === r.studentId ? { ...x, isTestUser: !r.isTestUser } : x)))
      }
    } finally { setFlagBusy(null) }
  }, [adminFetch])

  const query = useCallback((pg: number) => {
    const p = new URLSearchParams({ status, plan, test, page: String(pg) })
    if (debouncedQ) p.set('q', debouncedQ)
    return `/api/admin/study/subscriptions?${p.toString()}`
  }, [status, plan, test, debouncedQ])

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

  const flagButton = (r: SubListRow) => (
    <Button size="sm" variant="outline" disabled={flagBusy === r.studentId} onClick={() => toggleTest(r)}>
      {String(t(r.isTestUser ? 'admin.studyConsole.unmarkTest' : 'admin.studyConsole.markTest'))}
    </Button>
  )

  const columns: DataTableColumn<SubListRow>[] = [
    {
      id: 'student',
      header: String(t('admin.studyConsole.colStudent')),
      cell: r => (
        <div>
          <div className="flex items-center gap-1.5 max-w-[220px]">
            <span className="font-medium text-gray-900 truncate">{r.studentName || t('admin.studyConsole.noName')}</span>
            {r.isTestUser && <TestBadge />}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[220px]">{r.studentEmail}</div>
        </div>
      ),
    },
    {
      id: 'plan',
      header: String(t('admin.studyConsole.colPlan')),
      cell: r => <span className="text-gray-700 whitespace-nowrap">{r.plan}{r.pendingPlan ? ` → ${r.pendingPlan}` : ''}</span>,
    },
    {
      id: 'status',
      header: String(t('admin.studyConsole.colStatus')),
      cell: r => (
        <>
          <StatusPill tone={subStatusTone(r.status)} className="h-5 text-[11px]">{statusLabel(r.status)}</StatusPill>
          {r.cancelAtPeriodEnd && <span className="ml-1.5 text-[11px] text-amber-600">{String(t('admin.studyConsole.cancelsShort'))}</span>}
        </>
      ),
    },
    {
      id: 'credits',
      header: String(t('admin.studyConsole.colCredits')),
      align: 'right',
      cell: r => <span className="tabular-nums text-gray-700">{r.creditsTotal.toLocaleString(locale)}</span>,
    },
    {
      id: 'renews',
      header: String(t('admin.studyConsole.colRenews')),
      cell: r => <span className="text-gray-500 whitespace-nowrap">{when(r.currentPeriodEnd)}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: r => <span className="whitespace-nowrap">{flagButton(r)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4 gap-3 flex-row flex-wrap items-center">
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
        <TestFilterSelect value={test} onChange={v => { setTest(v); setPage(1) }} />
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="w-4 h-4 mr-1.5" />{String(t('admin.studyConsole.exportCsv'))}
        </Button>
      </Card>

      <DataTable<SubListRow>
        data={rows}
        columns={columns}
        getRowId={r => r.studentId}
        loading={loading}
        skeletonRows={6}
        emptyState={{ icon: CreditCard, title: String(t('admin.studyConsole.subsEmpty')) }}
        mobileRender={r => (
          <Card className="p-0 gap-0 overflow-hidden">
            <AdminMobileRow
              title={
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{r.studentName || String(t('admin.studyConsole.noName'))}</span>
                  {r.isTestUser && <TestBadge />}
                </span>
              }
              subtitle={r.studentEmail}
              badge={
                <StatusPill tone={subStatusTone(r.status)} className="h-5 text-[11px]">{statusLabel(r.status)}</StatusPill>
              }
              actions={flagButton(r)}
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
          </Card>
        )}
      />

      {total > 20 && <Pager page={page} totalPages={totalPages} total={total} onPage={setPage} />}
    </div>
  )
}

/* ─────────────────────── Global payments list ─────────────────────── */

const PAY_KIND_OPTIONS = ['all', 'study_subscription', 'study_credit_pack', 'study_exam_pass']
/** Derived from amount vs the refund ledger, server-side (payStatus param):
 *  paid = untouched, partial = some refunded, refunded = remaining hit 0. */
const PAY_STATUS_OPTIONS = ['all', 'paid', 'partial', 'refunded']

function PaymentsList() {
  const { t, language } = useTranslation()
  const locale = getDateLocale(language)
  const adminFetch = useAdminFetch()
  const { kindLabel, statusMeta, won } = usePaymentFormatters(locale)
  const [kind, setKind] = useState('all')
  const [payStatus, setPayStatus] = useState('all')
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
    if (payStatus !== 'all') p.set('payStatus', payStatus)
    if (debouncedQ) p.set('q', debouncedQ)
    return `/api/admin/study/payments?${p.toString()}`
  }, [kind, payStatus, debouncedQ])

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
  const statusOptLabel = (s: string) => {
    if (s === 'paid') return String(t('admin.studyConsole.payStatusPaid'))
    if (s === 'partial') return String(t('admin.studyConsole.payStatusPartial'))
    if (s === 'refunded') return String(t('admin.studyConsole.payStatusCancelled'))
    return String(t('admin.studyConsole.payAllStatuses'))
  }

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

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      id: 'student',
      header: String(t('admin.studyConsole.colStudent')),
      cell: p => (
        <div>
          <div className="flex items-center gap-1.5 max-w-[220px]">
            <span className="font-medium text-gray-900 truncate">{p.studentName || t('admin.studyConsole.noName')}</span>
            {p.isTestUser && <TestBadge />}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-[220px]">{p.studentEmail}</div>
        </div>
      ),
    },
    {
      id: 'kind',
      header: String(t('admin.studyConsole.colKind')),
      cell: p => <span className="text-gray-700 whitespace-nowrap">{kindLabel(p.kind)}</span>,
    },
    {
      id: 'amount',
      header: String(t('admin.studyConsole.colAmount')),
      align: 'right',
      cell: p => <span className="tabular-nums font-medium text-gray-900 whitespace-nowrap">{won(p.amountWon)}</span>,
    },
    {
      id: 'status',
      header: String(t('admin.studyConsole.colStatus')),
      cell: p => {
        const meta = statusMeta(p)
        return <StatusPill tone={meta.tone} className="h-5 text-[11px]">{meta.label}</StatusPill>
      },
    },
    {
      id: 'date',
      header: String(t('admin.studyConsole.colDate')),
      cell: p => <span className="text-gray-500 text-xs whitespace-nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—'}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: p => (
        <span className="whitespace-nowrap">
          {isRefundable(p) && (
            <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>{String(t('admin.studyConsole.refund'))}</Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-4 gap-3 flex-row flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={String(t('admin.studyConsole.searchPlaceholder'))} className="pl-9" />
        </div>
        <Select value={kind} onValueChange={v => { setKind(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{PAY_KIND_OPTIONS.map(k => <SelectItem key={k} value={k}>{kindOptLabel(k)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={payStatus} onValueChange={v => { setPayStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{PAY_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{statusOptLabel(s)}</SelectItem>)}</SelectContent>
        </Select>
        <div className="text-xs text-gray-500 ml-auto">
          {String(t('admin.studyConsole.paymentsGross'))}: <span className="font-semibold text-gray-900 tabular-nums">{won(grossWon)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
          <Download className="w-4 h-4 mr-1.5" />{String(t('admin.studyConsole.exportCsv'))}
        </Button>
      </Card>

      <DataTable<PaymentRow>
        data={rows}
        columns={columns}
        getRowId={p => p.paymentId}
        loading={loading}
        skeletonRows={6}
        emptyState={{ icon: CreditCard, title: String(t('admin.studyConsole.paymentsEmpty')) }}
        mobileRender={p => {
          const meta = statusMeta(p)
          return (
            <Card className="p-0 gap-0 overflow-hidden">
              <AdminMobileRow
                title={
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{p.studentName || String(t('admin.studyConsole.noName'))}</span>
                    {p.isTestUser && <TestBadge />}
                  </span>
                }
                subtitle={p.studentEmail}
                badge={
                  <StatusPill tone={meta.tone} className="h-5 text-[11px]">{meta.label}</StatusPill>
                }
                meta={[
                  { label: String(t('admin.studyConsole.colKind')), value: kindLabel(p.kind) },
                  { label: String(t('admin.studyConsole.colAmount')), value: <span className="tabular-nums">{won(p.amountWon)}</span> },
                  { label: String(t('admin.studyConsole.colDate')), value: p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '—' },
                ]}
                actions={isRefundable(p) ? (
                  <Button size="sm" variant="outline" onClick={() => setRefundTarget(p)}>{String(t('admin.studyConsole.refund'))}</Button>
                ) : undefined}
              />
            </Card>
          )
        }}
      />

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
