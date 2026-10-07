import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * "Is this account a test account?" — one answer, two flags.
 *
 *   users.is_internal               (064) set by the team in SQL
 *   study_user_prefs.is_test_user   (084) set in the admin study console
 *
 * Owner decision 2026-10-07: the two mean the same thing everywhere a real
 * student is decided. Before that, study_item_calibration read only the
 * first and the admin console only the second, so 44 accounts were "test"
 * on one screen and "real" in the calibration numbers.
 *
 * The SQL twin is the view public.study_test_accounts (migration 125). This
 * module deliberately reads the two BASE columns instead of that view, so
 * code that ships before the migration is applied still works.
 */

export interface TestFlags {
  isInternal?: boolean | null
  isStudyTestUser?: boolean | null
}

export function isTestAccount(f: TestFlags): boolean {
  return !!f.isInternal || !!f.isStudyTestUser
}

const PAGE = 1000

/**
 * Every test-account id (the union of both flags). Pages past the PostgREST
 * 1000-row cap on a total order. Throws on any read error — a partial list
 * would silently count test accounts as real (or hide real ones).
 */
export async function fetchTestAccountIds(db: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('users').select('id')
      .eq('is_internal', true).order('id').range(from, from + PAGE - 1)
    if (error) throw new Error(`test accounts (users.is_internal): ${error.message}`)
    for (const r of data ?? []) ids.add(r.id as string)
    if ((data ?? []).length < PAGE) break
  }
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('study_user_prefs').select('student_id')
      .eq('is_test_user', true).order('student_id').range(from, from + PAGE - 1)
    if (error) throw new Error(`test accounts (study_user_prefs.is_test_user): ${error.message}`)
    for (const r of data ?? []) ids.add(r.student_id as string)
    if ((data ?? []).length < PAGE) break
  }
  return ids
}

/**
 * Test-account flag for a known, bounded set of ids (one page of an admin
 * list). Returns id → { isTestAccount, isInternal, isStudyTestUser }; ids
 * with neither flag are present with all three false.
 */
export async function testFlagsFor(
  db: SupabaseClient,
  ids: string[],
): Promise<Map<string, { isTestAccount: boolean; isInternal: boolean; isStudyTestUser: boolean }>> {
  const out = new Map<string, { isTestAccount: boolean; isInternal: boolean; isStudyTestUser: boolean }>()
  for (const id of ids) out.set(id, { isTestAccount: false, isInternal: false, isStudyTestUser: false })
  if (ids.length === 0) return out
  const [{ data: users, error: ue }, { data: prefs, error: pe }] = await Promise.all([
    db.from('users').select('id, is_internal').in('id', ids),
    db.from('study_user_prefs').select('student_id, is_test_user').in('student_id', ids),
  ])
  if (ue) throw new Error(`test flags (users): ${ue.message}`)
  if (pe) throw new Error(`test flags (study_user_prefs): ${pe.message}`)
  for (const u of users ?? []) { const e = out.get(u.id as string); if (e) e.isInternal = !!u.is_internal }
  for (const p of prefs ?? []) { const e = out.get(p.student_id as string); if (e) e.isStudyTestUser = !!p.is_test_user }
  for (const e of out.values()) e.isTestAccount = isTestAccount(e)
  return out
}
