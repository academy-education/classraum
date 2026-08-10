"use client"

import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, TouchEvent } from 'react'
// The study icon set's Loader2 (a Phosphor circle-notch), i.e. the exact
// spinner the League page has always shown — not lucide's.
import { Loader2 } from '@/app/mobile/study/_shared/icons'
import { hapticTap } from '@/lib/nativeHaptics'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

/**
 * Pull-to-refresh — THE one implementation. Do not write another.
 *
 * This file is the study hook that already existed here as
 * `usePullToRefresh.ts`; it grew the `<PullToRefresh>` component (hence the
 * .tsx) and absorbed the second implementation rather than being replaced
 * by a new file, so there is exactly one of these and always was.
 *
 * There used to be two, and they did not agree on a single number or on
 * what the gesture felt like:
 *
 *   - the study version (`usePullToRefresh`, rendered by StudyScrollShell,
 *     of which the League page was the reference): threshold 72px of
 *     *damped* pull, 0.5 rubber-band resistance, cap 96, a light haptic the
 *     moment you cross the threshold, and an `await`ed refresh so the
 *     spinner holds until the data actually lands.
 *   - the profile version (hand-rolled inline in /mobile/profile): threshold
 *     80px of *raw* finger travel, no damping, cap 100, a medium haptic on
 *     release rather than on crossing, and a spinner-plus-text indicator.
 *
 * Same gesture, different distance to trigger it, different resistance,
 * different haptic, different indicator. Users hit both surfaces in one
 * session and felt the app change under them.
 *
 * The study/League behaviour won, deliberately: damping and a
 * crossing-haptic make the pull feel like a native list rather than a web
 * page dragging, and awaiting the refresh is the only variant where the
 * spinner tells the truth about when the data arrived. What the profile
 * copy lost: its raw 80px threshold, its medium haptic, and its
 * "Pull to refresh" / "Refreshing" text beside the spinner — the text goes
 * because a second indicator style is a second implementation. What it
 * kept, and spread to everyone: the MOBILE_FEATURES kill switch below.
 *
 * Both surfaces now go through this file, so the two cannot drift apart
 * again: change the feel here and every surface changes together.
 *
 * WHERE THIS BELONGS: any screen showing server data that can go stale —
 * the study landing, stats, history, wrong-notebook, league, path, topic
 * lists, friends, the profile page.
 *
 * WHERE IT MUST NOT GO: test-taking and in-session screens — anything under
 * `study/session/**`, and any surface rendering an active test, practice
 * run, or flashcard session. Two reasons, both data loss:
 *   1. A refresh mid-test re-fetches and re-renders the question, which
 *      throws away un-submitted answers and in-progress state.
 *   2. Answer choices and next/submit controls sit near the top of the
 *      scroll area, exactly where a downward pull starts. A gesture meant
 *      to scroll back to the passage becomes a mis-tap or an unwanted
 *      reload, under a timer the student cannot pause.
 * A student mid-test has no stale data to fix; the session already owns
 * the freshest state there is. There is nothing to gain and a test to lose.
 */

const THRESHOLD = 72 // px of (damped) pull needed to trigger a refresh
const MAX_PULL = 96 // cap so the content never slides too far
const DAMP = 0.5 // rubber-band resistance on the raw finger delta

/**
 * The gesture mechanism, without any markup. Prefer the `<PullToRefresh>`
 * component below — reach for the hook only when a screen needs to own its
 * own scroll container. Attach `handlers` to the scrollable element and
 * point `scrollRef` at it; render the indicator off `pullDistance` /
 * `refreshing` and translate the content down by `pullDistance`.
 *
 * Only engages when the container is scrolled to the very top, so it never
 * fights a normal upward scroll.
 */
export function usePullToRefresh(onRefresh: (() => void | Promise<void>) | undefined) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef<number | null>(null)
  const armedRef = useRef(false) // began the gesture at scrollTop 0
  const crossedRef = useRef(false) // already fired the threshold haptic
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!onRefresh || refreshing) return
    // Only arm when the list is at the very top; otherwise this is a scroll.
    armedRef.current = (scrollRef.current?.scrollTop ?? 1) <= 0
    startY.current = armedRef.current ? e.touches[0].clientY : null
    crossedRef.current = false
  }, [onRefresh, refreshing])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!armedRef.current || startY.current === null || refreshing) return
    const raw = e.touches[0].clientY - startY.current
    if (raw <= 0) { setPullDistance(0); return } // pulling up → ignore
    const damped = Math.min(MAX_PULL, raw * DAMP)
    setPullDistance(damped)
    if (!crossedRef.current && damped >= THRESHOLD) {
      crossedRef.current = true
      hapticTap()
    }
  }, [refreshing])

  const onTouchEnd = useCallback(async () => {
    if (!armedRef.current || refreshing) { setPullDistance(0); return }
    armedRef.current = false
    startY.current = null
    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true)
      setPullDistance(THRESHOLD) // hold the spinner at the threshold row
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, onRefresh])

  // MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH is the app-wide kill switch. It
  // was previously honoured only by the hand-rolled profile copy; now it
  // gates every surface, which is what a kill switch is for.
  const enabled = !!onRefresh && MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH
  return {
    scrollRef,
    pullDistance,
    refreshing,
    threshold: THRESHOLD,
    enabled,
    /** Spread onto the scroll container (no-ops when disabled). */
    handlers: enabled ? { onTouchStart, onTouchMove, onTouchEnd } : {},
  }
}

/**
 * The scroll container with pull-to-refresh attached. Owns the scrolling
 * element, the spinner, and the drag translation, so callers only supply
 * content and a refresh function.
 *
 * Renders a plain scroll container when `onRefresh` is omitted — safe to
 * use unconditionally on a screen that may or may not support refreshing.
 */
export function PullToRefresh({
  onRefresh, children, className, style, contentClassName,
}: {
  /** Called on release past the threshold. Await your data reload so the
   *  spinner holds until it's actually done. Omit to disable the gesture. */
  onRefresh?: () => void | Promise<void>
  children: ReactNode
  /** Classes for the scroll container itself. */
  className?: string
  /** Extra styles for the scroll container (merged under touchAction). */
  style?: CSSProperties
  /** Classes for the wrapper that translates with the pull. */
  contentClassName?: string
}) {
  const { scrollRef, pullDistance, refreshing, threshold, enabled, handlers } = usePullToRefresh(onRefresh)
  const pulled = pullDistance > 0
  return (
    <div
      ref={scrollRef}
      {...handlers}
      className={className}
      style={pulled ? { ...style, touchAction: 'none' } : style}
    >
      {/* Spinner — sits in the gap the content reveals as it's dragged
          down; spins once refreshing, otherwise rotates with the pull for
          a live-feeling gesture. */}
      {enabled && (pulled || refreshing) && (
        <div
          className="absolute top-0 inset-x-0 z-0 flex items-end justify-center pb-2 pointer-events-none"
          style={{ height: pullDistance || threshold, opacity: Math.min(1, pullDistance / threshold || (refreshing ? 1 : 0)) }}
          aria-hidden
        >
          <Loader2
            className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
            style={refreshing ? undefined : { transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}
      <div
        className={[
          'relative z-[1]',
          pulled ? '' : 'transition-transform duration-300 ease-out',
          contentClassName ?? '',
        ].filter(Boolean).join(' ')}
        style={pulled ? { transform: `translateY(${pullDistance}px)` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}
