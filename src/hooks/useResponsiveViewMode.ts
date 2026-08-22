'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

/**
 * Below-`md` detection, matching Tailwind's `md` breakpoint (768px).
 *
 * `md:` in Tailwind means `min-width: 768px`, so "narrow" is strictly
 * `max-width: 767.98px`. The .98 matters: at exactly 768 a
 * `max-width: 768px` query and `md:` would BOTH match and the card view
 * would fight the table it is supposed to hand over to.
 *
 * useSyncExternalStore rather than useState+useEffect because this value
 * decides what gets rendered. With an effect the server snapshot (false)
 * paints a desktop table on a phone for one frame before flipping — a
 * visible layout jump on exactly the screens this exists to fix. The
 * server snapshot is still `false` (SSR has no viewport, and the desktop
 * table is the safe thing to stream), but the subscribe/getSnapshot pair
 * makes React re-render during hydration rather than after paint.
 */
const NARROW_QUERY = '(max-width: 767.98px)'

/** Below Tailwind's `lg` (1024px) — where the sidebar is replaced by the
 *  bottom navigation bar (see src/app/(app)/layout.tsx `sidebarVisible`). */
const BELOW_LG_QUERY = '(max-width: 1023.98px)'

function getServerSnapshot(): boolean {
  return false
}

/** Generic media-query match, SSR-safe. */
export function useMediaQuery(query: string): boolean {
  // subscribe/getSnapshot are memoised on `query` because
  // useSyncExternalStore resubscribes whenever the subscribe identity
  // changes — an inline closure here would tear down and re-add a
  // listener on every render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }, [query])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** True when the viewport is narrower than Tailwind's `md` breakpoint. */
export function useIsNarrowViewport(): boolean {
  return useMediaQuery(NARROW_QUERY)
}

/**
 * True when the sidebar is not on screen and navigation is the bottom bar.
 *
 * This is `lg`, not `md`: the layout drops the sidebar at `window.innerWidth
 * < 1024` and `DashboardBottomNavigation` is `lg:hidden`. Copy that points at
 * "the left panel" is wrong for this whole range, not just on phones.
 */
export function useIsBottomNavLayout(): boolean {
  return useMediaQuery(BELOW_LG_QUERY)
}

/**
 * A list page's view mode, defaulting to `narrowDefault` on phones and
 * `wideDefault` everywhere else — until the user picks one, after which
 * their choice wins at every width.
 *
 * The default is DERIVED, not written into state on mount. An effect that
 * calls setViewMode('card') once would be sticky in the wrong direction:
 * rotate to landscape or open the same page on a tablet and you would
 * still be looking at cards, because nothing ever set it back. Deriving
 * it means the breakpoint keeps controlling the default and only an
 * explicit user click takes it over.
 */
export function useResponsiveViewMode<T extends string>(
  wideDefault: T,
  narrowDefault: T,
): [T, (next: T) => void] {
  const isNarrow = useIsNarrowViewport()
  const [override, setOverride] = useState<T | null>(null)
  const viewMode = override ?? (isNarrow ? narrowDefault : wideDefault)
  const setViewMode = useCallback((next: T) => setOverride(next), [])
  return [viewMode, setViewMode]
}
