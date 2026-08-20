/**
 * Guided academy-setup tour — the pure part.
 *
 * The React component (`src/components/ui/onboarding/SetupTour.tsx`)
 * owns rendering, anchoring and persistence. Everything decidable
 * without a DOM lives here so it can be unit-tested in node.
 *
 * ── WHY THIS ORDER ──────────────────────────────────────────────────
 * It is not a preference. Every edge below was read out of the code
 * that actually blocks the save button:
 *
 *   teacher → classroom   ClassroomCreateModal.tsx:174 disables Create
 *                         on `!formData.teacher_id`, and the dropdown
 *                         is fed by useClassroomData.ts:120 —
 *                         `from('teachers').eq('academy_id', …)`.
 *                         A manager signing up gets a `managers` row
 *                         only (auth/page.tsx:611), never a `teachers`
 *                         row, so a brand-new academy has an EMPTY
 *                         teacher dropdown and literally cannot create
 *                         a classroom. The dashboard checklist lists
 *                         "create a classroom" first; that is the one
 *                         step a fresh manager cannot do first.
 *                         Exception: a user whose own role is teacher
 *                         gets teacher_id auto-filled with themselves
 *                         (classrooms-page.tsx:1351), so this edge —
 *                         and the step — does not apply to them. See
 *                         `visibleSteps`.
 *
 *   classroom → session   classroom_sessions.classroom_id is NOT NULL
 *                         (database.types.ts) and the session form
 *                         requires classroom_id (sessions-page.tsx:447).
 *
 *   session → assignment  assignments.classroom_session_id is NOT NULL
 *                         and the create modal renders a disabled
 *                         "no sessions available" item with zero
 *                         sessions (AssignmentCreateEditModal.tsx:197).
 *
 * Students are the one SOFT edge. Nothing refuses to save without
 * them, but an assignment fans out into `assignment_grades` per
 * ENROLLED student (assignments-page.tsx:449), so an assignment
 * created for an empty classroom silently grades nobody. They sit
 * after the classroom (so there is something to enrol into) and before
 * the session, which is the first artifact that is useless without
 * them.
 *
 * `requires` encodes only the edges that block a save, and
 * `validateStepOrder` asserts every one points BACKWARDS — a reorder
 * that puts "session" before "classroom" fails a test instead of
 * stranding a user on a step they cannot complete.
 */

export type SetupTourStepId =
  | 'teachers'
  | 'classroom'
  | 'students'
  | 'session'
  | 'assignment'

/** Live setup counts for one academy. Every field is "how many exist". */
export interface SetupCounts {
  classrooms: number
  teachers: number
  students: number
  sessions: number
  assignments: number
}

/** Roles that reach the manager/teacher dashboard. */
export type DashboardRole = 'manager' | 'teacher'

export interface SetupTourStep {
  id: SetupTourStepId
  /** Route whose page carries the anchor. */
  route: string
  /**
   * CSS selector for the REAL control this step points at. Pages carry
   * `data-tour="…"` on the actual button; nothing here knows a pixel
   * position, and a missing anchor is a handled state (the card falls
   * back to the centre of the viewport), not a crash.
   */
  anchor: string
  /** Steps that must be complete before this one can be saved at all. */
  requires: readonly SetupTourStepId[]
  /** Which counter proves this step was done. */
  countKey: keyof SetupCounts
  /** i18n key stem — `.title` / `.body` hang off it. */
  i18n: string
  /**
   * Managers only. A teacher-role user cannot invite teachers (the
   * button is a manager affordance) and does not need to: their own
   * classrooms are created against themselves.
   */
  managerOnly?: boolean
}

