"use client"

import { useEffect } from 'react'

/**
 * Tracks the most-visible card in a horizontal carousel and applies
 * data-focused="true" to it. CSS in globals.css picks this up and
 * scales the focused card to full size while shrinking + fading the
 * others.
 *
 * Uses IntersectionObserver scoped to the scroll container so cards
 * outside the viewport don't fire. Threshold step makes the focus
 * follow the user's drag smoothly — at 50% visible the card claims
 * focus, so the magnification crossfade happens mid-scroll rather
 * than at snap-end.
 */
export function useCarouselFocus(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  itemCount: number,
) {
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-carousel-card]'))
    if (cards.length === 0) return

    // Default the FIRST card to focused so first paint isn't a sea of
    // dimmed cards waiting for the user to scroll.
    cards.forEach((c, i) => {
      if (i === 0) c.setAttribute('data-focused', 'true')
      else c.removeAttribute('data-focused')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0
        let best: Element | null = null
        // Each callback only reports the cards that changed visibility,
        // so we have to consult ALL cards' current ratios. Re-walk the
        // DOM list and compare against the entry ratios we just got.
        const ratioMap = new Map<Element, number>()
        for (const e of entries) ratioMap.set(e.target, e.intersectionRatio)
        for (const c of cards) {
          // If entry didn't include this card, fall back to current
          // bounding-rect-based visibility check vs the scroll root.
          let r = ratioMap.get(c)
          if (r === undefined) {
            const cr = c.getBoundingClientRect()
            const rr = root.getBoundingClientRect()
            const visW = Math.max(0, Math.min(cr.right, rr.right) - Math.max(cr.left, rr.left))
            r = visW / cr.width
          }
          if (r > bestRatio) { bestRatio = r; best = c }
        }
        if (best && bestRatio > 0.55) {
          for (const c of cards) {
            if (c === best) c.setAttribute('data-focused', 'true')
            else c.removeAttribute('data-focused')
          }
        }
      },
      { root, threshold: [0.25, 0.5, 0.75, 1] },
    )
    for (const c of cards) observer.observe(c)
    return () => observer.disconnect()
  }, [scrollRef, itemCount])
}
