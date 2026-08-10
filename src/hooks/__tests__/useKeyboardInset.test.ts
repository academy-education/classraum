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
 * NOT covered: the native path, which comes from the Capacitor plugin
 * and is a reported height rather than a computed one. There is nothing
 * to get wrong there that a unit test could see.
 */
import { keyboardInsetFromViewport } from '../useKeyboardInset'

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
