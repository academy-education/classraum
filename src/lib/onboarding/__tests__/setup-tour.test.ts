/** @jest-environment node */
/**
 * The setup tour's decidable half.
 *
 * What is actually being defended here is the ORDER. The dashboard
 * checklist has always listed "create a classroom" first, and on a
 * brand-new academy that step is impossible: the create button is
 * disabled without a teacher_id and the teacher dropdown reads the
 * `teachers` table, which a fresh manager's signup never writes to.
 * If a future edit reorders these steps back into checklist order,
 * `orders every dependency before its dependent` must fail — and the
 * break-tests at the bottom of this file prove it does, by feeding the
 * validator the broken orders and asserting it complains.
 */
import {
  SETUP_TOUR_STEPS,
  EMPTY_COUNTS,
  type SetupCounts,
  type SetupTourStep,
  visibleSteps,
  isStepComplete,
  isStepUnlocked,
  firstIncompleteStepIndex,
  resumeStepIndex,
  completedCount,
  validateStepOrder,
  parseTourState,
  isTourRunning,
  placeCard,
  EMPTY_TOUR_STATE,
} from '../setup-tour'

const counts = (over: Partial<SetupCounts> = {}): SetupCounts => ({ ...EMPTY_COUNTS, ...over })
const byId = (id: string): SetupTourStep => {
  const s = SETUP_TOUR_STEPS.find(x => x.id === id)
  if (!s) throw new Error(`no step ${id}`)
  return s
}

describe('step ordering', () => {
  it('orders every dependency before its dependent', () => {
    expect(validateStepOrder()).toEqual([])
  })

  it('puts the teacher invite before the classroom, because the classroom cannot be saved without one', () => {
    const ids = SETUP_TOUR_STEPS.map(s => s.id)
    expect(ids.indexOf('teachers')).toBeLessThan(ids.indexOf('classroom'))
    expect(byId('classroom').requires).toContain('teachers')
  })

  it('encodes the two NOT NULL foreign keys as hard requirements', () => {
    expect(byId('session').requires).toContain('classroom')
    expect(byId('assignment').requires).toContain('session')
  })

  it('gives every step a data-tour anchor and a route, never a coordinate', () => {
    for (const s of SETUP_TOUR_STEPS) {
      expect(s.anchor).toMatch(/^\[data-tour="[a-z-]+"\]$/)
      expect(s.route).toMatch(/^\/[a-z]+$/)
    }
  })

  it('gives every step a distinct anchor', () => {
    const anchors = SETUP_TOUR_STEPS.map(s => s.anchor)
    expect(new Set(anchors).size).toBe(anchors.length)
  })
})

describe('visibleSteps', () => {
  it('gives a manager every step', () => {
    expect(visibleSteps('manager').map(s => s.id)).toEqual(SETUP_TOUR_STEPS.map(s => s.id))
  })

  it('drops the teacher-invite step for a teacher', () => {
    expect(visibleSteps('teacher').map(s => s.id)).not.toContain('teachers')
  })

  it('also drops the dangling requirement, so a teacher is not locked out of the classroom step', () => {
    const teacherSteps = visibleSteps('teacher')
    const classroom = teacherSteps.find(s => s.id === 'classroom')!
    expect(classroom.requires).not.toContain('teachers')
    // The load-bearing consequence: unlocked on a completely empty academy.
    expect(isStepUnlocked(classroom, EMPTY_COUNTS, teacherSteps)).toBe(true)
    expect(validateStepOrder(teacherSteps)).toEqual([])
  })

  it('leaves a manager locked out of the classroom step until a teacher exists', () => {
    const managerSteps = visibleSteps('manager')
    const classroom = managerSteps.find(s => s.id === 'classroom')!
    expect(isStepUnlocked(classroom, EMPTY_COUNTS, managerSteps)).toBe(false)
    expect(isStepUnlocked(classroom, counts({ teachers: 1 }), managerSteps)).toBe(true)
  })

  it('does not mutate the shared step list', () => {
    const before = JSON.stringify(SETUP_TOUR_STEPS)
    visibleSteps('teacher')
    expect(JSON.stringify(SETUP_TOUR_STEPS)).toBe(before)
  })
})

