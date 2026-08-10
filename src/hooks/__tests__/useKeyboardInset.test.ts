/**
 * The keyboard inset is a NUMBER, and a wrong number here does not look
 * broken — it looks like a layout that is slightly off, which is exactly
 * the kind of defect that ships. Hence a test on the arithmetic rather
 * than a screenshot of the result.
 *
 * BREAK-TEST: drop the `- vvOffsetTop` term and "ignores how far the
 * visual viewport has been scrolled" fails with 340 instead of 300. Drop
 * the 80px floor and "does not mistake collapsing browser chrome for a
 * keyboard" fails with 60 instead of 0.
 *
 * There is no longer a native path to cover — see the first describe
 * block for why the one that existed was removed.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { keyboardInsetFromViewport } from '../useKeyboardInset'

describe('the inset has exactly one source', () => {
  /*
   * REGRESSION GUARD, and it is guarding a bug that shipped.
   *
   * The first version asked the Capacitor Keyboard plugin for the height
   * on native and used visualViewport only on the web. Android's WebView
   * resizes for the keyboard by itself, so 100dvh was ALREADY reduced;
   * subtracting the plugin's ~300px again left the auth form in a ~125px
   * strip above a dead gap. Users saw it before any check did.
   *
   * The defect is not arithmetic, so no assertion on the numbers can
   * catch it — it is the presence of a second, ABSOLUTE source that
   * cannot know whether the layout already applied it. visualViewport is
   * a DIFFERENCE and therefore self-correcting on both platforms. This
   * test pins that structural property.
   */
  const src = readFileSync(join(__dirname, '..', 'useKeyboardInset.ts'), 'utf8')

  it('never reads the keyboard height from the Capacitor plugin', () => {
    expect(src).not.toContain('@capacitor/keyboard')
    expect(src).not.toContain('keyboardWillShow')
    expect(src).not.toContain('keyboardDidShow')
  })

  it('does not branch on platform', () => {
    // A platform branch is how the two sources got in last time.
    expect(src).not.toContain('isNativePlatform')
    expect(src).not.toContain('@capacitor/core')
  })
})

describe('keyboardInsetFromViewport', () => {
  it('is 0 when the visual and layout viewports agree — no keyboard', () => {
    expect(keyboardInsetFromViewport(812, 812, 0)).toBe(0)
  })

  it('reports the covered strip when the keyboard opens', () => {
    // iPhone 13: 812pt tall, ~336pt keyboard.
    expect(keyboardInsetFromViewport(812, 476, 0)).toBe(336)
  })

  it('ignores how far the visual viewport has been scrolled', () => {
    // Same 300px keyboard, but the user has scrolled 40px within it.
    // Without subtracting offsetTop this reads 340 and the layout
    // over-shrinks by exactly the scroll distance — a bug that only
    // appears after the user scrolls, i.e. not in any first screenshot.
    expect(keyboardInsetFromViewport(812, 472, 40)).toBe(300)
  })

  it('does not mistake collapsing browser chrome for a keyboard', () => {
    // Mobile Safari's URL bar is ~60px. Treating it as a keyboard makes
    // the page twitch on every scroll.
    expect(keyboardInsetFromViewport(812, 752, 0)).toBe(0)
  })

  it('takes an 81px strip but not a 79px one — the floor is exclusive', () => {
    expect(keyboardInsetFromViewport(812, 731, 0)).toBe(81)
    expect(keyboardInsetFromViewport(812, 733, 0)).toBe(0)
  })

  it('never returns a negative inset', () => {
    // vv.height can briefly exceed innerHeight mid-rotation. A negative
    // inset would GROW the container past the screen.
    expect(keyboardInsetFromViewport(812, 900, 0)).toBe(0)
  })

  it('rounds, so the style string never carries a fraction', () => {
    expect(keyboardInsetFromViewport(812, 475.5, 0)).toBe(337)
  })
})
