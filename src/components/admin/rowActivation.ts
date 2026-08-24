import type React from 'react'

/**
 * Making an admin table row open its detail view.
 *
 * Every action on /admin/academies and /admin/users hid behind a kebab, and
 * the row carried no affordance at all — `hover:bg-gray-50` reads as "this
 * table has hover styling", not "this row does something". Clicking a row
 * did nothing, which is the one thing a user tries first.
 *
 * ── Why not role="button" on the <tr> ────────────────────────────────────
 * It would announce the affordance, and it would also destroy the row/cell
 * mapping the whole table depends on: a `<tr role="button">` is a button
 * containing seven cells with no row semantics, so a screen-reader user
 * loses the column headers that give the numbers meaning. The keyboard and
 * AT path stays the kebab (which is a real menu button and already works)
 * plus the row's name cell, which the call sites render as a real
 * `<button>`. The row click is a POINTER convenience layered on top, so it
 * takes pointer affordances (cursor, hover) and no ARIA lie.
 *
 * ── Why the guard ────────────────────────────────────────────────────────
 * The row contains a bulk-select checkbox and a kebab. Without a guard,
 * ticking the checkbox or opening the menu would ALSO open the detail
 * modal, i.e. the fix would break the two controls that already worked.
 * Rather than sprinkling stopPropagation() through the cells — which has to
 * be repeated for every control ever added — this asks the DOM whether the
 * click landed on anything interactive.
 */

const INTERACTIVE = 'button, a, input, select, textarea, label, [role="menu"], [role="menuitem"], [role="dialog"]'

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE) !== null
}

/**
 * Props to spread onto a `<tr>` (or the mobile card) to make it open a
 * detail view on click. Merge `className` yourself if the row has its own.
 */
export function rowActivationProps(onOpen: () => void): {
  onClick: (e: React.MouseEvent<HTMLElement>) => void
} {
  return {
    onClick: (e) => {
      if (isInteractiveTarget(e.target)) return
      // A click that ends a text selection is the user copying an email out
      // of the row, not asking for the modal.
      if (typeof window !== 'undefined' && window.getSelection()?.toString()) return
      onOpen()
    },
  }
}