export const SETUP_TOUR_STEPS: readonly SetupTourStep[] = [
  {
    id: 'teachers',
    route: '/teachers',
    anchor: '[data-tour="invite-teacher"]',
    requires: [],
    countKey: 'teachers',
    i18n: 'setupTour.steps.teachers',
    managerOnly: true,
  },
  {
    id: 'classroom',
    route: '/classrooms',
    anchor: '[data-tour="create-classroom"]',
    requires: ['teachers'],
    countKey: 'classrooms',
    i18n: 'setupTour.steps.classroom',
  },
  {
    id: 'students',
    route: '/families',
    anchor: '[data-tour="add-family"]',
    requires: [],
    countKey: 'students',
    i18n: 'setupTour.steps.students',
  },
  {
    id: 'session',
    route: '/sessions',
    anchor: '[data-tour="add-session"]',
    requires: ['classroom'],
    countKey: 'sessions',
    i18n: 'setupTour.steps.session',
  },
  {
    id: 'assignment',
    route: '/assignments',
    anchor: '[data-tour="add-assignment"]',
    requires: ['session'],
    countKey: 'assignments',
    i18n: 'setupTour.steps.assignment',
  },
] as const

export const EMPTY_COUNTS: SetupCounts = {
  classrooms: 0, teachers: 0, students: 0, sessions: 0, assignments: 0,
}

/**
 * The steps this role actually walks.
 *
 * Dropping a step also drops every `requires` edge that pointed at it —
 * otherwise a teacher's classroom step would require a step that is not
 * in their tour, and `isStepUnlocked` would lock them out of their own
 * first action forever.
 */
export function visibleSteps(
  role: DashboardRole,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): SetupTourStep[] {
  const kept = steps.filter(s => role === 'manager' || !s.managerOnly)
  const keptIds = new Set(kept.map(s => s.id))
  return kept.map(s => ({
    ...s,
    requires: s.requires.filter(r => keptIds.has(r)),
  }))
}

export function isStepComplete(step: SetupTourStep, counts: SetupCounts): boolean {
  return counts[step.countKey] > 0
}

/** A step is reachable once every step it requires is complete. */
export function isStepUnlocked(
  step: SetupTourStep,
  counts: SetupCounts,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): boolean {
  return step.requires.every(id => {
    const req = steps.find(s => s.id === id)
    return req ? isStepComplete(req, counts) : false
  })
}

/**
 * Index of the step the tour should sit on: the first not yet done.
 * -1 when everything is set up (the tour then shows its finish card).
 */
export function firstIncompleteStepIndex(
  counts: SetupCounts,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): number {
  return steps.findIndex(s => !isStepComplete(s, counts))
}

/**
 * Where to drop a returning user.
 *
 * Their saved step is honoured unless it is already done or still
 * locked — re-showing "create your first classroom" to someone with
 * three classrooms is the exact condescension the checklist's own
 * `classrooms > 0` guard exists to avoid. An id we no longer ship (a
 * renamed step) is treated as "no saved step" rather than throwing.
 */
export function resumeStepIndex(
  counts: SetupCounts,
  savedId?: string | null,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): number {
  const firstIncomplete = firstIncompleteStepIndex(counts, steps)
  if (firstIncomplete === -1) return -1
  if (!savedId) return firstIncomplete
  const savedIndex = steps.findIndex(s => s.id === savedId)
  if (savedIndex === -1) return firstIncomplete
  const saved = steps[savedIndex]
  if (isStepComplete(saved, counts)) return firstIncomplete
  if (!isStepUnlocked(saved, counts, steps)) return firstIncomplete
  return savedIndex
}

export function completedCount(
  counts: SetupCounts,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): number {
  return steps.filter(s => isStepComplete(s, counts)).length
}

/**
 * The first requirement of `step` that is NOT yet satisfied, or null if
 * the step is reachable. This is what the rail prints as the reason a
 * step is locked ("needs a classroom first") — a locked row that does
 * not say why is just a disabled control.
 */
export function lockedReason(
  step: SetupTourStep,
  counts: SetupCounts,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): SetupTourStepId | null {
  for (const id of step.requires) {
    const req = steps.find(s => s.id === id)
    if (!req || !isStepComplete(req, counts)) return id
  }
  return null
}

