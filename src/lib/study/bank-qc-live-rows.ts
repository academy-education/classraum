/**
 * Parser for the `bank_qc_live_rows()` RPC (migration 130), used by /api/admin/bank-qc/live.
 *
 * The RPC returns the live bank as one json value — `{ count, rows, keys }` — instead of the route paging
 * every row's full item JSON. This turns that into the slim rows the route aggregates over, and refuses
 * anything it cannot read: a malformed payload or a row count that disagrees with `count` throws, because
 * a short read here would make the bank look smaller and better measured than it is.
 */

export interface LiveBankRow {
  id: string
  family: string | null
  domain: string | null
  source: string | null
  cohort: string | null
  created_at: string
  /** item.choices is an array — the only thing the route needed from the item blob */
  multipleChoice: boolean
  method: string | null
  harvestedFrom: string | null
}

export interface LiveBankRead {
  rows: LiveBankRow[]
  /** cohort ('(none)' for null) -> sorted distinct verify_meta key names */
  verifyMetaKeys: Map<string, string[]>
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : v == null ? null : String(v))

export function parseLiveBankRows(payload: unknown): LiveBankRead {
  if (!payload || typeof payload !== 'object') throw new Error('bank_qc_live_rows: empty or non-object payload')
  const p = payload as { count?: unknown; rows?: unknown; keys?: unknown }
  if (typeof p.count !== 'number' || !Array.isArray(p.rows)) {
    throw new Error('bank_qc_live_rows: payload is missing count or rows')
  }
  if (p.rows.length !== p.count) {
    throw new Error(`bank_qc_live_rows: read ${p.rows.length} rows, count says ${p.count} — refusing a partial read`)
  }
  const rows: LiveBankRow[] = p.rows.map((r, i) => {
    if (!Array.isArray(r) || r.length < 9 || typeof r[0] !== 'string' || typeof r[5] !== 'string') {
      throw new Error(`bank_qc_live_rows: row ${i} is malformed`)
    }
    return {
      id: r[0], family: str(r[1]), domain: str(r[2]), source: str(r[3]), cohort: str(r[4]),
      created_at: r[5], multipleChoice: r[6] === true, method: str(r[7]), harvestedFrom: str(r[8]),
    }
  })
  const verifyMetaKeys = new Map<string, string[]>()
  if (p.keys && typeof p.keys === 'object') {
    for (const [c, ks] of Object.entries(p.keys as Record<string, unknown>)) {
      if (Array.isArray(ks)) verifyMetaKeys.set(c, ks.filter((k): k is string => typeof k === 'string'))
    }
  }
  return { rows, verifyMetaKeys }
}
