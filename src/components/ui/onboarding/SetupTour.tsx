"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import {
  X, ArrowRight, ArrowLeft, Check, UserPlus, School, Users, Calendar,
  ClipboardList, PartyPopper, MapPin, Lock, MousePointerClick, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { useSetupCounts } from './useSetupCounts'
import {
  type DashboardRole, type SetupTourStep, type SetupTourStepId, type SetupCounts,
  type Beak, type Placement, type RailItem,
  EMPTY_COUNTS, visibleSteps, isStepComplete, resumeStepIndex, completedCount,
  readTourState, writeTourState, isTourRunning, placeCard, beakFor, buildRail,
  completionTransition, CARD_WIDTH, CARD_HEIGHT_ESTIMATE,
} from '@/lib/onboarding/setup-tour'

/**
 * The guided academy-setup walkthrough.
 *
 * ── How it relates to the two onboarding widgets that already exist ──
 * · WelcomeModal (first login, three slides) answers "what is this
 *   app?". It still auto-opens; the tour never does, so the two can
 *   never be on screen at once.
 * · GettingStartedChecklist answers "what is left to do?" and owns the
 *   "fresh academy" signal (it renders only while classrooms == 0).
 *   The tour is LAUNCHED FROM IT — the checklist grew one primary
 *   button — rather than replacing it or sitting beside it. Both now
 *   take their ORDER from `SETUP_TOUR_STEPS` (see `checklistSteps`),
 *   so the checklist can no longer tell a fresh manager to create a
 *   classroom they are structurally unable to create.
 *
 * ── Escapability ─────────────────────────────────────────────────────
 * Nothing here traps anyone. There is no interactive backdrop: the dim
 * is painted by a huge box-shadow on a `pointer-events: none` cut-out,
 * so every pixel of the app underneath stays clickable, including the
 * button the tour is pointing at. X, Escape and a click anywhere
 * dismiss. Clicking outside does NOT — see the handler below.
 *
 * ── Standing aside for real modals, without abandoning the user ───────
 * The moment the user opens the very modal we sent them to, `<Modal>`
 * puts `data-app-modal` on its backdrop. The overlay (spotlight, card,
 * Escape handler) goes away — otherwise the first
 * click inside the classroom form would dismiss the tour and Escape
 * would be fought over by two components. What REPLACES it is a docked
 * hint: a small pill in the bottom-left corner naming what to fill in
 * for this step. It is `pointer-events: none` end to end and contains
 * no focusable node, so it can neither swallow a click meant for the
 * dialog nor enter its focus order.
 *
 * ── Continuous help ──────────────────────────────────────────────────
 * The card is not a static instruction. It carries (a) a live reading
 * of the very counter that defines "done" for this step, refreshed by
 * `useSetupCounts`, (b) a success state the moment that counter rises,
 * before it moves anyone anywhere, and (c) a rail of all five steps
 * with locked ones saying what they are waiting for.
 */

const STEP_ICONS: Record<SetupTourStepId, LucideIcon> = {
  teachers: UserPlus,
  classroom: School,
  students: Users,
  session: Calendar,
  assignment: ClipboardList,
}


/** #2885e8 — `--primary` in globals.css. Inline because the spotlight
 *  glow is a box-shadow layered with the dim, not a ring utility. */
const PRIMARY_RGB = '40,133,232'

/** How long the success state is held before the tour moves on. Long
 *  enough to read one line; "Continue" skips it, "Back" cancels it. */
const CELEBRATE_MS = 2600

/** Fired by the checklist / Settings to open the tour in the layout. */
export const SETUP_TOUR_EVENT = 'classraum:setup-tour'

