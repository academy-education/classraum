import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Keeping fixture data out of the numbers the business is judged by.
 *
 * MEASURED 2026-08-26: the admin panel reported ₩434,317,000 of paid
 * revenue. ₩431,470,000 of that — 99.3% — was one seeded demo academy,
 * and ten of twelve academies had never had a paying student. Every
 * dashboard, analytics panel and subscription total was reporting
 * fixtures as business performance, and nothing in the schema could tell
 * the difference.
 *
 * `academies.is_test` now can. This module is the one place that reads
 * it, so "which academies count" has a single answer rather than a
 * filter copy-pasted into a dozen endpoints that drift apart.
 *
 * FAILS TOWARD SHOWING TOO MUCH, NEVER TOO LITTLE. If the lookup fails,
 * callers get `null` and are expected to fall back to counting
 * everything. An admin who sees an inflated number and knows why is in a
 * better position than one shown a quietly deflated number that hides a
 * real customer's revenue.
 */

/** `?includeTest=1` — the admin panel's "show test data" toggle. */
export function includeTestRequested(request: Request): boolean {
  const v = new URL(request.url).searchParams.get('includeTest')
  return v === '1' || v === 'true'
}

/**
 * Ids of academies that count as real.
 *
 * Returns null when the caller asked to include everything, and also
 * when the lookup fails — both mean "do not filter". Callers must treat
 * null as "no restriction" rather than "no academies", which is the
 * distinction that decides whether a failure shows too much or nothing
 * at all.
 */
export async function realAcademyIds(includeTest: boolean): Promise<string[] | null> {
  if (includeTest) return null
  const { data, error } = await dbAdmin
    .from('academies')
    .select('id')
    .eq('is_test', false)

  if (error) {
    console.error('[admin] real-academy lookup failed; counting everything:', error)
    return null
  }
  return (data ?? []).map(a => a.id)
}

/**
 * Counts for the toggle's own label, so the UI can say what is being
 * hidden instead of silently omitting it.
 */
export async function testAcademySummary(): Promise<{ real: number; test: number }> {
  const { data, error } = await dbAdmin.from('academies').select('is_test')
  if (error || !data) return { real: 0, test: 0 }
  let real = 0, test = 0
  for (const a of data) (a.is_test ? test++ : real++)
  return { real, test }
}

/**
 * Ids of users who belong to at least one real academy, as a student,
 * teacher or manager.
 *
 * Users are not academy-scoped by a column — membership lives in three
 * join tables — so this resolves the list rather than expressing it as a
 * filter. Returns null for "do not filter", same contract as
 * realAcademyIds.
 *
 * BOUNDED. PostgREST puts the id list in the URL, so a big enough
 * membership makes the request itself fail. Past the cap this gives up
 * and returns null — counting everyone, with a log line — because an
 * over-count an admin can explain beats a request that 414s and renders
 * the tile as broken. At the time of writing the real membership is 43.
 */
const MAX_IDS_IN_URL = 2000

export async function realAcademyUserIds(includeTest: boolean): Promise<string[] | null> {
  const academies = await realAcademyIds(includeTest)
  if (academies === null) return null
  if (academies.length === 0) return []

  const ids = new Set<string>()
  for (const table of ['students', 'teachers', 'managers'] as const) {
    const { data, error } = await dbAdmin
      .from(table)
      .select('user_id')
      .in('academy_id', academies)
    if (error) {
      console.error(`[admin] real-user lookup failed on ${table}; counting everyone:`, error)
      return null
    }
    for (const r of data ?? []) if (r.user_id) ids.add(r.user_id)
  }

  if (ids.size > MAX_IDS_IN_URL) {
    console.warn(`[admin] ${ids.size} real users exceeds the URL-safe cap; counting everyone`)
    return null
  }
  return [...ids]
}
