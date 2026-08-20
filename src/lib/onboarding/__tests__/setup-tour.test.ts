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
  beakFor,
  buildRail,
  lockedReason,
  completionTransition,
  checklistSteps,
  CHECKLIST_STEP_IDS,
  CARD_WIDTH,
  CARD_HEIGHT_ESTIMATE,
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


describe('locked reasons', () => {
  it('names the first unmet requirement, so the rail can say WHY', () => {
    expect(lockedReason(byId('classroom'), EMPTY_COUNTS)).toBe('teachers')
    expect(lockedReason(byId('session'), counts({ teachers: 1 }))).toBe('classroom')
    expect(lockedReason(byId('assignment'), counts({ teachers: 1, classrooms: 1 }))).toBe('session')
  })

  it('returns null once the requirement is satisfied', () => {
    expect(lockedReason(byId('classroom'), counts({ teachers: 1 }))).toBeNull()
    expect(lockedReason(byId('teachers'), EMPTY_COUNTS)).toBeNull()
    expect(lockedReason(byId('students'), EMPTY_COUNTS)).toBeNull()
  })

  it('agrees with isStepUnlocked on every step and both count states', () => {
    for (const step of SETUP_TOUR_STEPS) {
      for (const c of [EMPTY_COUNTS, counts({ teachers: 1, classrooms: 1 })]) {
        expect(lockedReason(step, c) === null).toBe(isStepUnlocked(step, c))
      }
    }
  })
})

describe('rail', () => {
  it('marks done / current / locked / todo, in that precedence', () => {
    // teachers done, standing on classroom.
    const rail = buildRail(counts({ teachers: 1 }), SETUP_TOUR_STEPS, 1)
    expect(rail.map(r => r.state)).toEqual(['done', 'current', 'todo', 'locked', 'locked'])
  })

  it('carries the blocking step id on every locked row', () => {
    const rail = buildRail(EMPTY_COUNTS, SETUP_TOUR_STEPS, 0)
    expect(rail.find(r => r.step.id === 'session')!.lockedBy).toBe('classroom')
    expect(rail.find(r => r.step.id === 'assignment')!.lockedBy).toBe('session')
    // "students" needs nothing — it must not render a lock reason.
    expect(rail.find(r => r.step.id === 'students')!.lockedBy).toBeNull()
    expect(rail.find(r => r.step.id === 'students')!.state).toBe('todo')
  })

  it('lets a done step outrank current and locked', () => {
    // Standing on "assignment" with everything done: not "current-locked".
    const all = counts({ teachers: 1, classrooms: 1, students: 1, sessions: 1, assignments: 1 })
    expect(buildRail(all, SETUP_TOUR_STEPS, 4).map(r => r.state))
      .toEqual(['done', 'done', 'done', 'done', 'done'])
    // A step completed out of order reads done, not locked.
    expect(buildRail(counts({ sessions: 1 }), SETUP_TOUR_STEPS, 0)
      .find(r => r.step.id === 'session')!.state).toBe('done')
  })

  it('still explains a CURRENT step that is not yet reachable', () => {
    // The user pressed Next past the teacher step.
    const rail = buildRail(EMPTY_COUNTS, SETUP_TOUR_STEPS, 1)
    const classroom = rail[1]
    expect(classroom.state).toBe('current')
    expect(classroom.lockedBy).toBe('teachers')
  })

  it('has one row per visible step for a teacher too', () => {
    const teacherSteps = visibleSteps('teacher')
    expect(buildRail(EMPTY_COUNTS, teacherSteps, 0)).toHaveLength(4)
    expect(buildRail(EMPTY_COUNTS, teacherSteps, 0)[0].lockedBy).toBeNull()
  })
})