/** Launch (or relaunch) the tour. Safe to call from any client component. */
export function startSetupTour(userId: string): void {
  writeTourState(userId, {
    startedAt: new Date().toISOString(),
    dismissedAt: null,
    stepId: null,
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETUP_TOUR_EVENT))
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Widest of the two vertical gutters the open dialog leaves free. */
const HINT_WIDTH = 304
const HINT_MARGIN = 16
const HINT_MIN_WIDTH = 208

export interface HintDock { open: boolean; style: React.CSSProperties }

/**
 * True while any `<Modal>` is mounted — plus where the tour's docked
 * hint can stand without covering the dialog.
 *
 * Body's child list is watched because that is where every modal
 * portals to (see ModalPortal / Modal). `data-app-modal-box` is the
 * dialog itself; the gutters either side of it are the only places a
 * hint can sit without landing on the dialog's Cancel/Save row, which
 * is exactly where a bottom-left corner pill lands on a wide modal.
 * `pointer-events: none` means the hint could never SWALLOW that
 * click, but obscuring the button is bad enough.
 *
 * The degenerate case — a dialog so wide that neither gutter can hold
 * even a narrow pill (phones) — docks bottom-centre and accepts the
 * overlap, because the alternative is no guidance at all.
 */
function useAppModalOpen(): HintDock {
  const [dock, setDock] = useState<HintDock>({ open: false, style: {} })
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = () => {
      const open = !!document.querySelector('[data-app-modal]')
      if (!open) { setDock(d => (d.open ? { open: false, style: {} } : d)) ; return }
      const box = document.querySelector('[data-app-modal-box]')
      const vw = window.innerWidth
      const r = box?.getBoundingClientRect()
      const leftGutter = r ? r.left : vw
      const rightGutter = r ? vw - r.right : vw
      const widest = Math.max(leftGutter, rightGutter)
      const width = Math.min(HINT_WIDTH, widest - HINT_MARGIN * 2)
      const style: React.CSSProperties = width >= HINT_MIN_WIDTH
        ? {
            width,
            bottom: 20,
            ...(leftGutter >= rightGutter ? { left: HINT_MARGIN } : { right: HINT_MARGIN }),
          }
        : {
            width: Math.min(HINT_WIDTH, vw - HINT_MARGIN * 2),
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
          }
      setDock({ open: true, style })
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', read)
    return () => { observer.disconnect(); window.removeEventListener('resize', read) }
  }, [])
  return dock
}

/**
 * The beak, as an SVG rather than the usual rotated square.
 *
 * A rotated square needs its inner half hidden behind the card, which
 * means fighting the card's own `ring-1` and its stacking context. A
 * triangle whose two slanted edges are stroked and whose flat base is
 * over-painted in white simply covers the 1px of card ring it sits on,
 * and works identically on all four edges.
 */
function BeakArrow({ beak }: { beak: Beak }) {
  const horizontal = beak.side === 'top' || beak.side === 'bottom'
  const w = horizontal ? 20 : 10
  const h = horizontal ? 10 : 20
  const shape = {
    top: 'M1 10 L10 1.5 L19 10',
    bottom: 'M1 0 L10 8.5 L19 0',
    left: 'M10 1 L1.5 10 L10 19',
    right: 'M0 1 L8.5 10 L0 19',
  }[beak.side]
  const base = {
    top: 'M0.5 10 H19.5',
    bottom: 'M0.5 0 H19.5',
    left: 'M10 0.5 V19.5',
    right: 'M0 0.5 V19.5',
  }[beak.side]
  const style: React.CSSProperties = horizontal
    ? { left: beak.offset - w / 2, [beak.side === 'top' ? 'top' : 'bottom']: -(h - 1) }
    : { top: beak.offset - h / 2, [beak.side === 'left' ? 'left' : 'right']: -(w - 1) }

  return (
    <svg
      aria-hidden="true"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute pointer-events-none"
      style={style}
    >
      <path d={shape} fill="#fff" stroke="rgba(229,231,235,0.9)" strokeWidth="1" strokeLinejoin="round" />
      {/* Paints out the card's own ring line under the beak's base. */}
      <path d={base} stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  )
}

/**
 * The at-a-glance progress indicator, shared by the card and the docked
 * hint so the two can never show different progress.
 *
 * SEGMENTED, one pill per step, rather than a continuous fill: this
 * tour's most common state is 0 of 5, where a continuous bar is an
 * empty rectangle that communicates nothing at all. Five empty pills
 * still say "five steps, none of them done", and the segment colours
 * are the same three the stepper markers use, so the glance and the
 * detail agree.
 */
