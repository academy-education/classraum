"use client"

import { useEffect, type RefObject } from 'react'

interface UseListPageShortcutsOptions {
  /** Ref to the search input. `/` focuses it. */
  searchInputRef?: RefObject<HTMLInputElement | null>
  /** Called when the user presses `n` to open the create flow. */
  onCreate?: () => void
  /** When true, `n` is suppressed (e.g. another modal is already open). */
  isCreateBlocked?: boolean
  /** When provided, `Escape` invokes it (typically to clear a selection). */
  onEscape?: () => void
}

/**
 * Standard manager-page keyboard shortcuts:
 *   - `/`     → focus the search input
 *   - `n`/`N` → open the create modal (skipped when isCreateBlocked is true)
 *   - `Esc`   → invoke onEscape if provided (typical use: clear bulk selection)
 *
 * The handler is no-op while the user is typing in any input/textarea/
 * contenteditable, and ignores chords (cmd/ctrl/alt) so it doesn't
 * collide with browser or OS shortcuts.
 *
 * Also bridges the `app:create-new` window event from the command
 * palette so a single `onCreate` handler powers both shortcut and palette.
 */
export function useListPageShortcuts({
  searchInputRef,
  onCreate,
  isCreateBlocked,
  onEscape,
}: UseListPageShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )

      if (e.key === 'Escape') {
        // If the user is typing in an input/textarea, Escape blurs it —
        // matches typical desktop-app feel. Selection-clear via onEscape
        // only fires when no input is focused.
        if (isTyping && target && 'blur' in target && typeof target.blur === 'function') {
          (target as HTMLElement).blur()
          return
        }
        if (onEscape) onEscape()
        return
      }
      if (isTyping) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '/' && searchInputRef?.current) {
        e.preventDefault()
        searchInputRef.current.focus()
        return
      }

      if ((e.key === 'n' || e.key === 'N') && onCreate && !isCreateBlocked) {
        e.preventDefault()
        onCreate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchInputRef, onCreate, isCreateBlocked, onEscape])

  // Bridge the command-palette "Create new" event so callers wire up only
  // once. Palette events should respect the same blocking guard.
  useEffect(() => {
    if (!onCreate) return
    const handleCreateNew = () => {
      if (isCreateBlocked) return
      onCreate()
    }
    window.addEventListener('app:create-new', handleCreateNew)
    return () => window.removeEventListener('app:create-new', handleCreateNew)
  }, [onCreate, isCreateBlocked])
}