describe('completion → advance', () => {
  it('fires when the CURRENT step\'s own counter rises from zero', () => {
    const t = completionTransition(EMPTY_COUNTS, counts({ teachers: 1 }), 0)
    expect(t).toEqual({ completed: 'teachers', nextIndex: 1 })
  })

  it('ignores a counter that is not this step\'s', () => {
    // Standing on "teachers"; someone imported students in another tab.
    expect(completionTransition(EMPTY_COUNTS, counts({ students: 30 }), 0)).toBeNull()
  })

  it('does not fire on the first reading, when there is nothing to compare', () => {
    expect(completionTransition(null, counts({ teachers: 1 }), 0)).toBeNull()
  })

  it('does not re-fire for a step that was already complete', () => {
    expect(completionTransition(counts({ teachers: 1 }), counts({ teachers: 2 }), 0)).toBeNull()
  })

  it('skips over steps that are already done when choosing where to land', () => {
    // teachers just created; classroom and students already exist.
    const before = counts({ classrooms: 1, students: 4 })
    const after = counts({ classrooms: 1, students: 4, teachers: 1 })
    expect(completionTransition(before, after, 0)).toEqual({ completed: 'teachers', nextIndex: 3 })
  })

  it('lands past the last step — the finish card — when that was the last one left', () => {
    const before = counts({ teachers: 1, classrooms: 1, students: 1, sessions: 1 })
    const after = { ...before, assignments: 1 }
    expect(completionTransition(before, after, 4))
      .toEqual({ completed: 'assignment', nextIndex: SETUP_TOUR_STEPS.length })
  })

  it('is inert on the finish card and on a nonsense index', () => {
    expect(completionTransition(EMPTY_COUNTS, counts({ teachers: 1 }), SETUP_TOUR_STEPS.length)).toBeNull()
    expect(completionTransition(EMPTY_COUNTS, counts({ teachers: 1 }), -1)).toBeNull()
  })

  it('uses the step list it is given, so a teacher advances through THEIR steps', () => {
    const teacherSteps = visibleSteps('teacher')
    expect(completionTransition(EMPTY_COUNTS, counts({ classrooms: 1 }), 0, teacherSteps))
      .toEqual({ completed: 'classroom', nextIndex: 1 })
  })
})

describe('checklist shares the tour\'s order', () => {
  it('is a subsequence of the tour steps, in tour order', () => {
    const tourOrder = SETUP_TOUR_STEPS.map(s => s.id)
    const listOrder = checklistSteps().map(s => s.id)
    expect(listOrder).toEqual(tourOrder.filter(id => CHECKLIST_STEP_IDS.includes(id)))
  })

  it('puts the teacher invite before the classroom — the whole point of the reorder', () => {
    const ids = checklistSteps().map(s => s.id)
    expect(ids[0]).toBe('teachers')
    expect(ids.indexOf('teachers')).toBeLessThan(ids.indexOf('classroom'))
  })

  it('has no forward dependency of its own', () => {
    expect(validateStepOrder(checklistSteps())).toEqual([])
  })
})

describe('beak placement', () => {
  const vp = { width: 1280, height: 800 }
  const card = { width: 340, height: 260 }

  it('hangs off the TOP edge when the card is below the anchor', () => {
    const anchor = { top: 100, left: 900, width: 160, height: 36 }
    const p = placeCard(anchor, vp, card)
    expect(p.side).toBe('below')
    const beak = beakFor(anchor, p, card)!
    expect(beak.side).toBe('top')
    // Lines up with the button's centre, not the card's.
    expect(p.left + beak.offset).toBe(980)
  })

  it('flips to the BOTTOM edge when the card is above the anchor', () => {
    const anchor = { top: 720, left: 400, width: 160, height: 36 }
    const p = placeCard(anchor, vp, card)
    expect(p.side).toBe('above')
    expect(beakFor(anchor, p, card)!.side).toBe('bottom')
  })

  it('flips to the RIGHT edge when the card is placed to the LEFT of the anchor', () => {
    // No room above or below: card goes beside the anchor.
    const short = { width: 1280, height: 260 }
    const anchor = { top: 100, left: 1000, width: 160, height: 36 }
    const p = placeCard(anchor, short, card)
    expect(p.side).toBe('left')
    const beak = beakFor(anchor, p, card)!
    expect(beak.side).toBe('right')
    expect(p.top + beak.offset).toBe(118) // the anchor's vertical centre
  })

  it('flips to the LEFT edge when the card is placed to the RIGHT of the anchor', () => {
    const short = { width: 1280, height: 260 }
    const anchor = { top: 100, left: 40, width: 160, height: 36 }
    const p = placeCard(anchor, short, card)
    expect(p.side).toBe('right')
    expect(beakFor(anchor, p, card)!.side).toBe('left')
  })

  it('has no beak in the centred, anchor-less state', () => {
    expect(beakFor({ top: 0, left: 0, width: 0, height: 0 }, null, card)).toBeNull()
  })

  it('keeps the beak off the rounded corners', () => {
    // A hard-left anchor: the card is clamped to margin 16 and the
    // anchor centre would land at the very corner.
    const anchor = { top: 100, left: 8, width: 20, height: 36 }
    const p = placeCard(anchor, vp, card)
    const beak = beakFor(anchor, p, card)!
    expect(beak.offset).toBe(18)

    // And the other corner: a hard-right anchor whose centre falls past
    // the card's right edge minus the inset.
    const far = { top: 100, left: 1240, width: 40, height: 36 }
    const fp = placeCard(far, vp, card)
    expect(far.left + far.width / 2 - fp.left).toBeGreaterThan(card.width - 18)
    expect(beakFor(far, fp, card)!.offset).toBe(card.width - 18)
  })

  it('returns null rather than a beak pointing at nothing', () => {
    // Anchor far to the right of a card clamped at the left margin.
    const p: { top: number; left: number; side: 'below' } = { top: 200, left: 16, side: 'below' }
    expect(beakFor({ top: 100, left: 1200, width: 40, height: 36 }, p, card)).toBeNull()
  })

  it('always points inside the card when it points at all', () => {
    for (let left = 0; left <= 1240; left += 20) {
      for (const top of [10, 300, 780]) {
        const anchor = { top, left, width: 160, height: 36 }
        const p = placeCard(anchor, vp, card)
        const beak = beakFor(anchor, p, card)
        if (!beak) continue
        const length = beak.side === 'top' || beak.side === 'bottom' ? card.width : card.height
        expect(beak.offset).toBeGreaterThanOrEqual(0)
        expect(beak.offset).toBeLessThanOrEqual(length)
      }
    }
  })
})

