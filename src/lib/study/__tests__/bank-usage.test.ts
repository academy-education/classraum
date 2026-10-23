/** @jest-environment node */
import {
  aggregateBankUsage, depthFor, realStudentIds, studentSectionRows, tallyFullTests,
  taskMixBySession, testsWorth, toeflPathFromTaskMix,
  type BankRowLite, type DepthSnapshot, type ExclusionTables, type SessionFactsRow,
} from '../bank-usage'
import { bankRowsPerTest } from '../bank-test-size'

// assemble.ts (toeflSectionShape) imports the service-role client at module
// scope; the shape function itself is pure.
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

const NO_EXCLUSIONS: ExclusionTables = { prefs: [], managers: [], teachers: [], students: [], academies: [], suppressions: [] }

describe('testsWorth', () => {
  it('counts WHOLE tests, never rounding a partial one up', () => {
    expect(testsWorth(539, 54)).toBe(9)
    expect(testsWorth(540, 54)).toBe(10)
    expect(testsWorth(53, 54)).toBe(0)
    expect(testsWorth(0, 54)).toBe(0)
  })
  it('returns null, not a number, when the per-test size is unknown', () => {
    expect(testsWorth(100, null)).toBeNull()
    expect(testsWorth(100, 0)).toBeNull()
  })
})

describe('bankRowsPerTest reads the blueprints', () => {
  it('SAT is two modules, ACT one block, ISEE math sums both math blocks', () => {
    expect(bankRowsPerTest('sat', 'reading_writing')).toBe(54)
    expect(bankRowsPerTest('sat', 'math')).toBe(44)
    expect(bankRowsPerTest('act', 'english')).toBe(50)
    expect(bankRowsPerTest('act', 'science')).toBe(40)
    expect(bankRowsPerTest('isee', 'math')).toBe(37 + 47)
    expect(bankRowsPerTest('ssat', 'verbal')).toBe(60)
    expect(bankRowsPerTest('map', 'language')).toBe(39)
  })
  it('TOEFL counts bank ROWS: a Complete-the-Words paragraph is one row, ten questions', () => {
    // 48 scored-convention questions per path, but 30 rows (2 CtW + 28 MC).
    expect(bankRowsPerTest('toefl', 'reading')).toBe(30)
    expect(bankRowsPerTest('toefl', 'listening')).toBe(48)
    expect(bankRowsPerTest('toefl', 'speaking')).toBe(11)
    expect(bankRowsPerTest('toefl', 'writing')).toBe(12)
  })
  it('unknown sections are null', () => {
    expect(bankRowsPerTest('gre', 'verbal')).toBeNull()
    expect(bankRowsPerTest('toefl', 'grammar')).toBeNull()
  })
})

describe('realStudentIds', () => {
  const users = [
    { id: 'real', role: 'student', is_internal: false, email: 'a@x.com' },
    { id: 'internal', role: 'student', is_internal: true, email: 'b@x.com' },
    { id: 'testuser', role: 'student', is_internal: false, email: 'c@x.com' },
    { id: 'admin', role: 'admin', is_internal: false, email: 'd@x.com' },
    { id: 'teacher', role: 'student', is_internal: false, email: 'e@x.com' },
    { id: 'testacad', role: 'student', is_internal: false, email: 'f@x.com' },
    { id: 'demo', role: 'student', is_internal: false, email: 'g@demo.classraum.com' },
    { id: 'suppressed', role: 'student', is_internal: false, email: ' H@X.com ' },
  ]
  it('applies every studentExclusions reason', () => {
    const real = realStudentIds(users, {
      prefs: [{ student_id: 'testuser', is_test_user: true }, { student_id: 'real', is_test_user: false }],
      managers: [], teachers: [{ user_id: 'teacher' }],
      students: [{ user_id: 'testacad', academy_id: 'A1' }, { user_id: 'real', academy_id: 'A2' }],
      academies: [{ id: 'A1', is_test: true }, { id: 'A2', is_test: false }],
      suppressions: [{ email: 'h@x.com' }],
    })
    expect([...real]).toEqual(['real'])
  })
})

