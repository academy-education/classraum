/**
 * Real-student item statistics — the pure half of
 * scripts/study-bank/real-difficulty.ts.
 *
 * Every difficulty label in the bank is a model's estimate. The measurement
 * those labels stand in for is the share of real students who answer an item
 * correctly. study_attempts so far is mostly internal testing (memory:
 * attempts-data-contaminated), so the whole job of this file is deciding
 * which attempts are REAL, and refusing to print a number when there are too
 * few of them.
 *
 * ── A "real attempt" ─────────────────────────────────────────────────
 * Student level — any one of these excludes the student entirely:
 *   is_internal         users.is_internal (064), set explicitly by the team
 *   study_test_user     study_user_prefs.is_test_user (084), set in the admin
 *                       console. 44 accounts carry this and NOT is_internal;
 *                       the two flags were never unified.
 *   admin_role          users.role admin / super_admin
 *   staff               an active row in managers or teachers — a teacher
 *                       trying the student view is not a student
 *   test_academy        a student of an academies.is_test academy (101):
 *                       the demo, E2E and dev academies
 *   team_domain         an @classraum.com / @demo.classraum.com address. 064
 *                       already matches demo.classraum.com; classraum.com is
 *                       the team's own domain (the E2E camp account lives
 *                       there and carries no other flag)
 *   email_suppressed    on public.email_suppressions — the Manning test
 *                       accounts the owner asked us to stop mailing (111)
 *
 * Attempt level:
 *   no_item_id          before migration 063 attempts had no bank reference
 *   session_incomplete  status <> 'completed' or no completed_at
 *   mode_excluded       not a timed full test by default — practice shows
 *                       explanations mid-session and is self-paced
 *   app_exited          the session "completed" because the app closed
 *   unanswered          is_correct null (skipped / ran out of time)
 *   not_first_exposure  the student had already SEEN this item — in an
 *                       earlier session, or earlier in study_item_exposures
 *                       (served but unanswered still counts as seen)
 *   repeat_in_session   a second attempt row for the same item in one session
 *
 * Camp-assigned sessions (config.campAssignmentId) are kept but TAGGED: they
 * are real students under a teacher's schedule, and nothing in the schema
 * marks a camp "retake" — a camp student who sees an item twice is caught by
 * first-exposure like anyone else. The script prints camp counts apart so
 * the owner can decide.
 */

export type StudentExclusion =
  | 'is_internal' | 'study_test_user' | 'admin_role' | 'staff'
  | 'test_academy' | 'team_domain' | 'email_suppressed'

export interface StudentFacts {
  id: string
  role: string | null
  isInternal: boolean
  isStudyTestUser: boolean
  isStaff: boolean
  inTestAcademy: boolean
  emailDomain: string | null
  emailSuppressed: boolean
}

export const TEAM_DOMAINS = ['classraum.com', 'demo.classraum.com']

export function studentExclusions(f: StudentFacts): StudentExclusion[] {
  const out: StudentExclusion[] = []
  if (f.isInternal) out.push('is_internal')
  if (f.isStudyTestUser) out.push('study_test_user')
  if (f.role === 'admin' || f.role === 'super_admin') out.push('admin_role')
  if (f.isStaff) out.push('staff')
  if (f.inTestAcademy) out.push('test_academy')
  const d = (f.emailDomain ?? '').toLowerCase()
  if (TEAM_DOMAINS.includes(d)) out.push('team_domain')
  if (f.emailSuppressed) out.push('email_suppressed')
  return out
}

export interface AttemptRow {
  id: string
  sessionId: string
  itemId: string | null
  isCorrect: boolean | null
  createdAt: string
}

export interface SessionRow {
  id: string
  studentId: string
  status: string | null
  mode: string | null
  completedAt: string | null
  endedReason: string | null
  camp: boolean
}

export interface ExposureRow {
  studentId: string
  itemId: string
  sessionId: string | null
  seenAt: string
}

export type AttemptDrop =
  | 'no_item_id' | 'no_session' | 'excluded_student' | 'session_incomplete' | 'mode_excluded'
  | 'app_exited' | 'unanswered' | 'not_first_exposure' | 'repeat_in_session'