export type RailState = 'done' | 'current' | 'locked' | 'todo'

export interface RailItem {
  step: SetupTourStep
  state: RailState
  /** Set whenever a requirement is unmet — including on the current
   *  step, so the card can explain a step the user jumped onto. */
  lockedBy: SetupTourStepId | null
}

/**
 * The five-row progress rail.
 *
 * Precedence is done > current > locked > todo, deliberately: a step
 * the user has already satisfied never reads as "locked" just because
 * they did it out of order, and the step they are standing on always
 * reads as current even if it is not strictly reachable yet.
 */
export function buildRail(
  counts: SetupCounts,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
  currentIndex = -1,
): RailItem[] {
  return steps.map((step, i) => {
    const lockedBy = lockedReason(step, counts, steps)
    const state: RailState = isStepComplete(step, counts)
      ? 'done'
      : i === currentIndex
        ? 'current'
        : lockedBy
          ? 'locked'
          : 'todo'
    return { step, state, lockedBy }
  })
}

export interface CompletionTransition {
  /** The step whose counter just went up. */
  completed: SetupTourStepId
  /** Where the tour should land — `steps.length` means "the finish card". */
  nextIndex: number
}

/**
 * Did the step the user is standing on just get done?
 *
 * Compares two count readings. Returns null unless the CURRENT step's
 * own counter rose from zero — an unrelated counter moving (a second
 * teacher, someone else's import) must not fire a celebration or shove
 * the user forward. `prev` being null is the first reading of the
 * session and can never be a transition: everything would look "new".
 */
export function completionTransition(
  prev: SetupCounts | null,
  next: SetupCounts,
  currentIndex: number,
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): CompletionTransition | null {
  if (!prev) return null
  if (currentIndex < 0 || currentIndex >= steps.length) return null
  const step = steps[currentIndex]
  if (isStepComplete(step, prev)) return null
  if (!isStepComplete(step, next)) return null
  let nextIndex = currentIndex + 1
  while (nextIndex < steps.length && isStepComplete(steps[nextIndex], next)) nextIndex += 1
  return { completed: step.id, nextIndex }
}

/**
 * Which steps the dashboard checklist lists, in TOUR order.
 *
 * The checklist used to carry its own hardcoded array that began with
 * "create your first classroom" — the one step a brand-new manager
 * cannot do (ClassroomCreateModal disables Create without a
 * `teacher_id`). Two lists meant two orders and the widgets
 * contradicted each other. There is now one list, and
 * `validateStepOrder` polices it.
 */
export const CHECKLIST_STEP_IDS: readonly SetupTourStepId[] =
  ['teachers', 'classroom', 'students', 'session'] as const

export function checklistSteps(
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): SetupTourStep[] {
  return steps.filter(s => CHECKLIST_STEP_IDS.includes(s.id))
}

export interface OrderViolation {
  step: SetupTourStepId
  requires: SetupTourStepId
  reason: 'forward-reference' | 'unknown-step' | 'self-reference'
}

/**
 * Every `requires` must name a step that appears EARLIER in the list.
 * A forward reference means the tour would present a step whose
 * precondition it has not walked the user through yet.
 */
export function validateStepOrder(
  steps: readonly SetupTourStep[] = SETUP_TOUR_STEPS,
): OrderViolation[] {
  const violations: OrderViolation[] = []
  steps.forEach((step, index) => {
    for (const req of step.requires) {
      if (req === step.id) {
        violations.push({ step: step.id, requires: req, reason: 'self-reference' })
        continue
      }
      const reqIndex = steps.findIndex(s => s.id === req)
      if (reqIndex === -1) {
        violations.push({ step: step.id, requires: req, reason: 'unknown-step' })
      } else if (reqIndex > index) {
        violations.push({ step: step.id, requires: req, reason: 'forward-reference' })
      }
    }
  })
  return violations
}

/* ── persistence ───────────────────────────────────────────────────── */

