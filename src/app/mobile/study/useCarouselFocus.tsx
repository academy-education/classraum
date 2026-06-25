"use client"

import { useEffect, useState } from 'react'

/**
 * Tracks the most-visible card in a horizontal carousel.
 *
 * Returns the focused index so the parent can render pagination dots
 * (or any other state-driven UI). Also writes data-focused="true" to
 * the DOM node so CSS can transition scale/opacity without a re-render
 * — keeps the magnification glassy-smooth during scroll.
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
): number {
  const [focusedIndex, setFocusedIndex] = useState(0)

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
    setFocusedIndex(0)

    const observer = new IntersectionObserver(
      (entries) => {
        let bestRatio = 0
        let best: Element | null = null
        let bestIndex = 0
        const ratioMap = new Map<Element, number>()
        for (const e of entries) ratioMap.set(e.target, e.intersectionRatio)
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i]
          let r = ratioMap.get(c)
          if (r === undefined) {
            const cr = c.getBoundingClientRect()
            const rr = root.getBoundingClientRect()
            const visW = Math.max(0, Math.min(cr.right, rr.right) - Math.max(cr.left, rr.left))
            r = visW / cr.width
          }
          if (r > bestRatio) { bestRatio = r; best = c; bestIndex = i }
        }
        if (best && bestRatio > 0.55) {
          for (const c of cards) {
            if (c === best) c.setAttribute('data-focused', 'true')
            else c.removeAttribute('data-focused')
          }
          setFocusedIndex(bestIndex)
        }
      },
      { root, threshold: [0.25, 0.5, 0.75, 1] },
    )
    for (const c of cards) observer.observe(c)
    return () => observer.disconnect()
  }, [scrollRef, itemCount])

  return focusedIndex
}

/** Pagination dots — render below the carousel. Active dot widens
 *  and uses the primary color; inactive dots stay small and gray.
 *  Tappable: clicking a dot scrolls that card into view. */
export function CarouselDots({
  count,
  activeIndex,
  onSelect,
}: {
  count: number
  activeIndex: number
  onSelect?: (index: number) => void
}) {
  if (count <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 mt-3">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect?.(i)}
            aria-label={`Go to card ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
              active
                ? 'w-6 bg-primary shadow-[0_0_8px_rgba(40,133,232,0.35)]'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            }`}
          />
        )
      })}
    </div>
  )
}

/** Helper: scroll the carousel so the given card index is the
 *  centered/focused one. Used by tapping a pagination dot. */
export function scrollToCarouselIndex(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  index: number,
) {
  const root = scrollRef.current
  if (!root) return
  const cards = root.querySelectorAll<HTMLElement>('[data-carousel-card]')
  const card = cards[index]
  if (!card) return
  // Center the card in the scroll viewport.
  const cardCenter = card.offsetLeft + card.offsetWidth / 2
  const target = cardCenter - root.clientWidth / 2
  root.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
}
