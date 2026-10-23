/**
 * Bank supply and real-student usage — the pure half shared by
 * scripts/study-bank/runout-monitor.ts and /api/admin/bank-qc/usage.
 *
 * Everything here is arithmetic over rows a caller has already read IN FULL.
 * No database access, so the definitions can be tested and cannot drift
 * between the script that names students and the admin page that only
 * counts them.
 *
 * ── Definitions (the load-bearing part) ─────────────────────────────────
 *   real student   any users row with NO studentExclusions() reason
 *                  (src/lib/study/real-attempts.ts): not is_internal, not a
 *                  study test user, not admin/super_admin, not a manager or
 *                  teacher, not in an academies.is_test academy, not on the
 *                  demo domain, not on email_suppressions.
 *   test taken     a study_sessions row with mode='full_test' and a
 *                  completed_at, keyed by config.family / config.section.
 *   depth          clean tests before a repeat, MEASURED by the depth scripts
 *                  and recorded in scripts/study-bank/depth-snapshot.json.
 *                  Never estimated here. TOEFL Listening/Reading carry one
 *                  depth per module-2 path; a student uses their most
 *                  frequent path, and an unknown path falls back to the
 *                  SMALLEST depth (warn early, never late).
 *   tests left     depth - tests taken. null when the section has no
 *                  measurement — a check that cannot read its input must
 *                  not return a number (CLAUDE.md).
 *   live item      study_item_bank.verified = true AND archived is not true
 *   staged item    study_item_bank.verified = false AND archived is not true
 */
import { studentExclusions } from './real-attempts'

/* ------------------------------------------------------------------ *
 * Real students
 * ------------------------------------------------------------------ */

export interface ExclusionTables {
  prefs: Array<{ student_id: string; is_test_user: boolean | null }>
  managers: Array<{ user_id: string }>
  teachers: Array<{ user_id: string }>
  students: Array<{ user_id: string; academy_id: string | null }>
  academies: Array<{ id: string; is_test: boolean | null }>
  suppressions: Array<{ email: string | null }>
}

export interface UserFactsRow {
  id: string
  role: string | null
  is_internal: boolean | null
  email: string | null
}

/** Ids of every real student, by the rule in real-attempts.ts. */
export function realStudentIds(users: UserFactsRow[], t: ExclusionTables): Set<string> {
  const testUser = new Set(t.prefs.filter(p => p.is_test_user).map(p => p.student_id))
  const staff = new Set([...t.managers, ...t.teachers].map(r => r.user_id))
  const testAcademy = new Set(t.academies.filter(a => a.is_test).map(a => a.id))
  const inTestAcademy = new Set(
    t.students.filter(s => s.academy_id !== null && testAcademy.has(s.academy_id)).map(s => s.user_id),
  )
  const suppressed = new Set(
    t.suppressions.map(s => (s.email ?? '').trim().toLowerCase()).filter(e => e !== ''),
  )
  const real = new Set<string>()
  for (const u of users) {
    const email = (u.email ?? '').trim().toLowerCase()
    const ex = studentExclusions({
      id: u.id, role: u.role, isInternal: !!u.is_internal,
      isStudyTestUser: testUser.has(u.id), isStaff: staff.has(u.id),
      inTestAcademy: inTestAcademy.has(u.id),
      emailDomain: email.includes('@') ? email.split('@')[1]! : null,
      emailSuppressed: email !== '' && suppressed.has(email),
    })
    if (ex.length === 0) real.add(u.id)
  }
  return real
}

/* ------------------------------------------------------------------ *
 * Tests taken and the TOEFL path
 * ------------------------------------------------------------------ */

export type ToeflPath = 'upper' | 'lower'

/**
 * TOEFL's module-2 path is not stored on a session, so it is inferred from
 * the task mix the session served (depth-snapshot.json `_paths`): Reading
 * upper serves 18 Academic Passage items per sitting (lower 8), Listening
 * upper serves 16 Academic Talk (lower 4).
 */
export function toeflPathFromTaskMix(taskCounts: Map<string, number> | undefined, section: string): ToeflPath | null {
  if (!taskCounts) return null
  if (section === 'reading') {
    const n = taskCounts.get('academic_passage') ?? 0
    return n > 8 ? 'upper' : n > 0 || (taskCounts.get('daily_life') ?? 0) > 0 ? 'lower' : null
  }
  if (section === 'listening') {
    const n = taskCounts.get('academic_talk') ?? 0
    return n > 4 ? 'upper' : n > 0 || (taskCounts.get('announcement') ?? 0) > 0 ? 'lower' : null
  }
  return null
}