function ProgressMeter({
  rail, done, total, label, className = '',
}: {
  rail: RailItem[]
  done: number
  total: number
  label: string
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={`flex items-center gap-1 ${className}`}
    >
      {rail.map(item => (
        <span
          key={item.step.id}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 motion-reduce:transition-none ${
            item.state === 'done'
              ? 'bg-emerald-500'
              : item.state === 'current'
                ? 'bg-primary'
                : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export function SetupTour({ userRole }: { userRole: string | null }) {
  const { user, academyId } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const reducedMotion = usePrefersReducedMotion()
  const hintDock = useAppModalOpen()
  const appModalOpen = hintDock.open
  const userId = user?.id

  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  // False until the anchor has been looked for at least once on this
  // step. Without it the card paints centre-screen for one frame on a
  // hard reload and then jumps to the button — a visible flinch.
  const [probed, setProbed] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Non-null while the "you just did it" card is showing.
  const [celebrating, setCelebrating] = useState<
    { stepId: SetupTourStepId; nextIndex: number } | null
  >(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  const { counts, refresh } = useSetupCounts(running ? academyId : undefined)
  const live: SetupCounts = counts ?? EMPTY_COUNTS

  const role: DashboardRole = userRole === 'teacher' ? 'teacher' : 'manager'
  const steps = useMemo(() => visibleSteps(role), [role])

  useEffect(() => { setMounted(true) }, [])

  /* ── open / resume ────────────────────────────────────────────── */
  useEffect(() => {
    if (!userId) return
    const sync = () => {
      const state = readTourState(userId)
      setRunning(isTourRunning(state))
    }
    sync()
    window.addEventListener(SETUP_TOUR_EVENT, sync)
    // Another tab starting or dismissing the tour.
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SETUP_TOUR_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [userId])

  // Pick the resume point once the first count reading lands. Only when
  // the tour (re)starts — after that the user's Back/Next wins, so this
  // must not run on every counts refresh.
  const positioned = useRef(false)
  useEffect(() => {
    if (!running) { positioned.current = false; return }
    if (positioned.current || !counts || !userId) return
    positioned.current = true
    const saved = readTourState(userId).stepId
    const i = resumeStepIndex(counts, saved, steps)
    setIndex(i === -1 ? steps.length : i)
  }, [running, counts, userId, steps])

  /* ── celebrate, then advance, when the work actually gets done ── */
  // Two counts readings are compared by `completionTransition`; only
  // the CURRENT step's own counter rising fires it. `index` is read
  // through a ref on purpose — reacting to it would re-evaluate on
  // Back and bounce the user forward off a step they deliberately
  // returned to.
  const indexRef = useRef(index)
  indexRef.current = index
  const prevCounts = useRef<SetupCounts | null>(null)
  const celebratingRef = useRef(celebrating)
  celebratingRef.current = celebrating
  useEffect(() => {
    if (!running || !counts) { prevCounts.current = null; return }
    const before = prevCounts.current
    if (before && JSON.stringify(before) === JSON.stringify(counts)) return
    prevCounts.current = counts
    if (celebratingRef.current) return
    const transition = completionTransition(before, counts, indexRef.current, steps)
    if (transition) setCelebrating({ stepId: transition.completed, nextIndex: transition.nextIndex })
  }, [counts, running, steps])

  // Hold the success card briefly, then move on. Any manual Back /
  // Continue clears `celebrating` and therefore this timer.
  useEffect(() => {
    if (!celebrating) return
    const target = celebrating.nextIndex
    const id = window.setTimeout(() => {
      setIndex(target)
      setCelebrating(null)
    }, CELEBRATE_MS)
    return () => window.clearTimeout(id)
  }, [celebrating])

  // Re-count on the events that can mean "they just did it": arriving
  // on a page, a modal closing, and a slow safety poll.
  useEffect(() => {
    if (!running) return
    void refresh()
  }, [running, pathname, appModalOpen, refresh])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => { void refresh() }, 10_000)
    return () => window.clearInterval(id)
  }, [running, refresh])

  /* ── persist the current step so a reload resumes here ────────── */
  const step: SetupTourStep | null = index < steps.length ? steps[index] : null
  useEffect(() => {
    if (!running || !userId) return
    const state = readTourState(userId)
    writeTourState(userId, { ...state, stepId: step?.id ?? null })
  }, [running, userId, step?.id])

  /* ── anchor tracking ──────────────────────────────────────────── */
  const onRoute = !!step && pathname.startsWith(step.route)
  useEffect(() => {
    if (!running || !step || !onRoute || appModalOpen) { setRect(null); setProbed(true); return }
    setProbed(false)
    let frame = 0
    const measure = () => {
      setProbed(true)
      const el = document.querySelector(step.anchor)
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      // A zero-size or off-screen rect means the button is there but
      // not painted (skeleton swap, hidden nav). Treat as absent.
      if (r.width === 0 || r.height === 0) { setRect(null); return }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    // The page may still be loading its real header (the skeletons carry
    // no data-tour), so keep looking rather than giving up once.
    const poll = window.setInterval(measure, 400)
    const onScrollOrResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.clearInterval(poll)
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [running, step, onRoute, appModalOpen])

  /* ── dismissal ────────────────────────────────────────────────── */
  const dismiss = useCallback(() => {
    setRunning(false)
    if (!userId) return
    const state = readTourState(userId)
    writeTourState(userId, { ...state, dismissedAt: new Date().toISOString() })
  }, [userId])

  /* Escape dismisses. Clicking outside deliberately does NOT.
   *
   * An outside-click handler was here and it was wrong for this widget.
   * A tour exists to be used WHILE you work the app underneath it — the
   * overlay is a pointer-events:none cut-out precisely so the page stays
   * live — so almost every click a following user makes is "outside" the
   * card. Exempting the highlighted anchor was not enough: opening the
   * sidebar, scrolling via a scrollbar, clicking a field inside the form
   * the tour just told you to open, or missing the button by a few
   * pixels all killed the guide mid-step, with no way back except
   * Settings. Andy hit this immediately.
   *
   * Escape and the X remain, so it is still trivially escapable, and
   * both are deliberate acts rather than a side effect of using the app. */
  useEffect(() => {
    if (!running || appModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [running, appModalOpen, dismiss])

  if (!mounted || !running || !userId) return null

  const anim = reducedMotion ? '' : 'animate-in fade-in duration-200'

  /* Shared by BOTH the card and the docked hint, so the two can never
     disagree about how far along the user is. */
  const done = completedCount(live, steps)
  const total = steps.length
  const rail = buildRail(live, steps, index)

  const railLockLabel = (id: SetupTourStepId) => {
    const target = steps.find(s => s.id === id)
    return String(t('setupTour.locked', {
      step: target ? String(t(`${target.i18n}.short`)) : id,
    }))
  }

  /* ── modal open: hand over the screen, keep the guidance ──────── */
  // Docked out of the dialog's way, inert (`pointer-events-none`, no
  // focusable children), above the modal's z-[201] so it is not buried.
  if (appModalOpen) {
    if (!step) return null
    const HintIcon = STEP_ICONS[step.id]
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        style={hintDock.style}
        className={`fixed z-[202] pointer-events-none select-none overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.30),0_1px_2px_rgba(0,0,0,0.04)] ${anim}`}
      >
        {/* Same restrained wash the step card carries, so the hint reads
            as the same object docked out of the way rather than a
            second, unrelated widget. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-primary/[0.055] to-transparent pointer-events-none"
        />
        <div className="relative flex items-start gap-2.5 px-3.5 pt-3 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 flex items-center justify-center flex-shrink-0">
            <HintIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary flex items-center gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{String(t('setupTour.hintEyebrow'))}</span>
              <span className="text-gray-400 font-medium tracking-normal normal-case tabular-nums flex-shrink-0">
                {index + 1}/{total}
              </span>
            </p>
            <p className="text-[13px] font-semibold text-gray-900 mt-1 leading-snug">
              {String(t(`${step.i18n}.title`))}
            </p>
            <p className="text-[12px] text-gray-600 leading-relaxed mt-0.5">
              {String(t(`${step.i18n}.hint`))}
            </p>
          </div>
        </div>
        <ProgressMeter
          rail={rail}
          done={done}
          total={total}
          label={String(t('setupTour.railTitle'))}
          className="px-3.5 pb-3"
        />
      </div>,
      document.body,
    )
  }

  // Mid-probe on the step's own page: hold one frame rather than
  // flashing the centred fallback and snapping to the button.
  if (step && onRoute && !probed) return null

  const cardBox = { width: CARD_WIDTH, height: cardRef.current?.offsetHeight || CARD_HEIGHT_ESTIMATE }
  const placement: Placement | null = rect
    ? placeCard(rect, { width: window.innerWidth, height: window.innerHeight }, cardBox)
    : null
  // No anchor (off-route, or the button has not painted) means the card
  // is centred and points at nothing — so it gets no beak.
  const beak = rect ? beakFor(rect, placement, cardBox) : null

  const cardStyle: React.CSSProperties = placement
    ? { top: placement.top, left: placement.left, width: CARD_WIDTH }
    : {
        top: '50%', left: '50%', width: CARD_WIDTH,
        transform: 'translate(-50%, -50%)',
      }

  const celebratedStep = celebrating
    ? steps.find(s => s.id === celebrating.stepId) ?? null
    : null
  const Icon = celebratedStep ? Check : step ? STEP_ICONS[step.id] : PartyPopper
  const stepDone = step ? isStepComplete(step, live) : false

  const body = (
    <>
      {/* Spotlight. The dim is a 9999px box-shadow around the cut-out,
          so there is no element covering the app: the real button stays
          clickable and nothing is trapped. The accent glow rides the
          same shadow stack; the pulse is a separate, purely decorative
          layer so `prefers-reduced-motion` can drop it on its own. */}
      {rect && (
        <>
          <div
            aria-hidden="true"
            className={`fixed rounded-xl ring-2 ring-primary/80 pointer-events-none z-[190] ${anim}`}
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: `0 0 0 5px rgba(${PRIMARY_RGB},0.18), 0 0 0 9999px rgba(17,24,39,0.38)`,
            }}
          />
          {!reducedMotion && (
            <div
              aria-hidden="true"
              className="fixed rounded-xl ring-4 ring-primary/25 pointer-events-none z-[190] animate-pulse motion-reduce:animate-none"
              style={{
                top: rect.top - 10,
                left: rect.left - 10,
                width: rect.width + 20,
                height: rect.height + 20,
              }}
            />
          )}
        </>
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="setup-tour-title"
        style={cardStyle}
        className={`fixed z-[191] rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.28),0_2px_6px_rgba(0,0,0,0.04)] ${anim}`}
      >
        {beak && <BeakArrow beak={beak} />}

        {/* The card's own anchor: a wash under the header, tinted by
            state. Kept INSIDE the rounded corners and well under 10%
            alpha so the beak — which is painted flat white and can hang
            off any edge — never reads as a mismatched patch. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-24 rounded-t-2xl pointer-events-none bg-gradient-to-b to-transparent ${
            celebratedStep
              ? 'from-emerald-50'
              : step
                ? 'from-primary/[0.055]'
                : 'from-primary/[0.08]'
          }`}
        />

        <button
          type="button"
          onClick={dismiss}
          aria-label={String(t('common.close'))}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 inline-flex items-center justify-center transition-colors motion-reduce:transition-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── WHAT TO DO NOW ─────────────────────────────────────── */}
        <div className="relative p-4">
          {/* Header: icon chip beside the title, so the TITLE leads the
              card rather than sitting under a stack of chrome. */}
          <div className="flex items-start gap-3 pr-7">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              celebratedStep
                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.55)]'
                : step
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                  : 'bg-gradient-to-br from-primary to-blue-500 text-white ring-4 ring-primary/10 shadow-[0_2px_8px_-2px_rgba(40,133,232,0.55)]'
            }`}>
              <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums ${
                celebratedStep ? 'text-emerald-600' : 'text-primary'
              }`}>
                {celebratedStep
                  ? String(t('setupTour.completed.eyebrow'))
                  : step
                    ? String(t('setupTour.stepCounter', { current: index + 1, total }))
                    : String(t('setupTour.finish.eyebrow'))}
              </p>
              <h2 id="setup-tour-title" className="text-[17px] font-semibold tracking-tight text-gray-900 leading-snug mt-0.5">
                {celebratedStep
                  ? String(t(`${celebratedStep.i18n}.title`))
                  : step
                    ? String(t(`${step.i18n}.title`))
                    : String(t('setupTour.finish.title'))}
              </h2>
            </div>
          </div>

          <p className="text-[12.5px] text-gray-500 leading-relaxed mt-2">
            {celebratedStep
              ? String(t(`${celebratedStep.i18n}.praise`))
              : step
                ? String(t(`${step.i18n}.body`))
                : String(t('setupTour.finish.body'))}
          </p>

          {/* LIVE reading of the exact counter that defines "done" here.
              This is the thing that turns a static instruction into
              feedback: the number moves when the user's action lands.
              `key` flips with the state on purpose — remounting is what
              lets the enter animation replay when it crosses zero, so
              the flip is felt and not merely legible. */}
          {step && !celebratedStep && (
            <div
              key={stepDone ? 'some' : 'none'}
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 text-[12px] font-medium ring-1 ${
                stepDone
                  ? `bg-emerald-50 text-emerald-700 ring-emerald-200 shadow-[0_0_0_3px_rgba(16,185,129,0.08)] ${
                      reducedMotion ? '' : 'animate-in zoom-in-95 fade-in duration-300'
                    }`
                  : 'bg-gray-50 text-gray-500 ring-gray-200/70'
              }`}
            >
              {stepDone ? (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                </span>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                </span>
              )}
              <span className="tabular-nums">
                {stepDone
                  ? String(t(`${step.i18n}.statusSome`, { count: live[step.countKey] }))
                  : String(t(`${step.i18n}.statusNone`))}
              </span>
            </div>
          )}

          {/* THE action for this step, and the only primary in the card.
              Off-route it is a button that takes you there; on-route the
              real primary is the highlighted control in the page itself,
              so the card points at it instead of competing with it. */}
          {step && !celebratedStep && !onRoute && (
            <Button
              size="sm"
              className="w-full h-9 mt-3"
              onClick={() => router.push(step.route)}
            >
              <MapPin className="w-3.5 h-3.5" />
              {String(t(`${step.i18n}.goto`))}
            </Button>
          )}
          {step && !celebratedStep && onRoute && rect && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-primary/[0.07] ring-1 ring-primary/15 px-2.5 py-2">
              <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_-1px_rgba(40,133,232,0.5)]">
                <MousePointerClick className="w-3.5 h-3.5" strokeWidth={2.2} />
              </span>
              <p className="text-[12px] font-semibold text-primary leading-snug">
                {String(t('setupTour.useHighlighted'))}
              </p>
            </div>
          )}
          {step && !celebratedStep && onRoute && !rect && (
            <p className="mt-3 text-[12px] text-amber-800 bg-amber-50 ring-1 ring-amber-200/70 rounded-xl px-2.5 py-2 leading-relaxed">
              {String(t('setupTour.anchorMissing'))}
            </p>
          )}

          {/* ── WHERE YOU ARE OVERALL ───────────────────────────────
              An inset panel, deliberately a different surface from the
              white "do this now" block above it. It is inset rather
              than full-bleed so every card edge stays white and the
              beak can hang off any of the four. */}
          <div className="mt-4 rounded-xl bg-gray-50/80 ring-1 ring-gray-200/60 px-3 pt-2.5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {String(t('setupTour.railTitle'))}
              </p>
              <p className="text-[11px] font-semibold tabular-nums">
                <span className={done > 0 ? 'text-emerald-600' : 'text-gray-400'}>{done}</span>
                <span className="text-gray-400"> / {total}</span>
              </p>
            </div>

            {/* The progress indicator, one segment per step, in the same
                colours as the stepper markers below it. Segmented rather
                than continuous because at 0/5 a continuous bar is an
                empty rectangle that says nothing, while five empty pills
                still say "five steps, none done". */}
            <ProgressMeter
              rail={rail}
              done={done}
              total={total}
              label={String(t('setupTour.railTitle'))}
              className="mt-1.5"
            />

            <ol className="mt-2.5">
              {rail.map((item, i) => {
                const isCurrent = item.state === 'current'
                const isLast = i === rail.length - 1
                return (
                  <li key={item.step.id} className="flex gap-2.5">
                    {/* Marker column. The connector below each marker is
                        the rail's own progress track: it runs green
                        through the part of the sequence already done.
                        Absolutely positioned rather than a flex spacer
                        so it spans the gap BETWEEN rows — as a flex-1
                        sibling it collapsed to a hairline, because the
                        row is barely taller than the marker itself. */}
                    <div className="relative w-5 flex-shrink-0 self-stretch">
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 -translate-x-1/2 top-[27px] bottom-[-6px] w-0.5 rounded-full ${
                            item.state === 'done' ? 'bg-emerald-200' : 'bg-gray-200'
                          }`}
                        />
                      )}
                      <span className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold tabular-nums ${
                        isCurrent ? 'mt-[7px]' : 'mt-1.5'
                      } ${
                        item.state === 'done'
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-100'
                          : isCurrent
                            ? 'bg-primary text-white ring-[3px] ring-primary/15 shadow-[0_2px_5px_-1px_rgba(40,133,232,0.5)]'
                            : 'bg-white text-gray-400 ring-1 ring-gray-200'
                      }`}>
                        {item.state === 'done'
                          ? <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                          : item.state === 'locked'
                            ? <Lock className="w-2.5 h-2.5 text-gray-300" strokeWidth={2.5} />
                            : i + 1}
                      </span>
                    </div>

                    {/* The current row is a raised white tile on the
                        panel's grey. Deliberately NOT ringed in primary:
                        a full-width blue-ringed box reads as a focused
                        text field. The blue marker and the weight carry
                        "you are here"; the elevation carries "this row
                        is the one". */}
                    <div className={`min-w-0 flex-1 flex items-baseline gap-1.5 rounded-lg ${
                      isCurrent
                        ? 'bg-white ring-1 ring-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-2 py-2'
                        : 'px-2 py-2'
                    }`}>
                      <span className={`truncate ${
                        item.state === 'done'
                          ? 'text-[12px] text-gray-400'
                          : isCurrent
                            ? 'text-[12.5px] text-gray-900 font-semibold'
                            : item.state === 'locked'
                              ? 'text-[12px] text-gray-400'
                              : 'text-[12px] text-gray-600'
                      }`}>
                        {String(t(`${item.step.i18n}.rail`))}
                      </span>
                      <span className="sr-only">
                        {String(t(`setupTour.railState.${item.state}`))}
                      </span>
                      {item.state === 'locked' && item.lockedBy && (
                        /* Quiet metadata, not an error: no colour, no
                           weight, and it gives up its width to the step
                           name rather than truncating it. */
                        <span className="ml-auto text-[10px] font-normal text-gray-400 truncate">
                          {railLockLabel(item.lockedBy)}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Navigation. Exactly one primary lives in this card and it is
              NOT here: "Next" means "skip ahead", so it is the quiet
              outline, and "Exit guide" / "Back" is quieter still. The
              two states where the card genuinely owns the next action —
              a step just completed, and the finish card — are the only
              ones where the right-hand button goes solid. */}
          <div className="flex items-center gap-2 mt-3.5">
            {index > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-gray-500 hover:text-gray-900"
                onClick={() => { setCelebrating(null); setIndex(index - 1) }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {String(t('setupTour.back'))}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="px-2 text-gray-500 hover:text-gray-900"
                onClick={dismiss}
              >
                {String(t('setupTour.exit'))}
              </Button>
            )}
            {celebrating ? (
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => { const n = celebrating.nextIndex; setCelebrating(null); setIndex(n) }}
              >
                {String(t('setupTour.completed.cta'))}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : step ? (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setIndex(index + 1)}
              >
                {String(t('setupTour.next'))}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button size="sm" className="ml-auto" onClick={dismiss}>
                <Check className="w-3.5 h-3.5" />
                {String(t('setupTour.finish.cta'))}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(body, document.body)
}
