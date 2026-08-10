/**
 * Which elements press back.
 *
 * THIS TEST EXISTS BECAUSE THE FIRST ATTEMPT MISSED THE WHOLE PRODUCT.
 * Haptics were added to the shared <Button> component and verified on a
 * single auth-page button. Study mode contains 185 raw `<button>`
 * elements and imports that component in ZERO files, so the change
 * covered none of the surface that was asked about. One green check on
 * one button was read as app-wide coverage.
 *
 * The predicate is a pure function precisely so the question "does a
 * hand-rolled button count?" has an answer that is asserted rather than
 * assumed.
 *
 * BREAK-TEST: delete the `el.closest(OPT_OUT)` line and "respects
 * data-no-haptic" fails; delete the aria-disabled line and "ignores an
 * aria-disabled control" fails.
 */
import { shouldHapticOnClick } from '../haptic-targets'

const mount = (html: string): HTMLElement => {
  document.body.innerHTML = html
  return document.body.firstElementChild as HTMLElement
}

describe('shouldHapticOnClick', () => {
  it('fires for a RAW <button> — the case the first attempt missed', () => {
    const el = mount('<button class="rounded-xl bg-primary">Start</button>')
    expect(shouldHapticOnClick(el)).toBe(true)
  })

  it('fires when the click lands on a child of the button', () => {
    // Real buttons wrap icons and spans; e.target is usually the child.
    const el = mount('<button><span id="lbl">Start</span></button>')
    expect(shouldHapticOnClick(el.querySelector('#lbl'))).toBe(true)
  })

  it.each([
    ['a link', '<a href="/x">go</a>'],
    ['a div with role=button', '<div role="button">tap</div>'],
    ['a tab', '<div role="tab">Tab</div>'],
    ['a switch', '<div role="switch">on</div>'],
    ['a checkbox', '<input type="checkbox" />'],
    ['a select', '<select><option>a</option></select>'],
  ])('fires for %s', (_label, html) => {
    expect(shouldHapticOnClick(mount(html))).toBe(true)
  })

  it('does NOT fire for plain text or layout', () => {
    expect(shouldHapticOnClick(mount('<p>just words</p>'))).toBe(false)
    expect(shouldHapticOnClick(mount('<div class="card">panel</div>'))).toBe(false)
  })

  it('does NOT fire for an anchor with no href', () => {
    // <a> without href is not a link, it is a styling hook.
    expect(shouldHapticOnClick(mount('<a>not a link</a>'))).toBe(false)
  })

  it('ignores a disabled button', () => {
    const el = mount('<button disabled>Nope</button>')
    expect(shouldHapticOnClick(el)).toBe(false)
  })

  it('ignores an aria-disabled control', () => {
    // Hand-rolled buttons only LOOK inert; aria-disabled is all there is.
    // A control that does nothing must not feel like it did something.
    expect(shouldHapticOnClick(mount('<div role="button" aria-disabled="true">x</div>'))).toBe(false)
  })

  it('respects data-no-haptic on the element', () => {
    expect(shouldHapticOnClick(mount('<button data-no-haptic>++</button>'))).toBe(false)
  })

  it('respects data-no-haptic on an ANCESTOR, so a region can opt out at once', () => {
    const el = mount('<div data-no-haptic><button id="b">+</button></div>')
    expect(shouldHapticOnClick(el.querySelector('#b'))).toBe(false)
  })

  it('returns false for a non-Element target', () => {
    expect(shouldHapticOnClick(null)).toBe(false)
    expect(shouldHapticOnClick(document)).toBe(false)
  })
})
