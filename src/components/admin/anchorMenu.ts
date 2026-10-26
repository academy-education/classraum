/**
 * Where to put a row-action menu that is `position: fixed` (so it escapes
 * the table's overflow container) next to the button that opened it.
 *
 * The four list pages used `top: rect.bottom + 8` unconditionally. On a
 * phone the kebab of any row in the lower part of the screen therefore
 * opened its menu below the fold — and a fixed element below the viewport
 * cannot be scrolled into view — or under the bottom tab bar. Now the menu
 * opens upward when there is not room for it below and there is more room
 * above, and it never sits closer than 8px to either side.
 */
import type { CSSProperties } from 'react';

export interface MenuAnchor {
  top?: number;
  bottom?: number;
  right: number;
  maxHeight: number;
}

/** Roughly the tallest row menu (five 40px items plus padding). */
const ROOM_NEEDED = 240;
const GAP = 8;

export function anchorMenu(
  rect: { top: number; bottom: number; right: number },
  viewport: { width: number; height: number } = { width: window.innerWidth, height: window.innerHeight },
): MenuAnchor {
  const right = Math.max(GAP, viewport.width - rect.right);
  const below = viewport.height - rect.bottom - GAP * 2;
  const above = rect.top - GAP * 2;
  if (below < ROOM_NEEDED && above > below) {
    return { bottom: viewport.height - rect.top + GAP, right, maxHeight: Math.max(above, 120) };
  }
  return { top: rect.bottom + GAP, right, maxHeight: Math.max(below, 120) };
}

export function anchorStyle(a: MenuAnchor): CSSProperties {
  return {
    top: a.top !== undefined ? `${a.top}px` : undefined,
    bottom: a.bottom !== undefined ? `${a.bottom}px` : undefined,
    right: `${a.right}px`,
    maxHeight: `${a.maxHeight}px`,
    overflowY: 'auto',
  };
}
