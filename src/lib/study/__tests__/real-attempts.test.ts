/** @jest-environment node */
import {
  selectRealAttempts, itemStats, contradictions, formatStat, studentExclusions, pearson,
  type AttemptRow, type SessionRow, type ExposureRow, type StudentFacts,
} from '@/lib/study/real-attempts'
import { isTestAccount } from '@/lib/study/test-accounts'

const facts = (over: Partial<StudentFacts> = {}): StudentFacts => ({
  id: 'u', role: 'student', isInternal: false, isStudyTestUser: false, isStaff: false,
  inTestAcademy: false, emailDomain: 'gmail.com', emailSuppressed: false, ...over,
})

describe('studentExclusions', () => {
  it('a plain student is real', () => expect(studentExclusions(facts())).toEqual([]))
  it.each([
    ['is_internal', { isInternal: true }],
    ['study_test_user', { isStudyTestUser: true }],
    ['admin_role', { role: 'super_admin' }],
    ['admin_role', { role: 'admin' }],
    ['staff', { isStaff: true }],
    ['test_academy', { inTestAcademy: true }],
    ['demo_domain', { emailDomain: 'demo.classraum.com' }],
    ['demo_domain', { emailDomain: 'Demo.Classraum.com' }],
    ['email_suppressed', { emailSuppressed: true }],
  ])('%s excludes', (reason, over) => expect(studentExclusions(facts(over as Partial<StudentFacts>))).toContain(reason))
  it('a lookalike domain is not the demo domain', () => expect(studentExclusions(facts({ emailDomain: 'notclassraum.com' }))).toEqual([]))
  // Owner decision 2026-10-07: a flag decides, never the team's own address.
  it('@classraum.com alone does NOT exclude', () => expect(studentExclusions(facts({ emailDomain: 'classraum.com' }))).toEqual([]))
  it('the two test flags are one decision: either alone excludes, and agrees with isTestAccount', () => {
    for (const [isInternal, isStudyTestUser] of [[false, false], [true, false], [false, true], [true, true]]) {
      const ex = studentExclusions(facts({ isInternal, isStudyTestUser }))
      const flagged = ex.includes('is_internal') || ex.includes('study_test_user')
      expect(flagged).toBe(isTestAccount({ isInternal, isStudyTestUser }))
      expect(flagged).toBe(isInternal || isStudyTestUser)
    }
  })
})

const S = (id: string, over: Partial<SessionRow> = {}): SessionRow => ({
  id, studentId: 'st1', status: 'completed', mode: 'full_test', completedAt: '2026-10-01T10:00:00Z', endedReason: null, camp: false, ...over,
})
const A = (id: string, sessionId: string, itemId: string | null, isCorrect: boolean | null, createdAt: string): AttemptRow => ({ id, sessionId, itemId, isCorrect, createdAt })

describe('selectRealAttempts', () => {
  const sessions = [
    S('s1'),
    S('s2'),                                   // later session, same student
    S('s-active', { status: 'active', completedAt: null }),
    S('s-practice', { mode: 'practice' }),
    S('s-exit', { endedReason: 'app_exited' }),
    S('s-int', { studentId: 'internal' }),
    S('s-camp', { studentId: 'st2', camp: true }),
  ]
  const attempts = [
    A('a1', 's1', 'i1', true, '2026-10-01T09:00:00Z'),
    A('a2', 's2', 'i1', false, '2026-10-02T09:00:00Z'),         // second exposure to i1
    A('a3', 's1', null, true, '2026-10-01T09:01:00Z'),
    A('a4', 's-active', 'i2', true, '2026-10-01T09:02:00Z'),
    A('a5', 's-practice', 'i3', true, '2026-10-01T09:03:00Z'),
    A('a6', 's-exit', 'i4', true, '2026-10-01T09:04:00Z'),
    A('a7', 's1', 'i5', null, '2026-10-01T09:05:00Z'),
    A('a8', 's-int', 'i6', true, '2026-10-01T09:06:00Z'),
    A('a9', 's1', 'i1', false, '2026-10-01T09:07:00Z'),          // duplicate row same session
    A('a10', 's2', 'i7', true, '2026-10-02T09:01:00Z'),          // seen (unanswered) earlier via exposure
    A('a11', 's-camp', 'i8', false, '2026-10-01T09:08:00Z'),
  ]
  const exposures: ExposureRow[] = [
    { studentId: 'st1', itemId: 'i7', firstSessionId: 's1', firstSeenAt: '2026-10-01T08:59:00Z' },
  ]
  const r = selectRealAttempts(attempts, sessions, exposures, new Set(['internal']))

  it('keeps exactly the real first exposures', () => {
    expect(r.kept.map(k => k.attemptId).sort()).toEqual(['a1', 'a11'])
  })
  it('drops each attempt for its first failing rule, and the counts add up', () => {
    expect(r.dropped).toMatchObject({
      no_item_id: 1, excluded_student: 1, session_incomplete: 1, mode_excluded: 1,
      app_exited: 1, unanswered: 1, not_first_exposure: 2, repeat_in_session: 1,
    })
    expect(Object.values(r.dropped).reduce((a, b) => a + b, 0) + r.kept.length).toBe(r.total)
  })
  it('tags camp sessions instead of dropping them', () => {
    expect(r.kept.find(k => k.attemptId === 'a11')?.camp).toBe(true)
  })
  it('counts practice when asked to', () => {
    const p = selectRealAttempts(attempts, sessions, exposures, new Set(['internal']), { modes: ['full_test', 'practice'] })
    expect(p.kept.map(k => k.attemptId)).toContain('a5')
  })
  it('an exposure with no session that predates the attempt means not first', () => {
    const r2 = selectRealAttempts([A('x', 's1', 'iz', true, '2026-10-01T09:00:00Z')], sessions,
      [{ studentId: 'st1', itemId: 'iz', firstSessionId: null, firstSeenAt: '2026-09-01T00:00:00Z' }], new Set())
    expect(r2.kept).toHaveLength(0)
    expect(r2.dropped.not_first_exposure).toBe(1)
  })
  // Migration 126: an item served in s1, left unanswered, then RE-served in
  // s2. The exposure row's seen_at/session_id now say s2; first_seen says s1.
  // Reading first_seen, the s2 answer is not a first exposure.
  it('a re-served item is judged by its FIRST sighting, not the latest serve', () => {
    const att = [A('re', 's2', 'ir', true, '2026-10-02T09:05:00Z')]
    const first = selectRealAttempts(att, sessions,
      [{ studentId: 'st1', itemId: 'ir', firstSessionId: 's1', firstSeenAt: '2026-10-01T08:58:00Z' }], new Set())
    expect(first.kept).toHaveLength(0)
    expect(first.dropped.not_first_exposure).toBe(1)
    // the pre-126 reading (latest serve = s2) would have kept it — the bug
    const latest = selectRealAttempts(att, sessions,
      [{ studentId: 'st1', itemId: 'ir', firstSessionId: 's2', firstSeenAt: '2026-10-02T09:00:00Z' }], new Set())
    expect(latest.kept.map(k => k.attemptId)).toEqual(['re'])
  })
})

