"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import {
  X, ArrowRight, ArrowLeft, Check, UserPlus, School, Users, Calendar,
  ClipboardList, PartyPopper, MapPin, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { useSetupCounts } from './useSetupCounts'
import {
  type DashboardRole, type SetupTourStep, type SetupTourStepId, type SetupCounts,
  EMPTY_COUNTS, visibleSteps, isStepComplete, resumeStepIndex, completedCount,
  readTourState, writeTourState, isTourRunning, placeCard,
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
 *   button — rather than replacing it or sitting beside it. That keeps
 *   exactly one onboarding widget on the dashboard, reuses the
 *   existing freshness test instead of inventing a second definition
 *   of "new user", and leaves the checklist doing the thing it is
 *   genuinely good at: a persistent map you can glance at.
 *
 * ── Escapability ─────────────────────────────────────────────────────
 * Nothing here traps anyone. There is no interactive backdrop: the dim
 * is painted by a huge box-shadow on a `pointer-events: none` cut-out,
 * so every pixel of the app underneath stays clickable, including the
 * button the tour is pointing at. X, Escape and a click anywhere
 * outside the card/anchor all dismiss.
 *
 * ── Standing aside for real modals ───────────────────────────────────
 * The moment the user opens the very modal we sent them to, `<Modal>`
 * puts `data-app-modal` on its backdrop and this component renders
 * null and stops listening for Escape / outside clicks. Otherwise the
 * first click inside the classroom form would dismiss the tour and
 * Escape would be fought over by two components.
 */

const STEP_ICONS: Record<SetupTourStepId, LucideIcon> = {
  teachers: UserPlus,
  classroom: School,
  students: Users,
  session: Calendar,
  assignment: ClipboardList,
}

const CARD_WIDTH = 340
const CARD_HEIGHT_ESTIMATE = 260

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

/** True while any `<Modal>` is mounted. Watches body's child list,
 *  which is where every modal portals to (see ModalPortal / Modal). */
function useAppModalOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const read = () => setOpen(!!document.querySelector('[data-app-modal]'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return open
}

export function SetupTour({ userRole }: { userRole: string | null }) {
  const { user, academyId } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const reducedMotion = usePrefersReducedMotion()
  const appModalOpen = useAppModalOpen()
  const userId = user?.id

  const [running, setRunning] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  // False until the anchor has been looked for at least once on this
  // step. Without it the card paints centre-screen for one frame on a
  // hard reload and then jumps to the button — a visible flinch.
  const [probed, setProbed] = useState(false)
  const [mounted, setMounted] = useState(false)
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

  /* ── advance when the work actually gets done ─────────────────── */
  // Keyed on a signature of the COUNTS, deliberately. Reacting to
  // `index` too would make Back unusable: stepping back onto a step the
  // user already finished would bounce them straight forward again.
  const lastCountsSig = useRef<string | null>(null)
  useEffect(() => {
    if (!running || !counts) { lastCountsSig.current = null; return }
    const sig = JSON.stringify(counts)
    if (lastCountsSig.current === sig) return
    const first = lastCountsSig.current === null
    lastCountsSig.current = sig
    if (first) return // the resume effect owns the initial position
    setIndex(current => {
      if (current >= steps.length || !isStepComplete(steps[current], counts)) return current
      let next = current + 1
      while (next < steps.length && isStepComplete(steps[next], counts)) next += 1
      return next
    })
  }, [counts, running, steps])

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

  useEffect(() => {
    if (!running || appModalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) return
      if (cardRef.current?.contains(target)) return
      // Clicking the highlighted control is the point of the tour —
      // it must not count as "outside".
      if (step && target.closest(step.anchor)) return
      dismiss()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [running, appModalOpen, dismiss, step])

  if (!mounted || !running || !userId || appModalOpen) return null
  // Mid-probe on the step's own page: hold one frame rather than
  // flashing the centred fallback and snapping to the button.
  if (step && onRoute && !probed) return null

  const done = completedCount(live, steps)
  const total = steps.length
  const anim = reducedMotion ? '' : 'animate-in fade-in duration-200'

  const placement = rect
    ? placeCard(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        { width: CARD_WIDTH, height: cardRef.current?.offsetHeight || CARD_HEIGHT_ESTIMATE },
      )
    : null

  const cardStyle: React.CSSProperties = placement
    ? { top: placement.top, left: placement.left, width: CARD_WIDTH }
    : {
        top: '50%', left: '50%', width: CARD_WIDTH,
        transform: 'translate(-50%, -50%)',
      }

  const Icon = step ? STEP_ICONS[step.id] : PartyPopper

  const body = (
    <>
      {/* Spotlight. The dim is a 9999px box-shadow around the cut-out,
          so there is no element covering the app: the real button stays
          clickable and nothing is trapped. */}
      {rect && (
        <div
          aria-hidden="true"
          className={`fixed rounded-xl ring-2 ring-primary pointer-events-none z-[190] ${anim}`}
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(17,24,39,0.45)',
          }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby="setup-tour-title"
        style={cardStyle}
        className={`fixed z-[191] rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.03)] p-5 ${anim}`}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={String(t('common.close'))}
          className="absolute top-3 right-3 w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 inline-flex items-center justify-center transition-colors motion-reduce:transition-none"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
          {step
            ? String(t('setupTour.stepCounter', { current: index + 1, total }))
            : String(t('setupTour.finish.eyebrow'))}
        </p>
        <h2 id="setup-tour-title" className="text-[17px] font-semibold tracking-tight text-gray-900">
          {step ? String(t(`${step.i18n}.title`)) : String(t('setupTour.finish.title'))}
        </h2>
        <p className="text-[13px] text-gray-600 leading-relaxed mt-1.5">
          {step ? String(t(`${step.i18n}.body`)) : String(t('setupTour.finish.body'))}
        </p>

        {/* Off-route, or the control isn't on screen yet. Never a dead
            end: say so and offer the way there. */}
        {step && !onRoute && (
          <Button
            size="sm"
            className="w-full mt-4"
            onClick={() => router.push(step.route)}
          >
            <MapPin className="w-3.5 h-3.5 mr-1.5" />
            {String(t(`${step.i18n}.goto`))}
          </Button>
        )}
        {step && onRoute && !rect && (
          <p className="mt-3 text-[12px] text-amber-700 bg-amber-50 ring-1 ring-amber-200/70 rounded-lg px-2.5 py-2">
            {String(t('setupTour.anchorMissing'))}
          </p>
        )}

        {/* Progress */}
        <div className="flex items-center gap-1.5 mt-4">
          {steps.map((s, i) => {
            const complete = isStepComplete(s, live)
            return (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === index ? 'w-6 bg-primary' : complete ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-gray-200'
                }`}
              />
            )
          })}
          <span className="ml-auto text-[11px] font-medium text-gray-500 tabular-nums">
            {done} / {total}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {index > 0 ? (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIndex(index - 1)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              {String(t('setupTour.back'))}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" onClick={dismiss}>
              {String(t('setupTour.exit'))}
            </Button>
          )}
          {step ? (
            <Button size="sm" className="flex-1" onClick={() => setIndex(index + 1)}>
              {String(t('setupTour.next'))}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" className="flex-1" onClick={dismiss}>
              <Check className="w-3.5 h-3.5 mr-1" />
              {String(t('setupTour.finish.cta'))}
            </Button>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(body, document.body)
}
