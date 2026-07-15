"use client"

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders its children into document.body via a portal.
 *
 * Modal overlays use `position: fixed` to cover the whole viewport, but a
 * `fixed` element resolves against the nearest ancestor that has a
 * `transform` / `filter` / `will-change` instead of the viewport. Study
 * pages wrap content in transformed containers (page-transition fade-up,
 * pull-to-refresh translate), which would otherwise clip a modal to the
 * content area. Portaling to <body> escapes those containing blocks so
 * every modal covers the identical full screen.
 *
 * Mount-guarded so it's a no-op during SSR (document is undefined).
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