describe('completion detection', () => {
  it('reads each step from its own counter', () => {
    expect(isStepComplete(byId('classroom'), counts({ classrooms: 1 }))).toBe(true)
    expect(isStepComplete(byId('classroom'), counts({ sessions: 9 }))).toBe(false)
    expect(isStepComplete(byId('assignment'), counts({ assignments: 1 }))).toBe(true)
  })

  it('walks the chain as an academy fills up', () => {
    expect(firstIncompleteStepIndex(EMPTY_COUNTS)).toBe(0)
    expect(firstIncompleteStepIndex(counts({ teachers: 1 }))).toBe(1)
    expect(firstIncompleteStepIndex(counts({ teachers: 1, classrooms: 2 }))).toBe(2)
    expect(firstIncompleteStepIndex(counts({ teachers: 1, classrooms: 2, students: 5 }))).toBe(3)
    expect(firstIncompleteStepIndex(counts({ teachers: 1, classrooms: 2, students: 5, sessions: 3 }))).toBe(4)
  })

  it('returns -1 — not 0 — once every step is done', () => {
    const all = counts({ teachers: 1, classrooms: 1, students: 1, sessions: 1, assignments: 1 })
    expect(firstIncompleteStepIndex(all)).toBe(-1)
    expect(completedCount(all)).toBe(SETUP_TOUR_STEPS.length)
  })

  it('skips a step that was completed out of order rather than stalling on it', () => {
    // A user who imported families before touching classrooms.
    expect(firstIncompleteStepIndex(counts({ students: 40 }))).toBe(0)
    expect(completedCount(counts({ students: 40 }))).toBe(1)
  })
})

describe('resume', () => {
  it('uses the first incomplete step when nothing is saved', () => {
    expect(resumeStepIndex(counts({ teachers: 1 }), null)).toBe(1)
  })

  it('honours a saved step that is still outstanding', () => {
    // teachers + classroom done; saved on "session" though "students" is open.
    expect(resumeStepIndex(counts({ teachers: 1, classrooms: 1 }), 'session')).toBe(3)
  })

  it('does not re-show a step the user already completed elsewhere', () => {
    expect(resumeStepIndex(counts({ teachers: 1, classrooms: 4 }), 'classroom')).toBe(2)
  })

  it('does not resume onto a locked step', () => {
    // Saved on "assignment" but there are no sessions — the create modal
    // would render "no sessions available" and trap them.
    expect(resumeStepIndex(counts({ teachers: 1, classrooms: 1, students: 1 }), 'assignment')).toBe(3)
  })

  it('treats a renamed/unknown saved id as no saved id', () => {
    expect(resumeStepIndex(EMPTY_COUNTS, 'attendance-setup')).toBe(0)
  })

  it('returns -1 for a fully set-up academy regardless of what was saved', () => {
    const all = counts({ teachers: 1, classrooms: 1, students: 1, sessions: 1, assignments: 1 })
    expect(resumeStepIndex(all, 'classroom')).toBe(-1)
  })
})

describe('stored state parsing', () => {
  it('degrades to empty on null, junk, wrong shape and unknown step ids', () => {
    expect(parseTourState(null)).toEqual(EMPTY_TOUR_STATE)
    expect(parseTourState('not json {')).toEqual(EMPTY_TOUR_STATE)
    expect(parseTourState('"a string"')).toEqual(EMPTY_TOUR_STATE)
    expect(parseTourState('[1,2]')).toEqual(EMPTY_TOUR_STATE)
    expect(parseTourState(JSON.stringify({ stepId: 'nope' }))).toEqual(EMPTY_TOUR_STATE)
    expect(parseTourState(JSON.stringify({ stepId: 42, dismissedAt: 7 }))).toEqual(EMPTY_TOUR_STATE)
  })

  it('round-trips a real state', () => {
    const state = {
      startedAt: '2026-08-20T00:00:00.000Z',
      dismissedAt: null,
      stepId: 'session' as const,
    }
    expect(parseTourState(JSON.stringify(state))).toEqual(state)
  })

  it('knows whether the tour is running', () => {
    expect(isTourRunning(EMPTY_TOUR_STATE)).toBe(false)
    expect(isTourRunning({ startedAt: 'x', dismissedAt: null, stepId: null })).toBe(true)
    expect(isTourRunning({ startedAt: 'x', dismissedAt: 'y', stepId: null })).toBe(false)
  })
})

