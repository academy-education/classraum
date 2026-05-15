"use client"

import { useEffect } from 'react'
import { useCommandPalette } from '@/contexts/CommandPaletteContext'
import { useKeyboardShortcuts, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'
import { CommandAction } from '@/components/ui/common/CommandPalette'

interface UsePageShortcutsOptions {
  shortcuts?: KeyboardShortcut[]
  commands?: CommandAction[]
  enabled?: boolean
}

export function usePageShortcuts({ 
  shortcuts = [], 
  commands = [], 
  enabled = true 
}: UsePageShortcutsOptions) {
  const { addCommands, removeCommands } = useCommandPalette()

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts,
    enabled
  })

  // Add page-specific commands to command palette
  useEffect(() => {
    if (commands.length > 0) {
      addCommands(commands)
      
      // Cleanup: remove commands when component unmounts
      return () => {
        const commandIds = commands.map(cmd => cmd.id)
        removeCommands(commandIds)
      }
    }
  }, [commands, addCommands, removeCommands])
}

// Predefined shortcut sets for common pages
export const studentPageShortcuts = {
  shortcuts: [
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // Open new student modal
        const newBtn = document.querySelector('[data-new-student], button:contains("Add")') as HTMLElement
        newBtn?.click()
      },
      description: 'Add new student',
      category: 'Students'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        // Trigger export
        const exportBtn = document.querySelector('[data-export-btn]') as HTMLElement
        exportBtn?.click()
      },
      description: 'Export students',
      category: 'Students'
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => {
        // Trigger import
        const importBtn = document.querySelector('[data-import-btn]') as HTMLElement
        importBtn?.click()
      },
      description: 'Import students',
      category: 'Students'
    }
  ] as KeyboardShortcut[],
  
  commands: [
    {
      id: 'students-add',
      label: 'Add New Student',
      description: 'Create a new student record',
      category: 'students',
      action: () => {
        const newBtn = document.querySelector('[data-new-student]') as HTMLElement
        newBtn?.click()
      },
      shortcut: 'Ctrl + N'
    },
    {
      id: 'students-export',
      label: 'Export Students',
      description: 'Export student data',
      category: 'students',
      action: () => {
        const exportBtn = document.querySelector('[data-export-btn]') as HTMLElement
        exportBtn?.click()
      },
      shortcut: 'Ctrl + E'
    },
    {
      id: 'students-import',
      label: 'Import Students',
      description: 'Import student data',
      category: 'students',
      action: () => {
        const importBtn = document.querySelector('[data-import-btn]') as HTMLElement
        importBtn?.click()
      },
      shortcut: 'Ctrl + I'
    }
  ] as CommandAction[]
}

// `paymentsPageShortcuts`, `classroomsPageShortcuts`, `reportsPageShortcuts`
// were predefined sets that registered Ctrl+N / Ctrl+P / Ctrl+E / Ctrl+R
// commands into the command palette. They were never imported by their
// respective pages — the only consumer of any predefined set is
// `studentPageShortcuts` (used by StudentsPageOriginalUI).
//
// The `n` shortcut on each of those pages is now wired directly via the
// `useCreateShortcut` hook (no DOM querySelector indirection). The Ctrl+P
// "view payment plans" / Ctrl+E "export" / Ctrl+R "refresh report"
// shortcuts were never wired anywhere visible to the user. Removed to keep
// this file honest about what's actually live.