export interface RealAttempt {
  attemptId: string
  studentId: string
  sessionId: string
  itemId: string
  correct: boolean
  camp: boolean
}

export interface SelectOptions {
  modes?: string[]
}

/**
 * Filter attempts to real, first-exposure, completed ones. `excluded` is the
 * set of student ids with any StudentExclusion. Returns the survivors and a
 * count per drop reason (each attempt is dropped for its FIRST failing rule,
 * in the order listed in the header), so the denominators always add up.
 */
export function selectRealAttempts(
  attempts: AttemptRow[],
  sessions: SessionRow[],
  exposures: ExposureRow[],
  excluded: Set<string>,
  opts: SelectOptions = {},
): { kept: RealAttempt[]; dropped: Record<AttemptDrop, number>; total: number } {
  const modes = new Set(opts.modes ?? ['full_test'])
  const sess = new Map(sessions.map(s => [s.id, s]))
  const dropped: Record<AttemptDrop, number> = {
    no_item_id: 0, no_session: 0, excluded_student: 0, session_incomplete: 0, mode_excluded: 0,
    app_exited: 0, unanswered: 0, not_first_exposure: 0, repeat_in_session: 0,
  }

  // The first time each student met each item, across BOTH ledgers. An
  // exposure with a session id names the session it happened in; an attempt
  // always does. Ties on time resolve to the attempt's own session, so an
  // item served and answered in one session counts as first exposure there.
  const first = new Map<string, { at: string; sessionId: string | null }>()
  const consider = (studentId: string, itemId: string, at: string, sessionId: string | null) => {
    const k = `${studentId}\u0000${itemId}`
    const prev = first.get(k)
    if (!prev || at < prev.at || (at === prev.at && prev.sessionId === null)) first.set(k, { at, sessionId })
  }
  for (const e of exposures) consider(e.studentId, e.itemId, e.seenAt, e.sessionId)
  for (const a of attempts) {
    if (!a.itemId) continue
    const s = sess.get(a.sessionId)
    if (s) consider(s.studentId, a.itemId, a.createdAt, a.sessionId)
  }

  const kept: RealAttempt[] = []
  const usedInSession = new Set<string>()
  const sorted = [...attempts].sort((x, y) => x.createdAt.localeCompare(y.createdAt) || x.id.localeCompare(y.id))
  for (const a of sorted) {
    if (!a.itemId) { dropped.no_item_id++; continue }
    const s = sess.get(a.sessionId)
    if (!s) { dropped.no_session++; continue }
    if (excluded.has(s.studentId)) { dropped.excluded_student++; continue }
    if (s.status !== 'completed' || !s.completedAt) { dropped.session_incomplete++; continue }
    if (!modes.has(s.mode ?? '')) { dropped.mode_excluded++; continue }
    if (s.endedReason === 'app_exited') { dropped.app_exited++; continue }
    if (a.isCorrect === null) { dropped.unanswered++; continue }
    const f = first.get(`${s.studentId}\u0000${a.itemId}`)
    // An exposure without a session id that predates this attempt means the
    // item was seen somewhere we cannot name — not first exposure.
    if (!f || f.sessionId !== a.sessionId) { dropped.not_first_exposure++; continue }
    const k = `${a.sessionId}\u0000${a.itemId}`
    if (usedInSession.has(k)) { dropped.repeat_in_session++; continue }
    usedInSession.add(k)
    kept.push({ attemptId: a.id, studentId: s.studentId, sessionId: a.sessionId, itemId: a.itemId, correct: a.isCorrect, camp: s.camp })
  }
  return { kept, dropped, total: attempts.length }
}

// ── Per-item statistics ──────────────────────────────────────────────

export const DEFAULT_MIN_N = 30

export interface ItemStat {
  itemId: string
  n: number
  correct: number
  /** share correct; null below minN — never a number from too few students */
  p: number | null
  /** point-biserial of correctness against the student's REST score in the
   *  same session (the session's other answered items); null below minN or
   *  when either side has no variance */
  discrimination: number | null
  enough: boolean
}

