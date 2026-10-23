"use client"

/**
 * Supply and use, per test section — the top of /admin/bank-qc.
 *
 * Reads /api/admin/bank-qc/usage, which counts the whole bank and every real
 * student's completed full tests (definitions: src/lib/study/bank-usage.ts,
 * shared with scripts/study-bank/runout-monitor.ts). Counts only — no
 * student is named here.
 *
 * The Supabase client is imported dynamically inside the effect for the same
 * reason as LiveBankState: a static import pulls its ESM dependencies into
 * the dashboard's jest graph and the suite dies at import.
 */

import React from 'react'
import { AlertTriangle, BookOpenCheck, Layers, RefreshCw, Users } from 'lucide-react'
import { DashboardCard } from '@/components/admin/DashboardCard'
import { AdminTableShell, AdminMobileRow } from '@/components/admin/AdminTableShell'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { BankUsageReport } from '@/lib/study/bank-usage-load'
import type { SectionUsage } from '@/lib/study/bank-usage'
import { LOW_TESTS, snapshotAgeDays, snapshotIsStale } from '@/lib/study/bank-usage'
import { useQcT, type QcT } from './i18n'

const FAMILY_LABEL: Record<string, string> = {
  sat: 'SAT', act: 'ACT', toefl: 'TOEFL', ssat: 'SSAT', isee: 'ISEE', map: 'MAP',
}
const SECTION_LABEL: Record<string, string> = {
  reading_writing: 'Reading & Writing', math: 'Math', english: 'English', reading: 'Reading',
  science: 'Science', listening: 'Listening', speaking: 'Speaking', writing: 'Writing',
  verbal: 'Verbal', language: 'Language Usage',
}
export function sectionLabel(s: Pick<SectionUsage, 'family' | 'section'>): string {
  const f = FAMILY_LABEL[s.family] ?? s.family.toUpperCase()
  const sec = SECTION_LABEL[s.section] ?? s.section.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
  return `${f} ${sec}`
}

/** Red at 0-2 whole tests, amber at 3-4, nothing at 5+ (owner's five-test floor). */
export function lowTone(liveTests: number | null): 'red' | 'amber' | null {
  if (liveTests === null || liveTests >= LOW_TESTS) return null
  return liveTests <= 2 ? 'red' : 'amber'
}
const ROW_TONE = { red: 'bg-rose-50/60', amber: 'bg-amber-50/60' } as const
const NUM_TONE = { red: 'text-rose-700', amber: 'text-amber-700' } as const

const n = (v: number) => v.toLocaleString()

/** Small amber dot on a number taken from a stale depth snapshot. */
function StaleDot({ t }: { t: QcT }) {
  return (
    <span
      data-testid="stale-dot"
      role="img"
      aria-label={t('admin.bankQc.usage.staleDot')}
      title={t('admin.bankQc.usage.staleDot')}
      className="inline-block h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-100 shrink-0"
    />
  )
}

function LiveTestsCell({ s, t, snapshot, stale }: { s: SectionUsage; t: QcT; snapshot: string; stale: boolean }) {
  const tone = lowTone(s.liveTests)
  const fromSnapshot = s.liveTestsSource === 'measured'
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {fromSnapshot && stale && <StaleDot t={t} />}
        <span className={`text-[15px] font-semibold tabular-nums ${tone ? NUM_TONE[tone] : 'text-gray-900'}`}>
          {s.liveTests === null ? '—' : `${s.liveTests}${s.measuredAtLeast ? '+' : ''}`}
        </span>
        {tone && (
          <StatusBadge tone={tone === 'red' ? 'danger' : 'pending'} size="sm" icon={AlertTriangle}>
            {t('admin.bankQc.usage.underFive')}
          </StatusBadge>
        )}
      </div>
      <div className="text-[11px] text-gray-500 leading-snug mt-0.5">
        {s.liveTestsSource === 'measured'
          ? t('admin.bankQc.usage.measured', { date: snapshot })
          : s.liveTestsSource === 'division'
            ? t('admin.bankQc.usage.byDivision')
            : t('admin.bankQc.usage.noSize')}
        {s.measuredHardRoute !== null && <> · {t('admin.bankQc.usage.hardRoute', { n: s.measuredHardRoute })}</>}
      </div>
      {/* Computed from TODAY's bank, beside the snapshot number, so a
          bank that has grown past the measurement is visible at a glance.
          Division ignores domain quotas, so it is an upper bound. */}
      {fromSnapshot && s.liveTestsByDivision !== null && (
        <div className="text-[11px] text-gray-600 tabular-nums leading-snug" data-testid="division-line">
          {t('admin.bankQc.usage.divisionAlt', { n: s.liveTestsByDivision })}
        </div>
      )}
      <div className="text-[11px] text-gray-400 tabular-nums leading-snug">
        {t('admin.bankQc.usage.liveItems', { n: n(s.live) })}
      </div>
    </div>
  )
}