/**
 * ── BREAK-TESTS ──────────────────────────────────────────────────────
 * A green validator is worth nothing unless it goes red on the exact
 * mistakes it exists to prevent. These feed it the broken lists.
 */
describe('validateStepOrder actually fails on broken orders', () => {
  const step = (
    id: string, requires: string[],
  ) => ({ ...byId(id), requires } as unknown as SetupTourStep)

  it('flags the checklist order (classroom before teachers) as a forward reference', () => {
    const broken = [byId('classroom'), byId('teachers'), byId('students'), byId('session'), byId('assignment')]
    expect(validateStepOrder(broken)).toEqual([
      { step: 'classroom', requires: 'teachers', reason: 'forward-reference' },
    ])
  })

  it('flags an assignment placed before its session', () => {
    const broken = [byId('teachers'), byId('classroom'), byId('assignment'), byId('session')]
    expect(validateStepOrder(broken)).toContainEqual(
      { step: 'assignment', requires: 'session', reason: 'forward-reference' },
    )
  })

  it('flags a requirement on a step that is not in the list', () => {
    const broken = [byId('classroom')] // requires 'teachers', which is absent
    expect(validateStepOrder(broken)).toEqual([
      { step: 'classroom', requires: 'teachers', reason: 'unknown-step' },
    ])
  })

  it('flags a self-reference instead of silently passing it', () => {
    const broken = [step('classroom', ['classroom'])]
    expect(validateStepOrder(broken)).toEqual([
      { step: 'classroom', requires: 'classroom', reason: 'self-reference' },
    ])
  })

  it('flags every violation, not just the first', () => {
    const broken = [byId('assignment'), byId('session'), byId('classroom'), byId('teachers')]
    expect(validateStepOrder(broken)).toHaveLength(3)
  })
})

describe('completion detection actually fails when the counter is wrong', () => {
  it('would report the wrong step if a countKey were mis-wired', () => {
    // Mutate the thing the real test pins: point "session" at the
    // classroom counter. An academy with a classroom and no sessions
    // must then be (wrongly) reported complete — which is what the
    // production assertion above would catch.
    const mis = SETUP_TOUR_STEPS.map(s =>
      s.id === 'session' ? { ...s, countKey: 'classrooms' as const } : s)
    const c = counts({ teachers: 1, classrooms: 1, students: 1 })
    expect(firstIncompleteStepIndex(c, mis)).toBe(4)          // wrong: skipped session
    expect(firstIncompleteStepIndex(c, SETUP_TOUR_STEPS)).toBe(3) // right
  })
})

describe('placeCard', () => {
  const vp = { width: 1280, height: 800 }
  const card = { width: 340, height: 260 }

  it('sits below an anchor with room underneath', () => {
    const p = placeCard({ top: 100, left: 900, width: 160, height: 36 }, vp, card)
    expect(p.side).toBe('below')
    expect(p.top).toBe(148) // 100 + 36 + 12
  })

  it('flips above when the anchor is near the bottom and there is more room up', () => {
    const p = placeCard({ top: 720, left: 400, width: 160, height: 36 }, vp, card)
    expect(p.side).toBe('above')
    expect(p.top).toBe(720 - 260 - 12)
  })

  it('right-aligns to an anchor in the right half — every header button is there', () => {
    const p = placeCard({ top: 100, left: 1100, width: 160, height: 36 }, vp, card)
    expect(p.left).toBe(1100 + 160 - 340)
  })

  it('never lets the card leave the viewport', () => {
    const cases = [
      { top: 10, left: 1270, width: 160, height: 36 },   // hard right
      { top: 10, left: -40, width: 160, height: 36 },    // hard left
      { top: 790, left: 20, width: 160, height: 36 },    // hard bottom
    ]
    for (const anchor of cases) {
      const p = placeCard(anchor, vp, card)
      expect(p.left).toBeGreaterThanOrEqual(16)
      expect(p.left + card.width).toBeLessThanOrEqual(vp.width - 16)
      expect(p.top).toBeGreaterThanOrEqual(16)
      expect(p.top + card.height).toBeLessThanOrEqual(vp.height - 16)
    }
  })

  it('still returns an on-screen position on a viewport smaller than the card', () => {
    const tiny = { width: 320, height: 200 }
    const p = placeCard({ top: 60, left: 200, width: 100, height: 36 }, tiny, card)
    expect(p.left).toBe(16)
    expect(p.top).toBe(16)
  })
})
