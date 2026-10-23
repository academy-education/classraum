import {
  classifyWork, isCompletedLate, isDueToday, isLate, isMissing, isNotStarted, isOverdue,
  needsAttention, studentCategory, summarizeWork, type CampWorkItem,
} from '../metrics'

// 2026-10-23 12:00 KST
const now = new Date('2026-10-23T03:00:00Z')
const PAST = '2026-10-22T14:59:59Z'       // 2026-10-22 23:59:59 KST
const LATER_TODAY = '2026-10-23T14:59:59Z' // 2026-10-23 23:59:59 KST
const TOMORROW = '2026-10-24T14:59:59Z'

const w = (p: Partial<CampWorkItem>): CampWorkItem => ({ dueAt: null, started: false, completed: false, completedAt: null, ...p })

describe('single definitions', () => {
  it('overdue = past due and not completed, started or not', () => {
    expect(isOverdue(w({ dueAt: PAST }), now)).toBe(true)
    expect(isOverdue(w({ dueAt: PAST, started: true }), now)).toBe(true)
    expect(isOverdue(w({ dueAt: PAST, started: true, completed: true }), now)).toBe(false)
    expect(isOverdue(w({ dueAt: LATER_TODAY }), now)).toBe(false)
    expect(isOverdue(w({ dueAt: null }), now)).toBe(false)
  })

  it('compares instants, not strings (+00:00 vs Z)', () => {
    expect(isOverdue(w({ dueAt: '2026-10-23T02:59:59+00:00' }), now)).toBe(true)
    expect(isOverdue(w({ dueAt: '2026-10-23T03:00:01+00:00' }), now)).toBe(false)
  })

  it('late = started, unfinished, past due; missing = never started, past due', () => {
    expect(isLate(w({ dueAt: PAST, started: true }), now)).toBe(true)
    expect(isLate(w({ dueAt: PAST }), now)).toBe(false)
    expect(isMissing(w({ dueAt: PAST }), now)).toBe(true)
    expect(isMissing(w({ dueAt: PAST, started: true }), now)).toBe(false)
  })

  it('not started = no session, whatever the due date', () => {
    expect(isNotStarted(w({ dueAt: TOMORROW }))).toBe(true)
    expect(isNotStarted(w({ started: true }))).toBe(false)
  })

  it('completed late = completed after due_at', () => {
    expect(isCompletedLate(w({ dueAt: PAST, started: true, completed: true, completedAt: '2026-10-23T01:00:00Z' }))).toBe(true)
    expect(isCompletedLate(w({ dueAt: PAST, started: true, completed: true, completedAt: '2026-10-22T10:00:00Z' }))).toBe(false)
    expect(isCompletedLate(w({ dueAt: null, completed: true, completedAt: '2026-10-23T01:00:00Z' }))).toBe(false)
  })

  it('due today uses the Korean date and excludes what is already overdue', () => {
    expect(isDueToday(w({ dueAt: LATER_TODAY }), now)).toBe(true)
    expect(isDueToday(w({ dueAt: TOMORROW }), now)).toBe(false)
    expect(isDueToday(w({ dueAt: PAST }), now)).toBe(false)
    // 08:30 KST on the 23rd = still the 22nd in UTC; a deadline at 23:59 KST on the 23rd is due "today"
    expect(isDueToday(w({ dueAt: LATER_TODAY }), new Date('2026-10-22T23:30:00Z'))).toBe(true)
  })

  it('classifyWork matches the donut buckets', () => {
    expect(classifyWork(w({ completed: true, started: true }), now)).toBe('completed')
    expect(classifyWork(w({ dueAt: PAST, started: true }), now)).toBe('late')
    expect(classifyWork(w({ dueAt: PAST }), now)).toBe('missing')
    expect(classifyWork(w({ dueAt: TOMORROW }), now)).toBe('open')
  })
})

describe('per-student summary and category', () => {
  it('counts each definition once per item', () => {
    const s = summarizeWork([
      w({ dueAt: PAST }),                                            // overdue, missing, not started
      w({ dueAt: PAST, started: true }),                             // overdue, late
      w({ dueAt: LATER_TODAY }),                                     // not started, due today
      w({ dueAt: PAST, started: true, completed: true, completedAt: '2026-10-23T01:00:00Z' }), // completed late
    ], now)
    expect(s).toEqual({
      total: 4, completed: 1, started: 2, overdue: 2, late: 1, missing: 1,
      notStarted: 2, completedLate: 1, dueTodayNotStarted: 1,
    })
    expect(needsAttention(s)).toBe(true)
  })

  it('needs attention for a single unstarted item due today, and not for future work', () => {
    expect(needsAttention(summarizeWork([w({ dueAt: LATER_TODAY })], now))).toBe(true)
    expect(needsAttention(summarizeWork([w({ dueAt: TOMORROW })], now))).toBe(false)
  })

  it('category precedence: overdue > not started > on track', () => {
    expect(studentCategory({ total: 2, started: 1, overdue: 1 })).toBe('overdue')
    expect(studentCategory({ total: 2, started: 0, overdue: 2 })).toBe('overdue')
    expect(studentCategory({ total: 2, started: 0, overdue: 0 })).toBe('not_started')
    expect(studentCategory({ total: 2, started: 1, overdue: 0 })).toBe('on_track')
    expect(studentCategory({ total: 0, started: 0, overdue: 0 })).toBe('on_track')
  })
})
