/**
 * Read EVERY row a study_item_bank query matches, past PostgREST's
 * 1000-row response cap, and prove it.
 *
 * Why this exists (BANK-INTEGRITY-2026-10-04): assembleFromBank read the
 * SAT bank in one unpaged query. PostgREST answers that with the first
 * 1000 rows and a 200, so SAT Math served 1,000 of 1,364 live items (364
 * never drawable, 79 of them hard) and SAT R&W 1,000 of 1,117 (every one
 * of the 17 rw-v10-sec-hard rows unreachable). Nothing errored. The same
 * class had been fixed for the TOEFL draw and loadExposures two days
 * earlier, each with its own loop; this is the one loop every assembler
 * path now shares.
 *
 * Three guarantees, each one a way this has failed before:
 *  1. Paged with `.range()` on a TOTAL order (caller's prefix, then `id`).
 *     range() over a non-unique sort is OFFSET over two independent scans
 *     — bank-register once fetched 1222 rows holding 1057 distinct.
 *  2. The exact count is read with the first page and the result must
 *     equal it. A short read throws instead of drawing from a subset.
 *  3. Ids must be distinct across pages.
 *
 * A bank read that cannot prove it is complete throws: a test that fails
 * to start is loud, a test drawn from two thirds of the bank is not.
 */
export const BANK_PAGE = 1000
const MAX_PAGES = 200

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}

/** The slice of a PostgREST builder this helper uses. Typed loosely on
 *  purpose: supabase-js's generic builder types do not unify across
 *  differently-selected queries. */
export interface PageableQuery<T> {
  order: (column: string, opts: { ascending: boolean }) => PageableQuery<T>
  range: (from: number, to: number) => PromiseLike<PageResult<T>>
}

/**
 * @param build   Returns the FILTERED query (select + eq/in…, no order, no
 *                range). Called once per page; `withCount` is true for the
 *                first page and must be passed to select as
 *                `{ count: 'exact' }`.
 * @param label   For error messages, e.g. 'sat/math'.
 * @param orderBy Ordering prefix before the `id` tiebreaker. Default none
 *                (order by id alone).
 */
export async function readBankPaged<T extends { id: string }>(
  build: (withCount: boolean) => unknown,
  label: string,
  orderBy: Array<{ column: string; ascending?: boolean }> = [],
  pageSize: number = BANK_PAGE,
): Promise<T[]> {
  const out: T[] = []
  let expected: number | null = null
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) throw new Error(`bank read ${label}: exceeded ${MAX_PAGES} pages`)
    const from = page * pageSize
    let q = build(page === 0) as PageableQuery<T>
    for (const o of orderBy) {
      if (o.column === 'id') continue
      q = q.order(o.column, { ascending: o.ascending ?? true })
    }
    q = q.order('id', { ascending: true })
    const res = await q.range(from, from + pageSize - 1)
    if (res.error) throw new Error(`bank read ${label} failed: ${res.error.message}`)
    if (page === 0) {
      if (typeof res.count !== 'number') {
        throw new Error(`bank read ${label}: no exact count returned — cannot prove the read is complete`)
      }
      expected = res.count
    }
    const rows = res.data ?? []
    out.push(...rows)
    if (rows.length < pageSize) break
  }
  if (out.length !== expected) {
    throw new Error(`bank read ${label}: read ${out.length} rows, bank count says ${expected}`)
  }
  if (new Set(out.map(r => r.id)).size !== out.length) {
    throw new Error(`bank read ${label}: duplicate rows across pages — paging is not on a total order`)
  }
  return out
}