describe('itemStats', () => {
  // 30 students, one session each, two items: "good" tracks the rest score,
  // "flat" is answered right by everyone.
  const kept = [] as ReturnType<typeof selectRealAttempts>['kept']
  const answers = new Map<string, Array<{ itemId: string; correct: boolean }>>()
  for (let i = 0; i < 30; i++) {
    const sid = `s${i}`
    const strong = i >= 15
    const rows = [
      { itemId: 'good', correct: strong },
      { itemId: 'flat', correct: true },
      ...Array.from({ length: 8 }, (_, j) => ({ itemId: `o${j}`, correct: strong ? j < 7 : j < 2 })),
    ]
    answers.set(sid, rows)
    kept.push({ attemptId: `g${i}`, studentId: `u${i}`, sessionId: sid, itemId: 'good', correct: strong, camp: false })
    kept.push({ attemptId: `f${i}`, studentId: `u${i}`, sessionId: sid, itemId: 'flat', correct: true, camp: false })
  }
  kept.push({ attemptId: 'r1', studentId: 'u0', sessionId: 's0', itemId: 'rare', correct: true, camp: false })

  const stats = itemStats(kept, answers, 30)
  it('computes p and a positive discrimination for an item that separates students', () => {
    const g = stats.get('good')!
    expect(g).toMatchObject({ n: 30, correct: 15, p: 0.5, enough: true })
    expect(g.discrimination).toBeGreaterThan(0.8)
  })
  it('discrimination is null, not 0, when everyone got it right', () => {
    expect(stats.get('flat')!.discrimination).toBeNull()
    expect(stats.get('flat')!.p).toBe(1)
  })
  it('below the threshold there is no number at all', () => {
    const rare = stats.get('rare')!
    expect(rare.p).toBeNull()
    expect(rare.discrimination).toBeNull()
    expect(formatStat(rare, 30)).toBe('not enough data (n=1 < 30)')
    expect(formatStat(undefined, 30)).toBe('not enough data (n=0 < 30)')
    expect(formatStat(stats.get('good'), 30)).toMatch(/^p=0\.50 n=30 r=/)
  })
  it('the rest score excludes the item itself (otherwise r is inflated)', () => {
    // Every student gets the same score on the OTHER items. Excluding the item,
    // the rest score is constant, so there is no discrimination to report.
    // Including it (the bug), the "rest" would move with the item and r = 1.
    const k2 = kept.filter(k => k.itemId === 'good').map((k, i) => ({ ...k, correct: i % 2 === 0 }))
    const a2 = new Map([...answers].map(([sid, rows], i) => [sid, rows.map(r => r.itemId === 'good' ? { ...r, correct: i % 2 === 0 } : { ...r, correct: r.itemId.startsWith('o') ? r.itemId < 'o4' : r.correct })]))
    const r = itemStats(k2, a2, 30).get('good')!
    expect(r.discrimination).toBeNull()      // rest score constant across students -> no variance
  })
})

describe('contradictions', () => {
  it('flags hard-but-easy and easy-but-hard only with enough data, and never relabels', () => {
    const stats = new Map([
      ['h', { itemId: 'h', n: 40, correct: 36, p: 0.9, discrimination: 0.2, enough: true }],
      ['e', { itemId: 'e', n: 35, correct: 7, p: 0.2, discrimination: 0.1, enough: true }],
      ['m', { itemId: 'm', n: 50, correct: 45, p: 0.9, discrimination: 0.3, enough: true }],
      ['thin', { itemId: 'thin', n: 5, correct: 5, p: null, discrimination: null, enough: false }],
    ])
    const labels = new Map([['h', 'hard'], ['e', 'easy'], ['m', 'medium'], ['thin', 'hard']])
    const c = contradictions(stats, labels)
    expect(c.map(x => [x.itemId, x.kind])).toEqual([['h', 'labelled_hard_but_easy'], ['e', 'labelled_easy_but_hard']])
    expect(labels.get('h')).toBe('hard')
  })
  it('pearson refuses a constant series', () => {
    expect(pearson([1, 1, 1], [0, 1, 2])).toBeNull()
    expect(pearson([0, 1], [0, 1])).toBeCloseTo(1)
  })
})
