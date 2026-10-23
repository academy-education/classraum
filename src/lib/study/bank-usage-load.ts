/**
 * Server-side reader for /api/admin/bank-qc/usage. Kept out of the route file
 * (route files may export only handlers) so it can also be run directly
 * against the live database when checking the numbers.
 *
 * Every table is read IN FULL and the read is checked against an exact
 * COUNT. PostgREST caps a response at 1000 rows; a truncated read here would
 * under-count usage and make the bank look healthier than it is, so a short
 * read is an error, never a number.
 *
 * Returns counts only: no student id, name or email leaves this function.
 */
import { dbAdmin } from '@/lib/supabase-admin'
import {
  aggregateBankUsage, realStudentIds, seenBySection, studentSectionRows, tallyFullTests,
  taskMixBySession, toeflPathFromTaskMix, sessionSection,
  type DepthSnapshot, type SectionUsage,
} from '@/lib/study/bank-usage'
import { bankRowsPerTest } from '@/lib/study/bank-test-size'
import depthSnapshot from '../../../scripts/study-bank/depth-snapshot.json'

type Err = { message: string } | null
type PageResult<T> = PromiseLike<{ data: T[] | null; error: Err }>
type CountResult = PromiseLike<{ count: number | null; error: Err }>

const PAGE = 1000