function StagedCell({ s, t }: { s: SectionUsage; t: QcT }) {
  if (s.staged === 0) return <span className="text-[12px] text-gray-400">{t('admin.bankQc.usage.none')}</span>
  return (
    <div>
      <div className="text-[13px] text-gray-900 tabular-nums">
        {n(s.staged)}{' '}
        <span className="text-gray-500">
          {s.stagedTestsByDivision === null ? '' : t('admin.bankQc.usage.approxTests', { n: s.stagedTestsByDivision })}
        </span>
      </div>
      {s.stagedInOpenReview > 0 && (
        <div className="text-[11px] text-sky-700 leading-snug">{t('admin.bankQc.usage.inOpenReview', { n: n(s.stagedInOpenReview) })}</div>
      )}
      {s.stagedHumanReviewed > 0 && (
        <div className="text-[11px] text-gray-500 leading-snug">{t('admin.bankQc.usage.humanReviewed', { n: n(s.stagedHumanReviewed) })}</div>
      )}
    </div>
  )
}

function MostUsedCell({ s, t }: { s: SectionUsage; t: QcT }) {
  if (s.studentsWithTests === 0) return <span className="text-[12px] text-gray-400">{t('admin.bankQc.usage.notTaken')}</span>
  return (
    <div>
      <div className="text-[13px] font-medium text-gray-900 tabular-nums">{s.maxTestsOneStudent}</div>
      <div className="text-[11px] text-gray-500 leading-snug">
        {t('admin.bankQc.usage.completedBy', { tests: n(s.completedTests), students: n(s.studentsWithTests) })}
      </div>
    </div>
  )
}

