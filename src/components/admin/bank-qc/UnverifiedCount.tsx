"use client"

import React from 'react'
import { PLAIN_STATUS, unverifiedItems } from '@/lib/study/bank-register'
import { useQcT } from './i18n'

/*
 * The Supabase client is imported DYNAMICALLY, inside the effect —
 * same reason as LiveBankState. A static `import { db } from
 * '@/lib/supabase'` pulls the client and its ESM dependencies into the
 * module graph of anything that renders BankQcDashboard, and the jest
 * suite dies at import, reporting zero collected tests next to the
 * other suites' passes.
 */

/**
 * The "{t('admin.bankQc.unverified.title')}" headline on /admin/bank-qc.
 *
 * ── What was wrong ───────────────────────────────────────────────────
 * This number was `PLAIN_STATUS.unverifiedItems`, a hand-typed 3,387.
 * The live panel further down the same page read 3,377 from the
 * database. One page, one bank, two totals — and the hardcoded one was
 * the larger, so the drift flattered the bank rather than alarming
 * anyone about it.
 *
 * It now comes from a COUNT over `study_item_bank`, so it cannot drift
 * from the panel below: both sides apply the same live predicate, and
 * the arithmetic that turns a live count into "everything else" lives
 * in `unverifiedItems()` next to the decision it encodes.
 *
 * ── Why the failure state is blank and not the old number ────────────
 * When the count cannot be fetched this renders "—", not a fallback
 * constant. A stale number that renders confidently is the defect being
 * fixed; an admitted gap is not. Same rule as LiveBankState, which
 * shows its error rather than letting the checked-in ledger below stand
 * in for the current bank.
 */
export function UnverifiedCount() {
  const { t } = useQcT()
  const [liveItems, setLiveItems] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { db } = await import('@/lib/supabase')
        const { data: { session } } = await db.auth.getSession()
        /* `only=totals` runs a COUNT and returns no rows — it does not
         * page the bank a second time just to render one integer. */
        const res = await fetch('/api/admin/bank-qc/live?only=totals', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json() as { totals?: { items?: number } }
        const n = json.totals?.items
        if (typeof n !== 'number') throw new Error('no count')
        if (!cancelled) setLiveItems(n)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const value = liveItems === null ? null : unverifiedItems(liveItems)

  return (
    <div className="rounded-xl bg-gray-50 ring-1 ring-gray-200 p-4">
      <div className="text-2xl font-semibold text-gray-900 tabular-nums">
        {value === null
          ? <span className="text-gray-400" title={error ? `Count unavailable (${error})` : 'Counting…'}>—</span>
          : value.toLocaleString()}
      </div>
      <div className="text-[12px] font-medium text-gray-900 mt-0.5">
        {t('admin.bankQc.unverified.title')}
      </div>
      <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">
        Not known to be broken. Never read by a person. Blocked on{' '}
        <strong className="text-gray-800">{PLAIN_STATUS.blockedOn}</strong>.
      </p>
      <p className="text-[10.5px] text-gray-500 mt-1.5 leading-snug">
        {value === null
          ? (error
              ? <>{t('admin.bankQc.unverified.unavailable', { error })}</>
              : <>{t('admin.bankQc.unverified.countingLive')}</>)
          : <>{t('admin.bankQc.unverified.counted')}</>}
      </p>
    </div>
  )
}