describe('TOEFL path inference', () => {
  it('reads the module-2 path off the task mix', () => {
    expect(toeflPathFromTaskMix(new Map([['academic_passage', 18]]), 'reading')).toBe('upper')
    expect(toeflPathFromTaskMix(new Map([['academic_passage', 8], ['daily_life', 20]]), 'reading')).toBe('lower')
    expect(toeflPathFromTaskMix(new Map([['academic_talk', 16]]), 'listening')).toBe('upper')
    expect(toeflPathFromTaskMix(new Map([['academic_talk', 4], ['announcement', 12]]), 'listening')).toBe('lower')
    expect(toeflPathFromTaskMix(undefined, 'reading')).toBeNull()
  })
  it('a student uses their path; an unknown path falls back to the SMALLEST depth', () => {
    const e = { byPath: { 'upper/hard': 20, 'lower/easy': 14 } }
    expect(depthFor(e, 'upper/hard')).toBe(20)
    expect(depthFor(e, '?/hard')).toBe(14)
    expect(depthFor({ value: 6 }, '')).toBe(6)
    expect(depthFor(undefined, '')).toBeNull()
  })
})

/* A fixture small enough to count by hand. */
const snap: DepthSnapshot = {
  measured: '2026-10-22',
  sections: {
    'ssat/reading': { value: 6 },
    'toefl/reading': { byPath: { 'upper/hard': 20, 'lower/medium': 14 } },
    'act/science': { value: 3 },
  },
}
const sess = (id: string, student: string, family: string, section: string, extra: Partial<SessionFactsRow> = {}): SessionFactsRow => ({
  id, student_id: student, mode: 'full_test', completed_at: '2026-10-01', module2_route: null,
  config: { family, section }, ...extra,
})
const sessions: SessionFactsRow[] = [
  // s1: 4 SSAT reading -> 2 left (under 5)
  sess('a1', 's1', 'ssat', 'reading'), sess('a2', 's1', 'ssat', 'reading'),
  sess('a3', 's1', 'ssat', 'reading'), sess('a4', 's1', 'ssat', 'reading'),
  // s2: 1 SSAT reading -> 5 left (NOT under 5: the bar is strict)
  sess('b1', 's2', 'ssat', 'reading'),
  // never counted: practice, unfinished, a non-real student, no family
  sess('x1', 's2', 'ssat', 'reading', { mode: 'practice' }),
  sess('x2', 's2', 'ssat', 'reading', { completed_at: null }),
  sess('x3', 'internal', 'ssat', 'reading'),
  sess('x4', 's2', 'ssat', 'reading', { config: { section: 'reading' } }),
  // s3: two TOEFL reading on the upper/hard route -> 20 - 2 = 18 left
  sess('t1', 's3', 'toefl', 'reading', { module2_route: 'hard' }),
  sess('t2', 's3', 'toefl', 'reading', { module2_route: 'hard' }),
  // s4: SAT R&W, no snapshot entry -> no measurement, never a number
  sess('m1', 's4', 'sat', 'reading_writing'),
]
const real = new Set(['s1', 's2', 's3', 's4'])
const attempts = [
  ...Array.from({ length: 18 }, (_, i) => ({ session_id: 't1', item_id: `ap${i}` })),
  ...Array.from({ length: 18 }, (_, i) => ({ session_id: 't2', item_id: `ap${i}` })),
]
const taskOf = new Map<string, string | null>(Array.from({ length: 18 }, (_, i) => [`ap${i}`, 'academic_passage']))

const bank: BankRowLite[] = [
  ...Array.from({ length: 85 }, (_, i) => ({ id: `r${i}`, family: 'ssat', section: 'reading', verified: true, archived: false })),
  ...Array.from({ length: 81 }, (_, i) => ({ id: `rs${i}`, family: 'ssat', section: 'reading', verified: false, archived: false })),
  // archived rows count nowhere, staged or live
  ...Array.from({ length: 500 }, (_, i) => ({ id: `ra${i}`, family: 'ssat', section: 'reading', verified: false, archived: true })),
  { id: 'map1', family: 'map', section: 'math', verified: true, archived: null },
]
const reviews = [
  { item_id: 'rs0', reviewer_kind: 'human', reviewed_at: null },
  { item_id: 'rs1', reviewer_kind: 'human', reviewed_at: '2026-10-20' },
  { item_id: 'rs2', reviewer_kind: 'model_assisted', reviewed_at: null }, // a model run is not a sitting
  { item_id: 'r0', reviewer_kind: 'human', reviewed_at: null },           // live item: not staged
]