describe('placeCard goes BESIDE the anchor when it fits neither above nor below', () => {
  it('does not cover the very button it is explaining', () => {
    const short = { width: 1280, height: 300 }
    const card = { width: 340, height: 260 }
    const anchor = { top: 120, left: 1000, width: 160, height: 36 }
    const p = placeCard(anchor, short, card)
    expect(p.side).toBe('left')
    // Card's right edge is left of the anchor's left edge.
    expect(p.left + card.width).toBeLessThanOrEqual(anchor.left)
  })
})

/**
 * The card's own box, and what it costs placement.
 *
 * The redesign (stepper rail, inset progress panel) grew the card from
 * ~400px of guess to a measured 500-521px, and the FIRST placement pass
 * — the only one the user actually sees flinch — runs entirely on
 * `CARD_HEIGHT_ESTIMATE`. These pin the two things that estimate is
 * load-bearing for.
 */
describe('CARD_HEIGHT_ESTIMATE', () => {
  it('is close to the height the card really renders at', () => {
    // Measured in Chrome at 2026-08-20: 500px (Korean, on-route) to
    // 521px (English, off-route, three-line body). An estimate outside
    // this band means the constant drifted away from the component and
    // the first paint will place the card wrongly.
    expect(CARD_HEIGHT_ESTIMATE).toBeGreaterThanOrEqual(480)
    expect(CARD_HEIGHT_ESTIMATE).toBeLessThanOrEqual(560)
  })

  it('still places BESIDE the anchor on a 1280x420 viewport', () => {
    // The short-viewport case the redesign had to keep working: neither
    // above nor below can hold a card this tall, so it must go beside
    // the button rather than on top of it.
    const viewport = { width: 1280, height: 420 }
    const card = { width: CARD_WIDTH, height: CARD_HEIGHT_ESTIMATE }
    const anchor = { top: 96, left: 1060, width: 160, height: 36 }
    const p = placeCard(anchor, viewport, card)
    expect(p.side).toBe('left')
    expect(p.left + card.width).toBeLessThanOrEqual(anchor.left)
  })

  it('still prefers below the anchor on a full-height viewport', () => {
    // The common case must NOT have been pushed into a flip by the
    // extra height: a header button on a laptop screen still gets the
    // card underneath it.
    const viewport = { width: 1440, height: 900 }
    const card = { width: CARD_WIDTH, height: CARD_HEIGHT_ESTIMATE }
    const anchor = { top: 96, left: 1200, width: 160, height: 36 }
    const p = placeCard(anchor, viewport, card)
    expect(p.side).toBe('below')
    expect(p.top).toBeGreaterThanOrEqual(anchor.top + anchor.height)
  })
})
