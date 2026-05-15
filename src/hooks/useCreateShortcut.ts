"use client"

import { useEffect } from 'react'

/**
 * Wires the page's "Create new" trigger to two input sources:
 *
 *   1. The `n` / `N` keyboard shortcut (when not typing in an input)
 *   2. The global `app:create-new` window event dispatched by the
 *      command palette's "Create new" action
 *
 * Pages should pass their existing modal-open callback as `onTrigger`
 * and use `enabled` to gate the shortcut while a modal is already open
 * (or while loading) so the shortcut doesn't stack/conflict.
 */
export function useCreateShortcut({
  onTrigger,
  enabled = true,
}: {
  onTrigger: () => void
  enabled?: boolean
}) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      if (isTyping) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        onTrigger()
      }
    }

    const handleEvent = () => onTrigger()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('app:create-new', handleEvent as EventListener)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('app:create-new', handleEvent as EventListener)
    }
  }, [enabled, onTrigger])
}

/**
 * Helper for the command palette to fire the same trigger that pages
 * listen for. Kept here so consumers don't need to know the event name.
 */
export function dispatchCreateNew() {
  window.dispatchEvent(new CustomEvent('app:create-new'))
}