function build() {
  const mix = taskMixBySession(attempts, taskOf)
  const tally = tallyFullTests(sessions, real, (sid, sec) => toeflPathFromTaskMix(mix.get(sid), sec))
  const rows = studentSectionRows(tally, snap)
  const out = aggregateBankUsage({ bank, reviews, studentRows: rows, snapshot: snap, perTest: bankRowsPerTest })
  return { rows, out, by: (k: string) => out.find(s => `${s.family}/${s.section}` === k)! }
}

describe('aggregateBankUsage', () => {
  it('counts live and staged, excluding archived, and splits human review state', () => {
    const r = build().by('ssat/reading')
    expect(r.live).toBe(85)
    expect(r.staged).toBe(81)
    expect(r.stagedInOpenReview).toBe(1)
    expect(r.stagedHumanReviewed).toBe(1)
  })

  it('tests worth = whole tests at the blueprint size (SSAT reading 40/test)', () => {
    const r = build().by('ssat/reading')
    expect(r.perTest).toBe(40)
    expect(r.liveTestsByDivision).toBe(2)   // 85 / 40
    expect(r.stagedTestsByDivision).toBe(2) // 81 / 40
  })

  it('leads with the MEASURED depth when the snapshot has one, else the division', () => {
    const { by } = build()
    expect(by('ssat/reading').liveTests).toBe(6)
    expect(by('ssat/reading').liveTestsSource).toBe('measured')
    expect(by('ssat/reading').low).toBe(false)
    expect(by('map/math').liveTests).toBe(0)
    expect(by('map/math').liveTestsSource).toBe('division')
    expect(by('map/math').low).toBe(true)
    // In the snapshot, absent from the bank: still a row, still flagged.
    expect(by('act/science').liveTests).toBe(3)
    expect(by('act/science').low).toBe(true)
  })

  it('usage: completed real full tests, the most by one student, students under 5 left', () => {
    const r = build().by('ssat/reading')
    expect(r.completedTests).toBe(5)
    expect(r.studentsWithTests).toBe(2)
    expect(r.maxTestsOneStudent).toBe(4)
    expect(r.studentsUnder5Left).toBe(1)
  })

  it('TOEFL uses the inferred path depth, not the smallest', () => {
    const { rows, by } = build()
    const s3 = rows.find(x => x.studentId === 's3')!
    expect(s3.route).toBe('upper/hard')
    expect(s3.left).toBe(18)
    expect(by('toefl/reading').studentsUnder5Left).toBe(0)
  })

  it('an unmeasured section reports no-measurement, never a tests-left number', () => {
    const { rows, by } = build()
    expect(rows.find(x => x.studentId === 's4')!.left).toBeNull()
    expect(by('sat/reading_writing').studentsNoMeasurement).toBe(1)
    expect(by('sat/reading_writing').studentsUnder5Left).toBe(0)
  })

  it('works on more than 1000 rows (no implicit page cap in the arithmetic)', () => {
    const big: BankRowLite[] = Array.from({ length: 2500 }, (_, i) => ({ id: `b${i}`, family: 'sat', section: 'math', verified: true, archived: false }))
    const out = aggregateBankUsage({ bank: big, reviews: [], studentRows: [], snapshot: { measured: 'x', sections: {} }, perTest: bankRowsPerTest })
    expect(out[0]!.live).toBe(2500)
    expect(out[0]!.liveTestsByDivision).toBe(56) // 2500 / 44
  })

  it('a non-real student contributes nothing', () => {
    const tally = tallyFullTests(sessions, new Set(), () => null)
    expect(tally.taken.size).toBe(0)
    expect(realStudentIds([], NO_EXCLUSIONS).size).toBe(0)
  })
})