async function readAll<T>(
  label: string,
  count: () => CountResult,
  page: (from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  const { count: n, error: ce } = await count()
  if (ce || typeof n !== 'number') throw new Error(`${label}: count failed (${ce?.message ?? 'no count'})`)
  const pages = Math.max(1, Math.ceil(n / PAGE))
  const settled = await Promise.all(Array.from({ length: pages }, (_, i) => page(i * PAGE, i * PAGE + PAGE - 1)))
  const out: T[] = []
  for (const { data, error } of settled) {
    if (error) throw new Error(`${label}: ${error.message}`)
    out.push(...(data ?? []))
  }
  // The table grew mid-read: keep walking until a short page.
  if ((settled[settled.length - 1]?.data ?? []).length === PAGE) {
    for (let from = pages * PAGE; ; from += PAGE) {
      const { data, error } = await page(from, from + PAGE - 1)
      if (error) throw new Error(`${label}: ${error.message}`)
      out.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }
  }
  if (out.length < n) throw new Error(`${label}: read ${out.length} rows, count says ${n} — refusing a partial read`)
  return out
}

export interface BankUsageReport {
  generatedAt: string
  snapshotMeasured: string
  realStudents: number
  read: { bank: number; sessions: number; reviews: number; attempts: number; exposures: number }
  sections: SectionUsage[]
}

export async function loadBankUsage(): Promise<BankUsageReport> {
  const snapshot = depthSnapshot as unknown as DepthSnapshot

  const [users, prefs, managers, teachers, students, academies, suppressions, sessions, bank, reviews] = await Promise.all([
    readAll('users',
      () => dbAdmin.from('users').select('id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('users').select('id, role, is_internal, email').order('id').range(a, b)),
    readAll('study_user_prefs',
      () => dbAdmin.from('study_user_prefs').select('student_id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('study_user_prefs').select('student_id, is_test_user').order('student_id').range(a, b)),
    readAll('managers',
      () => dbAdmin.from('managers').select('user_id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('managers').select('user_id').order('user_id').order('academy_id').range(a, b)),
    readAll('teachers',
      () => dbAdmin.from('teachers').select('user_id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('teachers').select('user_id').order('user_id').order('academy_id').range(a, b)),
    readAll('students',
      () => dbAdmin.from('students').select('user_id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('students').select('user_id, academy_id').order('id').range(a, b)),
    readAll('academies',
      () => dbAdmin.from('academies').select('id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('academies').select('id, is_test').order('id').range(a, b)),
    readAll('email_suppressions',
      () => dbAdmin.from('email_suppressions').select('email', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('email_suppressions').select('email').order('email').range(a, b)),
    readAll('study_sessions',
      () => dbAdmin.from('study_sessions').select('id', { count: 'exact', head: true })
        .eq('mode', 'full_test').not('completed_at', 'is', null),
      (a, b) => dbAdmin.from('study_sessions').select('id, student_id, mode, completed_at, module2_route, config')
        .eq('mode', 'full_test').not('completed_at', 'is', null).order('id').range(a, b)),
    // The whole bank, archived rows included: an attempt can point at an
    // archived item, and its `task` still decides the TOEFL path.
    readAll('study_item_bank',
      () => dbAdmin.from('study_item_bank').select('id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('study_item_bank').select('id, family, section, task, verified, archived').order('id').range(a, b)),
    readAll('study_item_reviews',
      () => dbAdmin.from('study_item_reviews').select('id', { count: 'exact', head: true }),
      (a, b) => dbAdmin.from('study_item_reviews').select('id, item_id, reviewer_kind, reviewed_at').order('id').range(a, b)),
  ])

  const real = realStudentIds(users, { prefs, managers, teachers, students, academies, suppressions })

  // Attempts are only needed to infer the TOEFL module-2 path, so read
  // them for real students' TOEFL Reading/Listening full tests only, in
  // small chunks (each chunk is itself paged and count-checked).
  const toeflSessionIds = sessions
    .filter(s => {
      if (!real.has(s.student_id)) return false
      const fs = sessionSection(s)
      return fs?.family === 'toefl' && (fs.section === 'reading' || fs.section === 'listening')
    })
    .map(s => s.id)
  const CHUNK = 20
  const chunks: string[][] = []
  for (let i = 0; i < toeflSessionIds.length; i += CHUNK) chunks.push(toeflSessionIds.slice(i, i + CHUNK))
  const attempts = (await Promise.all(chunks.map((ids, i) => readAll(`study_attempts[${i}]`,
    () => dbAdmin.from('study_attempts').select('id', { count: 'exact', head: true }).in('session_id', ids),
    (a, b) => dbAdmin.from('study_attempts').select('id, session_id, item_id').in('session_id', ids).order('id').range(a, b),
  )))).flat()

  // Every item served to a real student, for "most distinct questions seen
  // by one student". Read per chunk of real-student ids; each chunk is
  // paged and count-checked like every other table here, so the 1000-row
  // cap cannot shrink the number.
  const realIds = [...real].sort()
  const idChunks: string[][] = []
  for (let i = 0; i < realIds.length; i += CHUNK) idChunks.push(realIds.slice(i, i + CHUNK))
  const exposures = (await Promise.all(idChunks.map((ids, i) => readAll(`study_item_exposures[${i}]`,
    () => dbAdmin.from('study_item_exposures').select('id', { count: 'exact', head: true }).in('student_id', ids),
    (a, b) => dbAdmin.from('study_item_exposures').select('id, student_id, item_id').in('student_id', ids).order('id').range(a, b),
  )))).flat()
  const seen = seenBySection(exposures, bank, real)
  // The bank was read whole, archived rows included, and exposures have a
  // foreign key to it: an unmatched item means one of the reads is wrong.
  if (seen.unmatched > 0) throw new Error(`study_item_exposures: ${seen.unmatched} rows point at items missing from the bank read — refusing a partial count`)

  const taskOf = new Map<string, string | null>(bank.map(b => [b.id, b.task]))
  const mix = taskMixBySession(attempts, taskOf)
  const tally = tallyFullTests(sessions, real, (sid, sec) => toeflPathFromTaskMix(mix.get(sid), sec))
  const studentRows = studentSectionRows(tally, snapshot)

  const sections = aggregateBankUsage({ bank, reviews, studentRows, snapshot, perTest: bankRowsPerTest, seen: seen.bySection })

  return {
    generatedAt: new Date().toISOString(),
    snapshotMeasured: snapshot.measured,
    realStudents: real.size,
    read: { bank: bank.length, sessions: sessions.length, reviews: reviews.length, attempts: attempts.length, exposures: exposures.length },
    sections,
  }
}