function UnderFiveCell({ s, t }: { s: SectionUsage; t: QcT }) {
  if (s.studentsWithTests === 0) return <span className="text-[12px] text-gray-400">—</span>
  return (
    <div>
      <span className={`text-[13px] font-medium tabular-nums ${s.studentsUnder5Left > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
        {s.studentsUnder5Left}
      </span>
      {s.studentsNoMeasurement > 0 && (
        <div className="text-[11px] text-violet-700 leading-snug">{t('admin.bankQc.usage.noMeasurement', { n: s.studentsNoMeasurement })}</div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-[104px] rounded-2xl bg-white ring-1 ring-gray-100 animate-pulse" />)}
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-100 p-4 space-y-3">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />)}
      </div>
    </div>
  )
}

export function BankUsagePanel() {
  const { t } = useQcT()
  const [data, setData] = React.useState<BankUsageReport | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [nonce, setNonce] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const { db } = await import('@/lib/supabase')
        const { data: { session } } = await db.auth.getSession()
        const res = await fetch('/api/admin/bank-qc/usage', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((json as { error?: string }).error || `${res.status}`)
        if (!Array.isArray((json as BankUsageReport).sections)) throw new Error('malformed response')
        if (!cancelled) setData(json as BankUsageReport)
      } catch (e) {
        // Shown, never replaced by a number: a usage table that silently
        // reads empty would say no student has used anything.
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [nonce])

  const sections = data?.sections ?? []
  // Age against the server's read time, not the viewer's clock, so the
  // note describes the numbers on screen.
  const ageDays = data ? snapshotAgeDays(data.snapshotMeasured, data.generatedAt) : null
  const stale = data ? snapshotIsStale(ageDays) : false
  const totals = {
    live: sections.reduce((a, s) => a + s.live, 0),
    staged: sections.reduce((a, s) => a + s.staged, 0),
    openReview: sections.reduce((a, s) => a + s.stagedInOpenReview, 0),
    low: sections.filter(s => s.low).length,
    under5: sections.reduce((a, s) => a + s.studentsUnder5Left, 0),
  }

  return (
    <section className="space-y-4" aria-labelledby="bank-usage-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="bank-usage-title" className="text-[15px] font-semibold text-gray-900">{t('admin.bankQc.usage.title')}</h2>
          <p className="text-[12.5px] text-gray-500 mt-0.5 max-w-3xl leading-relaxed">{t('admin.bankQc.usage.blurb')}</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[11.5px] text-gray-400">
              {t('admin.bankQc.usage.asOf', { when: new Date(data.generatedAt).toLocaleString() })}
            </span>
          )}
          <button
            type="button"
            onClick={() => setNonce(x => x + 1)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-600 ring-1 ring-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.bankQc.usage.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl bg-white ring-1 ring-rose-200 p-4">
          <p className="text-sm text-rose-700">{t('admin.bankQc.usage.error', { error })}</p>
        </div>
      )}

      {!error && loading && !data && <Skeleton />}

      {data && !error && (
        <>
          {stale && (
            <p
              data-testid="stale-note"
              className="flex items-start gap-2 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-900 leading-snug"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-px text-amber-600" />
              <span>
                {ageDays === null
                  ? t('admin.bankQc.usage.staleUnknown', { date: data.snapshotMeasured })
                  : t('admin.bankQc.usage.staleNote', { days: ageDays, date: data.snapshotMeasured })}
              </span>
            </p>
          )}
          <div className="grid gap-3 grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title={t('admin.bankQc.usage.cards.live')}
              value={n(totals.live)}
              subtitle={t('admin.bankQc.usage.cards.liveSub', { n: sections.filter(s => s.live > 0).length })}
              icon={<BookOpenCheck className="h-5 w-5" />}
              accent="emerald"
            />
            <DashboardCard
              title={t('admin.bankQc.usage.cards.staged')}
              value={n(totals.staged)}
              subtitle={t('admin.bankQc.usage.cards.stagedSub', { n: n(totals.openReview) })}
              icon={<Layers className="h-5 w-5" />}
              accent="violet"
            />
            <DashboardCard
              title={t('admin.bankQc.usage.cards.low')}
              value={String(totals.low)}
              subtitle={t('admin.bankQc.usage.cards.lowSub')}
              icon={<AlertTriangle className="h-5 w-5" />}
              accent={totals.low > 0 ? 'rose' : 'slate'}
            />
            <DashboardCard
              title={t('admin.bankQc.usage.cards.students')}
              value={String(totals.under5)}
              subtitle={t('admin.bankQc.usage.cards.studentsSub', { n: n(data.realStudents) })}
              icon={<Users className="h-5 w-5" />}
              accent={totals.under5 > 0 ? 'amber' : 'slate'}
            />
          </div>

          <AdminTableShell
            mobile={sections.map(s => {
              const tone = lowTone(s.liveTests)
              return (
                <div key={`${s.family}/${s.section}`} className={tone ? ROW_TONE[tone] : undefined} data-testid="usage-card">
                  <AdminMobileRow
                    title={sectionLabel(s)}
                    badge={tone ? (
                      <StatusBadge tone={tone === 'red' ? 'danger' : 'pending'} size="sm">
                        {t('admin.bankQc.usage.underFive')}
                      </StatusBadge>
                    ) : undefined}
                    meta={[
                      {
                        label: t('admin.bankQc.usage.col.live'),
                        value: (
                          <span className="inline-flex items-center gap-1.5">
                            {s.liveTestsSource === 'measured' && stale && <StaleDot t={t} />}
                            {s.liveTests === null ? '—' : `${s.liveTests}${s.measuredAtLeast ? '+' : ''}`}
                            {s.liveTestsSource === 'measured' && s.liveTestsByDivision !== null && (
                              <span className="text-[11px] text-gray-500">({t('admin.bankQc.usage.divisionAlt', { n: s.liveTestsByDivision })})</span>
                            )}
                          </span>
                        ),
                      },
                      { label: t('admin.bankQc.usage.col.staged'), value: s.staged === 0 ? '—' : `${n(s.staged)}${s.stagedTestsByDivision === null ? '' : ` (≈${s.stagedTestsByDivision})`}` },
                      { label: t('admin.bankQc.usage.col.most'), value: s.studentsWithTests === 0 ? '—' : String(s.maxTestsOneStudent) },
                      { label: t('admin.bankQc.usage.col.under5'), value: s.studentsWithTests === 0 ? '—' : String(s.studentsUnder5Left) },
                    ]}
                  />
                </div>
              )
            })}
          >
            <table className="w-full text-sm">
              <caption className="sr-only">{t('admin.bankQc.usage.title')}</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <th scope="col" className="py-2.5 px-4 font-medium">{t('admin.bankQc.usage.col.section')}</th>
                  <th scope="col" className="py-2.5 px-3 font-medium">
                    {t('admin.bankQc.usage.col.live')}
                    <span className={`block normal-case tracking-normal text-[10.5px] font-normal ${stale ? 'text-amber-700' : 'text-gray-400'}`}>
                      {t('admin.bankQc.usage.col.liveDate', { date: data.snapshotMeasured })}
                    </span>
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-medium">{t('admin.bankQc.usage.col.staged')}</th>
                  <th scope="col" className="py-2.5 px-3 font-medium">{t('admin.bankQc.usage.col.most')}</th>
                  <th scope="col" className="py-2.5 px-4 font-medium">{t('admin.bankQc.usage.col.under5')}</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => {
                  const tone = lowTone(s.liveTests)
                  return (
                    <tr key={`${s.family}/${s.section}`} className={`border-b border-gray-50 last:border-0 align-top ${tone ? ROW_TONE[tone] : ''}`}>
                      <td className="py-2.5 px-4">
                        <div className="text-[13px] font-medium text-gray-900 whitespace-nowrap">{sectionLabel(s)}</div>
                        {s.perTest !== null && (
                          <div className="text-[11px] text-gray-400 tabular-nums">{t('admin.bankQc.usage.perTest', { n: s.perTest })}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 min-w-[170px]"><LiveTestsCell s={s} t={t} snapshot={data.snapshotMeasured} stale={stale} /></td>
                      <td className="py-2.5 px-3 min-w-[150px]"><StagedCell s={s} t={t} /></td>
                      <td className="py-2.5 px-3 min-w-[130px]"><MostUsedCell s={s} t={t} /></td>
                      <td className="py-2.5 px-4"><UnderFiveCell s={s} t={t} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </AdminTableShell>

          <p className="text-[11px] text-gray-500 leading-relaxed max-w-3xl">
            {t('admin.bankQc.usage.footnote', { date: data.snapshotMeasured, students: n(data.realStudents), items: n(data.read.bank) })}
          </p>
        </>
      )}
    </section>
  )
}
