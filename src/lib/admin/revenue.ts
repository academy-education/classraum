/**
 * KST month bucketing + net-revenue aggregation for the admin revenue trend.
 *
 * Net revenue = study payments minus the refund ledger
 * (study_payment_refunds), each row bucketed by its OWN timestamp interpreted
 * in Asia/Seoul. A refunded payment still counts in its payment month; the
 * refund subtracts in the month it was issued — a ledger view of net revenue.
 *
 * Asia/Seoul is UTC+9 with no DST, so a fixed offset is exact.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

export interface MonthBucket {
  /** KST calendar year/month (month is 0-11). */
  year: number
  month: number
  /** UTC instant of the KST month start (inclusive). */
  startIso: string
  /** UTC instant of the next KST month start (exclusive). */
  endIso: string
}

/** The last `n` calendar months in KST, oldest first, ending with the month
 *  containing `now`. */
export function lastNMonthsKST(n: number, now: Date = new Date()): MonthBucket[] {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS)
  const y = kstNow.getUTCFullYear()
  const m = kstNow.getUTCMonth()
  return Array.from({ length: n }, (_, i) => {
    const shifted = m - (n - 1 - i)
    const label = new Date(Date.UTC(y, shifted, 1))
    return {
      year: label.getUTCFullYear(),
      month: label.getUTCMonth(),
      startIso: new Date(Date.UTC(y, shifted, 1) - KST_OFFSET_MS).toISOString(),
      endIso: new Date(Date.UTC(y, shifted + 1, 1) - KST_OFFSET_MS).toISOString(),
    }
  })
}

export interface DatedAmount {
  amountWon: number | null
  /** ISO timestamp (UTC) of the payment / refund. */
  at: string | null
}

/** KST calendar bucket key for a UTC timestamp, or null if unparseable. */
function kstKey(iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const d = new Date(t + KST_OFFSET_MS)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`
}

/** Sum payments and subtract refunds into the given KST month buckets.
 *  Rows outside every bucket are ignored. Returns one net figure per bucket,
 *  same order as `months`. */
export function monthlyNetRevenueKST(
  months: MonthBucket[],
  payments: readonly DatedAmount[],
  refunds: readonly DatedAmount[],
): number[] {
  const index = new Map(months.map((mo, i) => [`${mo.year}-${mo.month}`, i]))
  const out = months.map(() => 0)
  const add = (rows: readonly DatedAmount[], sign: 1 | -1) => {
    for (const r of rows) {
      if (!r.at) continue
      const key = kstKey(r.at)
      if (key === null) continue
      const i = index.get(key)
      if (i === undefined) continue
      out[i] += sign * (r.amountWon ?? 0)
    }
  }
  add(payments, 1)
  add(refunds, -1)
  return out
}