/**
 * PER-ACCOUNT-ID, BROWSER-LOCAL. Deliberate, and here is the audit:
 *
 * · `user_preferences` is the only manager/teacher prefs table
 *   (src/lib/theme-account.ts). It has no onboarding column, and its
 *   two JSON columns are owned by the dashboard layout store.
 * · `/api/study/prefs` — the account-level store NavTour uses — is
 *   gated by `requireStudyUser`. It is a STUDENT table
 *   (`study_user_prefs.student_id`); a manager has no row there.
 * · Adding a column means a migration, and this repo currently ships
 *   with migration 072 unapplied (see the DROP_LADDER comment in
 *   /api/study/prefs) — a write to a column PostgREST does not know
 *   about fails the whole request. Trading "the tour reappears on a
 *   second device" for "the tour silently fails to save" is a bad
 *   trade for a dismissible onboarding widget.
 *
 * So: the same localStorage-keyed-by-user-id pattern the welcome modal
 * and the getting-started checklist already use. Worst case on a new
 * device is one extra offer of a tour the user can dismiss — and the
 * counts-based completion means the tour is over anyway once the
 * academy has real data.
 */
const STORAGE_PREFIX = 'classraum:setup_tour:'

export interface SetupTourState {
  /** ISO timestamp of the launch, or null if never started. */
  startedAt: string | null
  /** ISO timestamp of dismissal, or null while still in progress. */
  dismissedAt: string | null
  /** Step the user was on, so a page navigation or reload resumes. */
  stepId: SetupTourStepId | null
}

export const EMPTY_TOUR_STATE: SetupTourState =
  { startedAt: null, dismissedAt: null, stepId: null }

/** Started and not yet dismissed — the tour should be on screen. */
export function isTourRunning(state: SetupTourState): boolean {
  return state.startedAt !== null && state.dismissedAt === null
}

export function setupTourStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

/** Parse stored JSON defensively — a hand-edited or half-written value
 *  must degrade to "nothing saved", never throw during render. */
export function parseTourState(raw: string | null): SetupTourState {
  if (!raw) return EMPTY_TOUR_STATE
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return EMPTY_TOUR_STATE
    const obj = parsed as Record<string, unknown>
    const stepId = typeof obj.stepId === 'string' &&
      SETUP_TOUR_STEPS.some(s => s.id === obj.stepId)
      ? obj.stepId as SetupTourStepId
      : null
    const startedAt = typeof obj.startedAt === 'string' ? obj.startedAt : null
    const dismissedAt = typeof obj.dismissedAt === 'string' ? obj.dismissedAt : null
    return { startedAt, dismissedAt, stepId }
  } catch {
    return EMPTY_TOUR_STATE
  }
}

export function readTourState(userId: string): SetupTourState {
  if (typeof window === 'undefined') return EMPTY_TOUR_STATE
  try {
    return parseTourState(localStorage.getItem(setupTourStorageKey(userId)))
  } catch {
    return EMPTY_TOUR_STATE
  }
}

export function writeTourState(userId: string, state: SetupTourState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(setupTourStorageKey(userId), JSON.stringify(state))
  } catch {
    // Private mode / quota. The tour still works for this page-load;
    // it just re-offers itself next time, which is the safe direction.
  }
}

/** Imperative reset — the Settings "Run the setup guide again" button. */
export function resetSetupTour(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(setupTourStorageKey(userId))
  } catch {
    // see writeTourState
  }
}

/* ── placement ─────────────────────────────────────────────────────── */

export interface Rect { top: number; left: number; width: number; height: number }

/** Where the CARD sits relative to the anchor. */
export type PlacementSide = 'below' | 'above' | 'left' | 'right'
export interface Placement { top: number; left: number; side: PlacementSide }

