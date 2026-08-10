import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

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
 * `position: fixed` with all four insets re-stretches body to the full
 * screen the instant the plugin shrinks it, and `overflow: hidden` means
 * nothing can scroll out from under the keyboard either. So the platform
 * mechanism is present, configured, and inert.
 *
 * Fixing it in capacitor.config.ts is NOT an option: that file is
 * compiled into the native shell, so a change there reaches nobody who
 * has already installed the app. Everything here is web-layer, and the
 * app loads from `server.url` (app.classraum.com), so it ships on deploy.
 *
 * ── Why two sources ──────────────────────────────────────────────────
 *
 * Native gives an exact height via the Keyboard plugin. The browser (and
 * Android Chrome, and the desktop preview) gives nothing of the sort, so
 * we derive it from visualViewport, which DOES shrink for the keyboard
 * even when the layout viewport does not. Both paths converge on one
 * number so callers never branch on platform.
 *
 * Returns 0 whenever the keyboard is closed, on the server, and on any
 * platform where neither source is available — a component reading this
 * should degrade to exactly its old layout at 0, never to a broken one.
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
    // ── Native: the plugin reports an exact height ──
    if (Capacitor.isNativePlatform()) {
      const removers: Array<() => void> = []
      let cancelled = false

      // The listener promise resolves asynchronously; if the component
      // unmounted first, remove it immediately rather than leaking it
      // until the next keyboard event.
      const keep = (p: Promise<{ remove: () => Promise<void> }>) => {
        void p.then(l => {
          if (cancelled) void l.remove()
          else removers.push(() => void l.remove())
        })
      }

      // BOTH will- and did-show, deliberately. iOS fires `will` early
      // enough to move with the keyboard; Android's `will` is less
      // dependable across OEM keyboards, and `did` always lands. Taking
      // whichever arrives means one is redundant, not that one is wrong
      // — they carry the same height.
      const show = (info: { keyboardHeight: number }) => setInset(info.keyboardHeight)
      keep(Keyboard.addListener('keyboardWillShow', show))
      keep(Keyboard.addListener('keyboardDidShow', show))

      const hide = () => setInset(0)
      keep(Keyboard.addListener('keyboardWillHide', hide))
      keep(Keyboard.addListener('keyboardDidHide', hide))

      return () => {
        cancelled = true
        removers.forEach(r => r())
      }
    }

    // ── Web: infer from visualViewport ──
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
