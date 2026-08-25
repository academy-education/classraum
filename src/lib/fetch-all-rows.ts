/**
 * Paginate a PostgREST query past the ~1000-row response cap.
 *
 * PostgREST caps a single response at ~1000 rows and says nothing about
 * it — you get 1000 rows and a 200. This has now bitten three times:
 *
 *   - the assignments page (ae9d96c), 462 assignments missing;
 *   - a bank verifier that reported "0 problems" while reading a bank
 *     truncated at 1000, so the rows holding the defect never loaded;
 *   - the sessions page, where the sort was date ASCENDING so the rows
 *     dropped were the LATEST: the page ended three weeks before today
 *     and showed no current or upcoming class at all.
 *
 * That third one is the shape to remember. Truncation is not "a few
 * rows missing from the end of a list" — combined with an ORDER BY it
 * silently removes one END of the data, and which end depends on the
 * sort direction. Ascending by date hides the future.
 *
 * Measured 2026-08-25, largest single academy: assignment_grades 19,932
 * rows and attendance 19,929 — twenty times the cap. student_reports
 * 1,925, invoices 1,824, assignments and classroom_sessions 1,463 each.
 * classroom_students (303) and students (150) are nowhere near it.
 *
 * ORDERING IS NOT OPTIONAL. `.range()` pages are separate requests, and
 * without a total order the database may return rows in a different
 * order between them — so a row can be skipped or arrive twice. Every
 * caller must order by something unique, or by a prefix plus a unique
 * tiebreaker (date, start_time, THEN id). Sessions share a date and a
 * start_time constantly, which is exactly when this bites.
 */

const DEFAULT_PAGE_SIZE = 1000
/** Backstop so a pathological loop cannot run forever. */
const MAX_PAGES = 100

export interface PgErrorLike {
  message?: string
  details?: string
  hint?: string
  code?: string
}

export interface PagedResult<T> {
  data: T[] | null
  error: PgErrorLike | null
  /** True when MAX_PAGES was hit and rows may still remain. Callers
   *  that surface counts should treat this as "at least this many". */
  truncated: boolean
}

/**
 * @param page  Builds one page. MUST apply a total ordering, and MUST
 *              apply `.range(from, to)` with the arguments given.
 *
 * Example shape (the ordering is the part that matters):
 *   fetchAllRows((from, to) =>
 *     db.from('invoices').select('*')
 *       .eq('academy_id', id)
 *       .order('due_date', { ascending: false })
 *       .order('id', { ascending: true })   // <- unique tiebreaker
 *       .range(from, to))
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PgErrorLike | null }>,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<PagedResult<T>> {
  const all: T[] = []
  let from = 0

  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) return { data: null, error, truncated: false }

    const rows = data ?? []
    all.push(...rows)

    // A short page means the end of the data. Equal to pageSize is
    // ambiguous — it may be the exact last page — so we ask for one
    // more and let the next iteration come back empty. Cheap, and it
    // removes the off-by-one that "stop when length < pageSize" has
    // when the total is an exact multiple of the page size.
    if (rows.length < pageSize) {
      return { data: all, error: null, truncated: false }
    }
    from += pageSize
  }

  return { data: all, error: null, truncated: true }
}
