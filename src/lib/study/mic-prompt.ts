/**
 * Tracks whether a microphone permission prompt is on screen.
 *
 * Exists for exactly one consumer: the timed-test exit guard. On iOS a
 * `getUserMedia` permission alert makes the app resign active, and on
 * some Android builds the runtime permission dialog can stop the
 * activity. Either one looks identical to "the student switched to
 * Safari to look up the answer" unless we know we asked for the mic.
 *
 * Kept in its own module (rather than on VoiceRecorder) so the guard —
 * and its tests — don't have to pull in a React component tree.
 */

import { MIC_PROMPT_SETTLE_MS } from './test-exit-guard'

let inFlight = 0
let lastEndedAt = 0

/** Call immediately before `navigator.mediaDevices.getUserMedia`. */
export function beginMicPrompt(): void {
  inFlight += 1
}

/** Call in the `finally` of the getUserMedia call. */
export function endMicPrompt(): void {
  inFlight = Math.max(0, inFlight - 1)
  lastEndedAt = Date.now()
}

/**
 * Is a prompt open, or was one dismissed within the settle window?
 * The trailing window matters because the lifecycle event and the
 * promise resolution do not arrive in a guaranteed order.
 */
export function isMicPromptRecent(now: number = Date.now(), settleMs: number = MIC_PROMPT_SETTLE_MS): boolean {
  if (inFlight > 0) return true
  return lastEndedAt > 0 && now - lastEndedAt < settleMs
}

/** Test-only reset. */
export function __resetMicPromptState(): void {
  inFlight = 0
  lastEndedAt = 0
}