/** Session id -> task -> items served, from study_attempts joined to the bank's `task`. */
export function taskMixBySession(
  attempts: Array<{ session_id: string; item_id: string | null }>,
  taskOf: Map<string, string | null>,
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>()
  for (const a of attempts) {
    if (!a.item_id) continue
    const t = taskOf.get(a.item_id)
    if (!t) continue
    let m = out.get(a.session_id)
    if (!m) { m = new Map(); out.set(a.session_id, m) }
    m.set(t, (m.get(t) ?? 0) + 1)
  }
  return out
}

export interface SessionFactsRow {
  id: string
  student_id: string
  mode: string | null
  completed_at: string | null
  module2_route: string | null
  config: unknown
}

/** The family/section a session was for, or null when its config does not say. */
export function sessionSection(s: Pick<SessionFactsRow, 'config'>): { family: string; section: string } | null {
  const c = (s.config ?? null) as { family?: unknown; section?: unknown } | null
  const family = typeof c?.family === 'string' ? c.family : null
  const section = typeof c?.section === 'string' ? c.section : null
  return family && section ? { family, section } : null
}

export function isCompletedFullTest(s: Pick<SessionFactsRow, 'mode' | 'completed_at'>): boolean {
  return s.mode === 'full_test' && !!s.completed_at
}

/** `${studentId}|${family}/${section}` */
export type StudentSectionKey = string

export interface TakenTally {
  taken: Map<StudentSectionKey, number>
  /** For TOEFL Reading/Listening: path/route combo -> sessions. */
  routes: Map<StudentSectionKey, Map<string, number>>
}

/** Completed full tests per real student and section, plus the TOEFL route mix. */
export function tallyFullTests(
  sessions: SessionFactsRow[],
  real: Set<string>,
  pathOf: (sessionId: string, section: string) => ToeflPath | null,
): TakenTally {
  const taken = new Map<StudentSectionKey, number>()
  const routes = new Map<StudentSectionKey, Map<string, number>>()
  for (const s of sessions) {
    if (!real.has(s.student_id) || !isCompletedFullTest(s)) continue
    const fs = sessionSection(s)
    if (!fs) continue
    const key = `${s.student_id}|${fs.family}/${fs.section}`
    taken.set(key, (taken.get(key) ?? 0) + 1)
    if (fs.family === 'toefl' && s.module2_route && (fs.section === 'reading' || fs.section === 'listening')) {
      const p = pathOf(s.id, fs.section)
      const combo = p ? `${p}/${s.module2_route}` : `?/${s.module2_route}`
      let m = routes.get(key)
      if (!m) { m = new Map(); routes.set(key, m) }
      m.set(combo, (m.get(combo) ?? 0) + 1)
    }
  }
  return { taken, routes }
}

/* ------------------------------------------------------------------ *
 * Depth and tests left
 * ------------------------------------------------------------------ */

export interface DepthEntry {
  value?: number
  byPath?: Record<string, number>
  atLeast?: boolean
  hardRoute?: number
  source?: string
}
export interface DepthSnapshot {
  measured: string
  sections: Record<string, DepthEntry>
}

/** Measured depth for one student's route. byPath: their route, else the smallest path. */
export function depthFor(entry: DepthEntry | undefined, route: string): number | null {
  if (entry?.byPath) {
    const vals = Object.values(entry.byPath)
    if (vals.length === 0) return null
    return entry.byPath[route] ?? Math.min(...vals)
  }
  return typeof entry?.value === 'number' ? entry.value : null
}

/** The section's depth without a student: the smallest path, so a warning is never late. */
export function sectionDepth(entry: DepthEntry | undefined): number | null {
  return depthFor(entry, '')
}

export interface StudentSectionRow {
  studentId: string
  /** `${family}/${section}` */
  section: string
  taken: number
  /** Most frequent TOEFL path/route combo, '' elsewhere. */
  route: string
  depth: number | null
  atLeast: boolean
  /** depth - taken; null when the section has no measurement. */
  left: number | null
}

export function studentSectionRows(tally: TakenTally, snap: DepthSnapshot): StudentSectionRow[] {
  const rows: StudentSectionRow[] = []
  for (const [key, n] of tally.taken) {
    const bar = key.indexOf('|')
    const studentId = key.slice(0, bar)
    const section = key.slice(bar + 1)
    const ent = snap.sections[section]
    const r = tally.routes.get(key)
    const route = r ? [...r].sort((a, b) => b[1] - a[1])[0]![0] : ''
    const depth = depthFor(ent, route)
    rows.push({ studentId, section, taken: n, route, depth, atLeast: !!ent?.atLeast, left: depth === null ? null : depth - n })
  }
  return rows
}

/* ------------------------------------------------------------------ *
 * Per-section supply and usage
 * ------------------------------------------------------------------ */

/** Whole tests' worth of items. null when the per-test size is unknown. */
export function testsWorth(items: number, perTest: number | null): number | null {
  if (perTest === null || !(perTest > 0)) return null
  return Math.floor(items / perTest)
}