/** Pearson correlation; null when either series is constant or n < 2. */
export function pearson(x: number[], y: number[]): number | null {
  const n = x.length
  if (n < 2 || y.length !== n) return null
  const mx = x.reduce((a, b) => a + b, 0) / n
  const my = y.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy
  }
  // A tolerance, not === 0: the mean of a constant series is not always
  // bit-identical to its members, and a 1e-17 variance must not print r=0.
  if (sxx < 1e-12 || syy < 1e-12) return null
  return sxy / Math.sqrt(sxx * syy)
}

/**
 * @param kept        real first-exposure attempts (selectRealAttempts)
 * @param sessionAnswers every ANSWERED attempt per session, real-or-not
 *                    filtering already applied at the session level — the
 *                    student's section score is a property of the whole
 *                    session, not only of the items that were first exposures
 */
export function itemStats(
  kept: RealAttempt[],
  sessionAnswers: Map<string, Array<{ itemId: string; correct: boolean }>>,
  minN = DEFAULT_MIN_N,
): Map<string, ItemStat> {
  const sessionTotals = new Map<string, { n: number; correct: number }>()
  for (const [sid, rows] of sessionAnswers) {
    // one row per item per session, first wins — matches selectRealAttempts
    const seen = new Set<string>()
    let n = 0, c = 0
    for (const r of rows) { if (seen.has(r.itemId)) continue; seen.add(r.itemId); n++; if (r.correct) c++ }
    sessionTotals.set(sid, { n, correct: c })
  }
  const by = new Map<string, RealAttempt[]>()
  for (const a of kept) (by.get(a.itemId) ?? by.set(a.itemId, []).get(a.itemId)!).push(a)
  const out = new Map<string, ItemStat>()
  for (const [itemId, rows] of by) {
    const n = rows.length
    const correct = rows.filter(r => r.correct).length
    const enough = n >= minN
    let discrimination: number | null = null
    if (enough) {
      const xs: number[] = [], ys: number[] = []
      for (const r of rows) {
        const t = sessionTotals.get(r.sessionId)
        if (!t || t.n < 2) continue
        xs.push(r.correct ? 1 : 0)
        ys.push((t.correct - (r.correct ? 1 : 0)) / (t.n - 1))
      }
      discrimination = xs.length >= minN ? pearson(xs, ys) : null
    }
    out.set(itemId, { itemId, n, correct, p: enough ? correct / n : null, discrimination, enough })
  }
  return out
}

/** How an item stat is printed. Below the threshold it is words, never a number. */
export function formatStat(s: ItemStat | undefined, minN = DEFAULT_MIN_N): string {
  if (!s || !s.enough) return `not enough data (n=${s?.n ?? 0} < ${minN})`
  const d = s.discrimination === null ? 'discrimination n/a' : `r=${s.discrimination.toFixed(2)}`
  return `p=${(s.p as number).toFixed(2)} n=${s.n} ${d}`
}

export interface Contradiction {
  itemId: string
  label: string
  p: number
  n: number
  discrimination: number | null
  kind: 'labelled_hard_but_easy' | 'labelled_easy_but_hard'
}

/** Items whose observed difficulty contradicts their label. Only items with
 *  enough data can appear. Reports; never relabels. */
export function contradictions(
  stats: Map<string, ItemStat>,
  labels: Map<string, string>,
  { hardAbove = 0.8, easyBelow = 0.3 } = {},
): Contradiction[] {
  const out: Contradiction[] = []
  for (const s of stats.values()) {
    if (!s.enough || s.p === null) continue
    const label = labels.get(s.itemId)
    if (label === 'hard' && s.p > hardAbove) out.push({ itemId: s.itemId, label, p: s.p, n: s.n, discrimination: s.discrimination, kind: 'labelled_hard_but_easy' })
    if (label === 'easy' && s.p < easyBelow) out.push({ itemId: s.itemId, label, p: s.p, n: s.n, discrimination: s.discrimination, kind: 'labelled_easy_but_hard' })
  }
  return out.sort((a, b) => b.n - a.n || a.itemId.localeCompare(b.itemId))
}
