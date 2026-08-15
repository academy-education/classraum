import { dbAdmin } from '@/lib/supabase-admin'
import { BLUEPRINT, LISTENING_TASKS, READING_TASKS } from '@/lib/study/assemble'

/**
 * Camp mode server helpers — shared by /api/camp/* routes.
 *
 * Auth model (see docs/CAMP-MODE-PLAN.md + migration 082): clients READ
 * camp tables through RLS, but every WRITE goes through these routes
 * with the service-role client, because camp_programs.question_quota is
 * the thing schools pay for and camp_assignments must decrement it.
 */

export interface CampProgramRow {
  id: string
  academy_id: string
  name: string
  test_family: string
  starts_on: string | null
  ends_on: string | null
  question_quota: number
  questions_used: number
  student_cap: number
}

export const CAMP_PROGRAM_COLUMNS =
  'id, academy_id, name, test_family, starts_on, ends_on, question_quota, questions_used, student_cap'

export async function isAcademyManager(userId: string, academyId: string): Promise<boolean> {
  const { count } = await dbAdmin
    .from('managers')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('academy_id', academyId)
  return (count ?? 0) > 0
}

export async function isAcademyTeacher(userId: string, academyId: string): Promise<boolean> {
  const { count } = await dbAdmin
    .from('teachers')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('academy_id', academyId)
  return (count ?? 0) > 0
}

/** The classroom's own teacher, or any manager of its academy. Mirrors
 *  the camp_assignments RLS read policy so the API can't create rows
 *  the caller couldn't read back. */
export async function canManageClassroom(
  userId: string,
  classroom: { teacher_id: string | null; academy_id: string },
): Promise<boolean> {
  if (classroom.teacher_id === userId) return true
  return isAcademyManager(userId, classroom.academy_id)
}

/* ── Section/domain vocabulary per test family ──────────────────────────
 * These are the study_item_bank literals, imported from the assembler so
 * the camp builder can never drift from what the bank actually stores. */

export const SAT_SECTIONS = ['reading_writing', 'math'] as const
export const TOEFL_SECTIONS = ['reading', 'listening'] as const

export function sectionsForFamily(family: string): readonly string[] {
  return family === 'sat' ? SAT_SECTIONS : TOEFL_SECTIONS
}

/** SAT: College Board content domains (BLUEPRINT keys, e.g. 'Algebra').
 *  TOEFL: the ETS task tags carried in item.readingTask/listeningTask. */
export function domainsForSection(family: string, section: string): readonly string[] {
  if (family === 'sat') return Object.keys(BLUEPRINT[section] ?? {})
  if (section === 'reading') return READING_TASKS
  if (section === 'listening') return LISTENING_TASKS
  return []
}

/* ── Bank draw ────────────────────────────────────────────────────────── */

interface BankRow {
  id: string
  item_type: string
  item: unknown
}

/** Usability rules the rest of the pipeline applies to bank rows (see
 *  scripts/bank-repair-io.ts + assemble.ts): a multiple-choice item needs
 *  exactly 4 distinct string choices with the correct answer among them. */
function isUsable(row: BankRow): boolean {
  if (row.item_type !== 'multiple_choice') return true
  const item = row.item as Record<string, unknown> | null
  const choices = item?.choices
  if (!Array.isArray(choices) || choices.length !== 4) return false
  if (!choices.every((c): c is string => typeof c === 'string')) return false
  if (new Set(choices.map(c => c.trim().toLowerCase())).size !== 4) return false
  const key = item?.correct_answer
  return typeof key === 'string' && choices.includes(key)
}

function toeflTaskOf(row: BankRow, section: string): string | null {
  const item = row.item as Record<string, unknown> | null
  const raw = section === 'listening' ? item?.listeningTask : item?.readingTask
  return typeof raw === 'string' ? raw : null
}

/**
 * Draw `count` random usable live items for a camp assignment.
 *
 * PostgREST caps a select at 1000 rows and does so SILENTLY (a verifier
 * once audited a truncated bank because of it — see CLAUDE.md), so the
 * pool is paged to completion before filtering.
 *
 * Returns the drawn ids, or the available count when the pool is short.
 */
export async function drawCampItems(p: {
  family: string
  section?: string | null
  domain?: string | null
  count: number
}): Promise<{ itemIds: string[] } | { shortfall: true; available: number }> {
  const sections = p.section ? [p.section] : [...sectionsForFamily(p.family)]

  const pool: BankRow[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let query = dbAdmin
      .from('study_item_bank')
      .select('id, item_type, item')
      .eq('family', p.family)
      .in('section', sections)
      .eq('verified', true)
      .eq('archived', false)
    if (p.family === 'sat' && p.domain) query = query.eq('domain', p.domain)
    // Camp v1 serves individually renderable questions; TOEFL's other
    // item types (fill_in_blanks paragraphs, speaking/writing tasks) need
    // section-shaped delivery and are out of scope for teacher draws.
    if (p.family !== 'sat') query = query.eq('item_type', 'multiple_choice')
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`camp draw query failed: ${error.message}`)
    pool.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }

  let usable = pool.filter(isUsable)
  if (p.family !== 'sat' && p.domain) {
    // TOEFL "domain" is the ETS task tag, which lives inside the item
    // JSON (item.listeningTask / item.readingTask), not in a column —
    // same lookup assembleToeflFromBank uses.
    const section = p.section
      ?? ((READING_TASKS as readonly string[]).includes(p.domain) ? 'reading' : 'listening')
    usable = usable.filter(row => toeflTaskOf(row, section) === p.domain)
  }

  if (usable.length < p.count) return { shortfall: true, available: usable.length }

  // Plain random draw — camp sets are fixed per assignment, so there is
  // no seed/replay contract to honour (unlike the daily challenge).
  const a = usable.map(r => r.id)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return { itemIds: a.slice(0, p.count) }
}
