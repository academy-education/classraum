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

export const paymentsPageShortcuts = {
  shortcuts: [
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        const newBtn = document.querySelector('[data-new-payment]') as HTMLElement
        newBtn?.click()
      },
      description: 'Add new payment',
      category: 'Payments'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => {
        const plansBtn = document.querySelector('[data-payment-plans]') as HTMLElement
        plansBtn?.click()
      },
      description: 'View payment plans',
      category: 'Payments'
    }
  ] as KeyboardShortcut[],
  
  commands: [
    {
      id: 'payments-add',
      label: 'Add Payment',
      description: 'Create a new payment',
      category: 'payments',
      action: () => {
        const newBtn = document.querySelector('[data-new-payment]') as HTMLElement
        newBtn?.click()
      },
      shortcut: 'Ctrl + N'
    },
    {
      id: 'payments-plans',
      label: 'Payment Plans',
      description: 'View payment plans',
      category: 'payments',
      action: () => {
        const plansBtn = document.querySelector('[data-payment-plans]') as HTMLElement
        plansBtn?.click()
      },
      shortcut: 'Ctrl + P'
    }
  ] as CommandAction[]
}

export const classroomsPageShortcuts = {
  shortcuts: [
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        const newBtn = document.querySelector('[data-new-classroom]') as HTMLElement
        newBtn?.click()
      },
      description: 'Add new classroom',
      category: 'Classrooms'
    }
  ] as KeyboardShortcut[],
  
  commands: [
    {
      id: 'classrooms-add',
      label: 'Add Classroom',
      description: 'Create a new classroom',
      category: 'classrooms',
      action: () => {
        const newBtn = document.querySelector('[data-new-classroom]') as HTMLElement
        newBtn?.click()
      },
      shortcut: 'Ctrl + N'
    }
  ] as CommandAction[]
}

export const reportsPageShortcuts = {
  shortcuts: [
    {
      key: 'r',
      ctrlKey: true,
      action: () => {
        const refreshBtn = document.querySelector('[data-refresh]') as HTMLElement
        refreshBtn?.click()
      },
      description: 'Refresh reports',
      category: 'Reports'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => {
        const exportBtn = document.querySelector('[data-export-report]') as HTMLElement
        exportBtn?.click()
      },
      description: 'Export report',
      category: 'Reports'
    }
  ] as KeyboardShortcut[],
  
  commands: [
    {
      id: 'reports-refresh',
      label: 'Refresh Reports',
      description: 'Refresh report data',
      category: 'reports',
      action: () => {
        const refreshBtn = document.querySelector('[data-refresh]') as HTMLElement
        refreshBtn?.click()
      },
      shortcut: 'Ctrl + R'
    },
    {
      id: 'reports-export',
      label: 'Export Report',
      description: 'Export current report',
      category: 'reports',
      action: () => {
        const exportBtn = document.querySelector('[data-export-report]') as HTMLElement
        exportBtn?.click()
      },
      shortcut: 'Ctrl + E'
    }
  ] as CommandAction[]
}