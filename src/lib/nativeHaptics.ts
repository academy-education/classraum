/**
 * Lightweight haptic feedback helper.
 *
 * Strategy:
 *   1. Native (iOS/Android Capacitor): use `@capacitor/haptics`. iOS gets
 *      device-grade UIImpactFeedbackGenerator + UISelectionFeedbackGenerator
 *      via the plugin bridge. Android uses the system Vibrator.
 *   2. Web (Android Chrome with vibrate API): fall back to `navigator.vibrate`.
 *      Lets pull-to-refresh / button taps still feel tactile in the dev browser.
 *   3. Otherwise (desktop, iOS Safari web): silent no-op.
 *
 * All calls are fire-and-forget — never throw, never await. Safe to drop
 * inline in any onClick / event handler.
 */

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

type HapticImpactStyle = 'light' | 'medium' | 'heavy'
type HapticNotificationType = 'success' | 'warning' | 'error'

const isNative = (): boolean => Capacitor.isNativePlatform()

/** Light tap — for buttons, toggles, tab switches. */
export function hapticTap(): void {
  if (isNative()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { /* ignore */ })
    return
  }
  webVibrate(10)
}

/** Medium impact — for confirmations, larger interactions. */
export function hapticImpact(style: HapticImpactStyle = 'medium'): void {
  if (isNative()) {
    const native =
      style === 'heavy' ? ImpactStyle.Heavy :
      style === 'medium' ? ImpactStyle.Medium :
      ImpactStyle.Light
    Haptics.impact({ style: native }).catch(() => { /* ignore */ })
    return
  }
  webVibrate(style === 'heavy' ? 25 : style === 'medium' ? 15 : 10)
}

/** Notification haptic — for success/warning/error toasts. */
export function hapticNotification(type: HapticNotificationType = 'success'): void {
  if (isNative()) {
    const native =
      type === 'success' ? NotificationType.Success :
      type === 'warning' ? NotificationType.Warning :
      NotificationType.Error
    Haptics.notification({ type: native }).catch(() => { /* ignore */ })
    return
  }
  // Pattern feedback for distinguishability on Android Chrome
  const pattern =
    type === 'success' ? [10, 60, 10] :
    type === 'warning' ? [20, 80, 20] :
    [30, 80, 30, 80, 30]
  webVibratePattern(pattern)
}

/** Selection-changed haptic — for picker scrolls / list selection. */
export function hapticSelection(): void {
  if (isNative()) {
    Haptics.selectionChanged().catch(() => { /* ignore */ })
    return
  }
  webVibrate(5)
}

// ----- Web fallbacks -----

function webVibrate(ms: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(ms)
  } catch {
    // Some browsers throw when vibrate is restricted (e.g. without user gesture)
  }
}

function webVibratePattern(pattern: number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch { /* ignore */ }
}

// ----- Capability checks (for callers that want to gate UI) -----

/** True if any haptic feedback path is available on this device. */
export function hasHapticFeedback(): boolean {
  if (typeof window === 'undefined') return false
  if (isNative()) return true
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/** True if the higher-quality native haptic plugin is wired up (iOS/Android). */
export function hasNativeHapticPlugin(): boolean {
  return isNative()
}
