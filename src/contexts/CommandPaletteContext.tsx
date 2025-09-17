"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CommandPalette, CommandAction } from '@/components/ui/common/CommandPalette'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useTranslation } from '@/hooks/useTranslation'
import { 
  Home,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  BookOpen,
  Calendar,
  FileText,
  Search,
  Plus,
  Download,
  Upload
} from 'lucide-react'

interface CommandPaletteContextType {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  addCommands: (commands: CommandAction[]) => void
  removeCommands: (commandIds: string[]) => void
}

const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

interface CommandPaletteProviderProps {
  children: React.ReactNode
}

export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customCommands, setCustomCommands] = useState<CommandAction[]>([])
  const router = useRouter()
  const { t } = useTranslation()

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  const addCommands = useCallback((commands: CommandAction[]) => {
    setCustomCommands(prev => [...prev, ...commands])
  }, [])

  const removeCommands = useCallback((commandIds: string[]) => {
    setCustomCommands(prev => prev.filter(cmd => !commandIds.includes(cmd.id)))
  }, [])

  // Global navigation commands
  const navigationCommands: CommandAction[] = [
    {
      id: 'nav-dashboard',
      label: String(t('navigation.dashboard')),
      description: `${String(t('common.goTo'))} ${String(t('navigation.dashboard')).toLowerCase()}`,
      icon: Home,
      category: 'navigation',
      action: () => router.push('/dashboard'),
      keywords: ['home', 'main']
    },
    {
      id: 'nav-students',
      label: String(t('navigation.students')),
      description: `${String(t('common.manage'))} ${String(t('navigation.students')).toLowerCase()}`,
      icon: Users,
      category: 'navigation',
      action: () => router.push('/students'),
      keywords: ['learners', 'pupils']
    },
    {
      id: 'nav-classrooms',
      label: String(t('navigation.classrooms')),
      description: `${String(t('common.manage'))} ${String(t('navigation.classrooms')).toLowerCase()}`,
      icon: BookOpen,
      category: 'navigation',
      action: () => router.push('/classrooms'),
      keywords: ['classes', 'rooms']
    },
    {
      id: 'nav-sessions',
      label: String(t('navigation.sessions')),
      description: `${String(t('common.view'))} ${String(t('navigation.sessions')).toLowerCase()}`,
      icon: Calendar,
      category: 'navigation',
      action: () => router.push('/sessions'),
      keywords: ['lessons', 'classes']
    },
    {
      id: 'nav-assignments',
      label: String(t('navigation.assignments')),
      description: `${String(t('common.manage'))} ${String(t('navigation.assignments')).toLowerCase()}`,
      icon: FileText,
      category: 'navigation',
      action: () => router.push('/assignments'),
      keywords: ['homework', 'tasks']
    },
    {
      id: 'nav-payments',
      label: String(t('navigation.payments')),
      description: `${String(t('common.manage'))} ${String(t('navigation.payments')).toLowerCase()}`,
      icon: DollarSign,
      category: 'navigation',
      action: () => router.push('/payments'),
      keywords: ['billing', 'money', 'fees']
    },
    {
      id: 'nav-reports',
      label: String(t('navigation.reports')),
      description: `${String(t('common.view'))} ${String(t('navigation.reports')).toLowerCase()}`,
      icon: BarChart3,
      category: 'navigation',
      action: () => router.push('/reports'),
      keywords: ['analytics', 'statistics']
    },
    {
      id: 'nav-settings',
      label: String(t('navigation.settings')),
      description: String(t('navigation.settings')),
      icon: Settings,
      category: 'navigation',
      action: () => router.push('/settings'),
      keywords: ['preferences', 'config']
    }
  ]

  // General action commands
  const actionCommands: CommandAction[] = [
    {
      id: 'action-search',
      label: String(t('common.search')),
      description: String(t('common.searchApplication')),
      icon: Search,
      category: 'general',
      action: () => {
        // Focus search input if available
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      shortcut: 'Ctrl + F',
      keywords: ['find', 'lookup']
    },
    {
      id: 'action-new',
      label: String(t('common.createNew')),
      description: String(t('common.createNewItem')),
      icon: Plus,
      category: 'general',
      action: () => {
        // Context-aware creation based on current page
        const path = window.location.pathname
        if (path.includes('/students')) router.push('/students?new=true')
        else if (path.includes('/classrooms')) router.push('/classrooms?new=true')
        else if (path.includes('/payments')) router.push('/payments?new=true')
        else router.push('/dashboard')
      },
      shortcut: 'Ctrl + N',
      keywords: ['add', 'create']
    }
  ]

  // Theme and utility commands
  const utilityCommands: CommandAction[] = [
    {
      id: 'utility-export',
      label: String(t('common.exportData')),
      description: String(t('common.exportData')),
      icon: Download,
      category: 'general',
      action: () => {
        // Trigger export on current page
        const exportBtn = document.querySelector('[data-export-btn], button:has([data-lucide="download"])')
        if (exportBtn instanceof HTMLElement) {
          exportBtn.click()
        }
      },
      keywords: ['download', 'save']
    },
    {
      id: 'utility-import',
      label: String(t('common.importData')),
      description: String(t('common.importData')),
      icon: Upload,
      category: 'general',
      action: () => {
        // Trigger import on current page
        const importBtn = document.querySelector('[data-import-btn], button:has([data-lucide="upload"])')
        if (importBtn instanceof HTMLElement) {
          importBtn.click()
        }
      },
      keywords: ['upload', 'load']
    }
  ]

  // Combine all commands
  const allCommands = [
    ...navigationCommands,
    ...actionCommands,
    ...utilityCommands,
    ...customCommands
  ]

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrlKey: true,
        action: toggle,
        description: String(t('common.openCommandPalette'))
      },
      {
        key: 'k',
        metaKey: true,
        action: toggle,
        description: String(t('common.openCommandPalette'))
      },
      {
        key: '/',
        action: () => {
          // Only open if not typing in an input
          const activeElement = document.activeElement
          if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
            open()
          }
        },
        description: String(t('common.openCommandPalette'))
      }
    ]
  })

  return (
    <CommandPaletteContext.Provider 
      value={{ 
        isOpen, 
        open, 
        close, 
        toggle, 
        addCommands, 
        removeCommands 
      }}
    >
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        commands={allCommands}
        placeholder={String(t('common.typeCommand'))}
      />
    </CommandPaletteContext.Provider>
  )
}