/**
 * Where to put the tooltip card relative to its anchor.
 *
 * Pure arithmetic on viewport-relative rects so it can be tested
 * without a browser. Rules, in order:
 *   · prefer below the anchor; flip above when the card would run off
 *     the bottom AND there is more room above;
 *   · when NEITHER side of the anchor can hold the card (a short
 *     viewport, a phone in landscape), go beside it instead of
 *     covering it — the card is the thing explaining the button, so
 *     landing on top of the button is the one placement to avoid;
 *   · clamp horizontally into the viewport with a margin, so a button
 *     in the top-right corner (which every one of these is) does not
 *     push the card off-screen;
 *   · clamp vertically too, because a flip on a very short viewport
 *     can still overflow.
 */
export function placeCard(
  anchor: Rect,
  viewport: { width: number; height: number },
  card: { width: number; height: number },
  gap = 12,
  margin = 16,
): Placement {
  const spaceBelow = viewport.height - (anchor.top + anchor.height)
  const spaceAbove = anchor.top
  const needed = card.height + gap + margin
  const fitsBelow = spaceBelow >= needed
  const fitsAbove = spaceAbove >= needed

  const anchorCentreX = anchor.left + anchor.width / 2
  const maxLeft = Math.max(margin, viewport.width - card.width - margin)
  const maxTop = Math.max(margin, viewport.height - card.height - margin)
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, margin), hi)

  if (!fitsBelow && !fitsAbove) {
    // Beside the anchor: away from whichever wall it is nearest.
    const side: PlacementSide = anchorCentreX > viewport.width / 2 ? 'left' : 'right'
    const rawLeft = side === 'left'
      ? anchor.left - card.width - gap
      : anchor.left + anchor.width + gap
    const rawTop = anchor.top + anchor.height / 2 - card.height / 2
    return { left: clamp(rawLeft, maxLeft), top: clamp(rawTop, maxTop), side }
  }

  const side: PlacementSide = fitsBelow || spaceBelow >= spaceAbove ? 'below' : 'above'

  const rawTop = side === 'below'
    ? anchor.top + anchor.height + gap
    : anchor.top - card.height - gap

  // Right-align the card to the anchor when the anchor sits in the
  // right half — these are all top-right header buttons.
  const rawLeft = anchorCentreX > viewport.width / 2
    ? anchor.left + anchor.width - card.width
    : anchor.left

  return { left: clamp(rawLeft, maxLeft), top: clamp(rawTop, maxTop), side }
}

/** The card EDGE the beak hangs off — the edge facing the anchor. */
export type BeakSide = 'top' | 'bottom' | 'left' | 'right'
export interface Beak {
  side: BeakSide
  /** Distance along that edge, from the card's top-left corner. */
  offset: number
}

const BEAK_EDGE: Record<PlacementSide, BeakSide> = {
  below: 'top', above: 'bottom', left: 'right', right: 'left',
}

/**
 * The little arrow that ties the card to the button it is talking
 * about.
 *
 * It flips to whichever card edge faces the anchor, and slides along
 * that edge to line up with the anchor's centre — because the card is
 * clamped into the viewport, "centre of the card" is usually NOT
 * "centre of the button".
 *
 * Returns null when the anchor's centre falls outside the card's span
 * on that axis: the beak would then be pinned to a corner pointing at
 * nothing, which reads as a rendering bug. No beak is better than a
 * lying one — and the centred, anchor-less state (off-route) has no
 * placement at all, so it never gets one either.
 */
export function beakFor(
  anchor: Rect,
  placement: Placement | null,
  card: { width: number; height: number },
  inset = 18,
): Beak | null {
  if (!placement) return null
  const side = BEAK_EDGE[placement.side]
  const horizontal = side === 'top' || side === 'bottom'
  const centre = horizontal
    ? anchor.left + anchor.width / 2
    : anchor.top + anchor.height / 2
  const start = horizontal ? placement.left : placement.top
  const length = horizontal ? card.width : card.height
  const raw = centre - start
  if (raw < 0 || raw > length) return null
  const hi = Math.max(inset, length - inset)
  return { side, offset: Math.min(Math.max(raw, inset), hi) }
}
