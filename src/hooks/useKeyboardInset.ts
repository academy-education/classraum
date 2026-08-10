import { useEffect, useState } from 'react'

/**
 * How many CSS pixels the on-screen keyboard is currently covering.
 *
 * ── Why this has to exist ────────────────────────────────────────────
 *
 * Capacitor is configured with `Keyboard.resize: 'body'`, which shrinks
 * <body> when the keyboard opens. That would have been enough — except
 * globals.css pins the native shell:
 *
 *     html.native-app, html.native-app body {
 *       height: 100%; overflow: hidden; position: fixed;
 *       top: 0; left: 0; right: 0; bottom: 0;
 *     }
 *
 * `position: fixed` with all four insets re-stretches body the instant
 * the plugin shrinks it, and `overflow: hidden` means nothing can scroll
 * out from under the keyboard either. So the platform mechanism is
 * present, configured, and inert.
 *
 * Fixing it in capacitor.config.ts is NOT an option: that file is
 * compiled into the native shell, so a change there reaches nobody who
 * has already installed the app. Everything here is web-layer, and the
 * app loads from `server.url` (app.classraum.com), so it ships on deploy.
 *
 * Returns 0 whenever the keyboard is closed, on the server, and on any
 * platform without visualViewport — a component reading this should
 * degrade to exactly its old layout at 0, never to a broken one.
 */
/**
 * The occluded strip, from viewport geometry alone.
 *
 * Pulled out of the effect below so it is testable without a browser: it
 * is the only part of the web path that can be wrong in a way no
 * screenshot would reveal, since a wrong number here produces a layout
 * that is merely off rather than obviously broken.
 *
 * @param innerHeight  window.innerHeight — the LAYOUT viewport, which
 *                     does not shrink for the keyboard.
 * @param vvHeight     visualViewport.height — which does.
 * @param vvOffsetTop  visualViewport.offsetTop — how far the visual
 *                     viewport has been scrolled inside the layout one.
 */
export function keyboardInsetFromViewport(
  innerHeight: number,
  vvHeight: number,
  vvOffsetTop: number,
): number {
  const covered = innerHeight - vvHeight - vvOffsetTop
  // Below ~80px this is browser chrome appearing/collapsing on scroll,
  // not a keyboard. Treating that as a keyboard would make the layout
  // twitch every time the URL bar hides. No keyboard is this short.
  return covered > 80 ? Math.round(covered) : 0
}

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    /*
     * ONE source, on every platform: visualViewport.
     *
     * The first version of this hook asked the Capacitor Keyboard plugin
     * for the height on native and used visualViewport only on the web.
     * That SHIPPED AND BROKE ANDROID: the plugin reports the raw
     * keyboard height whether or not the layout has already accounted
     * for it, and on Android the WebView resizes for the keyboard by
     * itself. So `100dvh` was already the reduced height, subtracting the
     * plugin's ~600px again left the auth form in a ~230px strip with a
     * dead gap above the keys.
     *
     * visualViewport cannot make that mistake, because it is a
     * DIFFERENCE rather than an absolute:
     *
     *   Android, layout viewport already shrank
     *     innerHeight ~= vv.height  ->  inset ~= 0, and 100dvh is
     *     already correct. Nothing is subtracted twice.
     *
     *   iOS, layout viewport does NOT shrink
     *     innerHeight - vv.height = the keyboard, which is exactly the
     *     amount 100dvh over-reports. Subtracting it is right.
     *
     * The number self-corrects per platform, which the plugin's absolute
     * height can never do. The lesson worth keeping: an absolute
     * measurement and a layout that may or may not have already applied
     * it cannot be combined without knowing which happened — and a
     * difference sidesteps the question entirely.
     */
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined
    if (!vv) return

    const read = () => {
      setInset(keyboardInsetFromViewport(window.innerHeight, vv.height, vv.offsetTop))
    }

    read()
    vv.addEventListener('resize', read)
    vv.addEventListener('scroll', read)
    return () => {
      vv.removeEventListener('resize', read)
      vv.removeEventListener('scroll', read)
    }
  }, [])

  return inset
}