/** Owner rule (memory: five-test floor): every section >= 5 clean tests, every student >= 5 left. */
export const LOW_TESTS = 5

export interface BankRowLite {
  id: string
  family: string
  section: string
  verified: boolean | null
  archived: boolean | null
}

export interface ReviewRowLite {
  item_id: string
  reviewer_kind: string | null
  reviewed_at: string | null
}

export interface SectionUsage {
  family: string
  section: string
  live: number
  staged: number
  /** Staged items with a human review row not yet finished (drawn into a sitting). */
  stagedInOpenReview: number
  /** Staged items a human has finished reviewing (awaiting release or hold). */
  stagedHumanReviewed: number
  /** Bank rows one test draws, from the assembler blueprints. */
  perTest: number | null
  liveTestsByDivision: number | null
  stagedTestsByDivision: number | null
  /** Measured depth from depth-snapshot.json (smallest path), or null. */
  measuredDepth: number | null
  measuredHardRoute: number | null
  measuredAtLeast: boolean
  /** The number the page leads with: measured depth if any, else division. */
  liveTests: number | null
  liveTestsSource: 'measured' | 'division' | null
  low: boolean
  completedTests: number
  studentsWithTests: number
  maxTestsOneStudent: number
  studentsUnder5Left: number
  studentsNoMeasurement: number
}

export function aggregateBankUsage(p: {
  bank: BankRowLite[]
  reviews: ReviewRowLite[]
  studentRows: StudentSectionRow[]
  snapshot: DepthSnapshot
  perTest: (family: string, section: string) => number | null
}): SectionUsage[] {
  const by = new Map<string, SectionUsage>()
  const get = (family: string, section: string): SectionUsage => {
    const k = `${family}/${section}`
    let s = by.get(k)
    if (!s) {
      s = {
        family, section, live: 0, staged: 0, stagedInOpenReview: 0, stagedHumanReviewed: 0,
        perTest: null, liveTestsByDivision: null, stagedTestsByDivision: null,
        measuredDepth: null, measuredHardRoute: null, measuredAtLeast: false,
        liveTests: null, liveTestsSource: null, low: false,
        completedTests: 0, studentsWithTests: 0, maxTestsOneStudent: 0,
        studentsUnder5Left: 0, studentsNoMeasurement: 0,
      }
      by.set(k, s)
    }
    return s
  }

  const openReview = new Set<string>()
  const humanReviewed = new Set<string>()
  for (const r of p.reviews) {
    if (r.reviewer_kind !== 'human') continue
    if (r.reviewed_at) humanReviewed.add(r.item_id)
    else openReview.add(r.item_id)
  }

  for (const b of p.bank) {
    if (b.archived === true) continue
    const s = get(b.family, b.section)
    if (b.verified === true) s.live++
    else if (b.verified === false) {
      s.staged++
      if (openReview.has(b.id)) s.stagedInOpenReview++
      else if (humanReviewed.has(b.id)) s.stagedHumanReviewed++
    }
  }

  for (const key of Object.keys(p.snapshot.sections)) {
    const [f, sec] = key.split('/')
    if (f && sec) get(f, sec)
  }

  for (const r of p.studentRows) {
    const [f, sec] = r.section.split('/')
    if (!f || !sec) continue
    const s = get(f, sec)
    s.completedTests += r.taken
    s.studentsWithTests++
    s.maxTestsOneStudent = Math.max(s.maxTestsOneStudent, r.taken)
    if (r.left === null) s.studentsNoMeasurement++
    else if (r.left < LOW_TESTS) s.studentsUnder5Left++
  }

  for (const s of by.values()) {
    s.perTest = p.perTest(s.family, s.section)
    s.liveTestsByDivision = testsWorth(s.live, s.perTest)
    s.stagedTestsByDivision = testsWorth(s.staged, s.perTest)
    const ent = p.snapshot.sections[`${s.family}/${s.section}`]
    s.measuredDepth = sectionDepth(ent)
    s.measuredHardRoute = typeof ent?.hardRoute === 'number' ? ent.hardRoute : null
    s.measuredAtLeast = !!ent?.atLeast
    if (s.measuredDepth !== null) { s.liveTests = s.measuredDepth; s.liveTestsSource = 'measured' }
    else if (s.liveTestsByDivision !== null) { s.liveTests = s.liveTestsByDivision; s.liveTestsSource = 'division' }
    s.low = s.liveTests !== null && s.liveTests < LOW_TESTS
  }

  const order = ['sat', 'act', 'toefl', 'ssat', 'isee', 'map']
  const rank = (f: string) => { const i = order.indexOf(f); return i < 0 ? order.length : i }
  return [...by.values()].sort((a, b) =>
    rank(a.family) - rank(b.family) || a.family.localeCompare(b.family) || a.section.localeCompare(b.section))
}
