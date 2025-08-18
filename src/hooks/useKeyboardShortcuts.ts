"use client"

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category?: string
  disabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef<KeyboardShortcut[]>([])
  
  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.getAttribute('role') === 'textbox'
    ) {
      return
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (shortcut.disabled) return false
      
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.metaKey === event.metaKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return {
    shortcuts: shortcutsRef.current
  }
}

// Utility function to format keyboard shortcuts for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []
  
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.metaKey) parts.push('⌘')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  
  parts.push(shortcut.key.toUpperCase())
  
  return parts.join(' + ')
}

// Common keyboard shortcuts
export const commonShortcuts = {
  save: { key: 's', ctrlKey: true, description: 'Save' },
  undo: { key: 'z', ctrlKey: true, description: 'Undo' },
  redo: { key: 'y', ctrlKey: true, description: 'Redo' },
  copy: { key: 'c', ctrlKey: true, description: 'Copy' },
  paste: { key: 'v', ctrlKey: true, description: 'Paste' },
  selectAll: { key: 'a', ctrlKey: true, description: 'Select All' },
  find: { key: 'f', ctrlKey: true, description: 'Find' },
  newItem: { key: 'n', ctrlKey: true, description: 'New Item' },
  delete: { key: 'Delete', description: 'Delete' },
  escape: { key: 'Escape', description: 'Close/Cancel' },
  enter: { key: 'Enter', description: 'Confirm/Submit' },
}