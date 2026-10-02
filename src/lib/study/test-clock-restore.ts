/**
 * How a timed test's clock comes back when the page is (re)loaded.
 *
 * Reported 2026-10-02: a student paused a Digital SAT section at night
 * with 20+ minutes left, came back the next day, found the test
 * UNPAUSED and about 10 minutes gone. The cause was that `paused` lived
 * only in React state. The elapsed time was persisted (and correctly
 * frozen at the pause), but the pause itself was not, so when iOS Safari
 * discarded the tab overnight and reloaded it, the restore path started
 * the clock immediately — and did so even if the page was loading while
 * hidden, because no 'hidden' transition ever arrives for a page that
 * starts hidden. Every minute between that reload and the student
 * looking was charged. The night itself was not (a discarded tab runs
 * no code, and the stored elapsed had stopped at the pause), which is
 * why the loss was minutes, not zero and not the whole night.
 *
 * Product intent, from TestSession's visibility handler and the native
 * exit guard: the clock runs only while the student is actually in the
 * test. A hidden tab freezes it; leaving the native app pauses it. This
 * module extends the same rule across a reload:
 *
 *   - paused when it went away  → comes back paused (time intact)
 *   - unpaused, gone a while    → comes back paused: they were away, and
 *                                 landing on a live question that is
 *                                 already ticking is how time was lost
 *   - unpaused, quick refresh   → keeps running if the page is visible
 *   - page loading hidden       → clock stays frozen until visible
 *
 * In no case is wall time spent closed or paused counted: the stored
 * elapsed is ACTIVE time, and the clock restarts from it.
 */

/** How stale the last heartbeat may be before a reload counts as
 *  "came back after being away" rather than a refresh. The heartbeat is
 *  written every second while the test is open, so a refresh is a few
 *  seconds; anything past this the student was not there. */
export const RESTORE_AWAY_MS = 30_000

export function pausedKey(sessionId: string): string {
  return `study:test:${sessionId}:paused`
}

/** Last time the open test page was alive (ms epoch). */
export function heartbeatKey(sessionId: string): string {
  return `study:test:${sessionId}:aliveAt`
}

export interface RestoreInput {
  /** The pause flag persisted for this session ('1' = paused). */
  storedPaused: string | null
  /** The persisted heartbeat, raw. Null on a fresh test. */
  storedAliveAt: string | null
  /** Was there any stored elapsed? False = first open of a fresh test. */
  hasStoredElapsed: boolean
  now: number
  /** document.visibilityState === 'visible' at restore time. */
  visible: boolean
}

export interface RestoreDecision {
  /** Show the paused overlay; the clock stays frozen until Resume. */
  paused: boolean
  /** Start the clock now. False = frozen (paused, or page hidden — the
   *  visibility handler starts it on the next 'visible'). */
  running: boolean
}

export function decideRestoredClock(i: RestoreInput): RestoreDecision {
  if (i.storedPaused === '1') return { paused: true, running: false }
  if (i.hasStoredElapsed) {
    const aliveAt = i.storedAliveAt == null ? NaN : Number(i.storedAliveAt)
    // No heartbeat on a test that has elapsed time = written by a build
    // before the heartbeat existed; we cannot tell how long they were
    // gone, so take the side that cannot cost them time.
    const away = !Number.isFinite(aliveAt) || i.now - aliveAt >= RESTORE_AWAY_MS
    if (away) return { paused: true, running: false }
  }
  return { paused: false, running: i.visible }
}
