/**
 * Should a click on this element press back?
 *
 * WHY DELEGATION, AND WHY THIS FILE EXISTS.
 *
 * Haptics were first added to the shared <Button> component, on the
 * reasoning that one place beats hundreds of call sites. That reasoning
 * was right and the placement was wrong: study mode contains 185 raw
 * `<button className="…">` elements and imports the shared Button in
 * ZERO files. The change covered auth, the dashboard and dialogs — and
 * none of the surface the request was actually about. It was verified on
 * a single auth button and generalised from there.
 *
 * Editing 185 handlers is the same decision made 185 times and drifts on
 * the first one missed — and it would still miss the 186th. So the app
 * listens ONCE at the document and decides here, which also covers every
 * button written from now on without anyone remembering to.
 *
 * This predicate is a pure function so it can be tested without a
 * browser: whether a given node should buzz is the part that can be
 * quietly wrong, and a screenshot would never show it.
 */

/** Elements that are interactive by nature. */
const INTERACTIVE = 'button, [role="button"], a[href], summary, [role="tab"], [role="switch"], [role="menuitem"], [role="option"], label[for], input[type="checkbox"], input[type="radio"], select'

/**
 * Opt OUT with `data-no-haptic` on the element or any ancestor.
 *
 * Ancestors count so a whole region (a stepper, a seek bar, a canvas of
 * repeat-fire controls) can be silenced in one place — a buzz per repeat
 * reads as a fault rather than as feedback.
 */
const OPT_OUT = '[data-no-haptic]'

/**
 * Walks up from the event target to find the interactive element that was
 * actually pressed, then decides.
 *
 * Returns false for anything disabled: `disabled` is honoured for real
 * form controls and `aria-disabled` for the many hand-rolled buttons that
 * only LOOK inert. A control that does nothing must not feel like it did
 * something.
 */
export function shouldHapticOnClick(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false

  const el = target.closest(INTERACTIVE)
  if (!el) return false

  if (el.closest(OPT_OUT)) return false

  // Real disabled state (button/input/select) …
  if ('disabled' in el && (el as { disabled?: boolean }).disabled === true) return false
  // … and the ARIA kind, which is all a styled <div role="button"> has.
  if (el.getAttribute('aria-disabled') === 'true') return false

  return true
}
