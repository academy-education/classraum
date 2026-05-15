"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CommandPalette, CommandAction } from '@/components/ui/common/CommandPalette'
import { dispatchCreateNew } from '@/hooks/useCreateShortcut'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Home,
  School,
  Calendar,
  ClipboardList,
  UserCheck,
  Megaphone,
  Bell,
  MessageSquare,
  FileQuestion,
  BarChart,
  CreditCard,
  GraduationCap,
  Home as FamilyIcon,
  UserPlus,
  BookOpen,
  Archive,
  Settings,
  Search,
  Plus,
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

  // Global navigation commands — kept in lockstep with the sidebar nav so
  // ⌘K + the sidebar surface the same set of destinations in the same order.
  const navigationCommands: CommandAction[] = [
    {
      id: 'nav-dashboard',
      label: String(t('navigation.dashboard')),
      description: String(t('eyebrows.dashboard')),
      icon: Home,
      category: 'navigation',
      action: () => router.push('/dashboard'),
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'nav-classrooms',
      label: String(t('navigation.classrooms')),
      description: String(t('eyebrows.classrooms')),
      icon: School,
      category: 'navigation',
      action: () => router.push('/classrooms'),
      keywords: ['classes', 'rooms'],
    },
    {
      id: 'nav-sessions',
      label: String(t('navigation.sessions')),
      description: String(t('eyebrows.sessions')),
      icon: Calendar,
      category: 'navigation',
      action: () => router.push('/sessions'),
      keywords: ['lessons', 'schedule'],
    },
    {
      id: 'nav-assignments',
      label: String(t('navigation.assignments')),
      description: String(t('eyebrows.assignments')),
      icon: ClipboardList,
      category: 'navigation',
      action: () => router.push('/assignments'),
      keywords: ['homework', 'tasks'],
    },
    {
      id: 'nav-attendance',
      label: String(t('navigation.attendance')),
      description: String(t('eyebrows.attendance')),
      icon: UserCheck,
      category: 'navigation',
      action: () => router.push('/attendance'),
      keywords: ['present', 'absent'],
    },
    {
      id: 'nav-announcements',
      label: String(t('navigation.announcements')),
      description: String(t('eyebrows.announcements')),
      icon: Megaphone,
      category: 'navigation',
      action: () => router.push('/announcements'),
      keywords: ['notice', 'broadcast'],
    },
    {
      id: 'nav-notifications',
      label: String(t('navigation.notifications')),
      description: String(t('eyebrows.notifications')),
      icon: Bell,
      category: 'navigation',
      action: () => router.push('/notifications'),
      keywords: ['alerts', 'inbox'],
    },
    {
      id: 'nav-messages',
      label: String(t('navigation.messages')),
      description: String(t('eyebrows.messages')),
      icon: MessageSquare,
      category: 'navigation',
      action: () => router.push('/messages'),
      keywords: ['chat', 'dm', 'inbox'],
    },
    {
      id: 'nav-level-tests',
      label: String(t('navigation.levelTests')),
      description: String(t('eyebrows.levelTests')),
      icon: FileQuestion,
      category: 'navigation',
      action: () => router.push('/exams-and-scores'),
      keywords: ['exams', 'scores', 'tests', '시험', '결과'],
    },
    {
      id: 'nav-reports',
      label: String(t('navigation.reports')),
      description: String(t('eyebrows.reports')),
      icon: BarChart,
      category: 'navigation',
      action: () => router.push('/reports'),
      keywords: ['analytics', 'statistics'],
    },
    {
      id: 'nav-payments',
      label: String(t('navigation.payments')),
      description: String(t('eyebrows.payments')),
      icon: CreditCard,
      category: 'navigation',
      action: () => router.push('/payments'),
      keywords: ['billing', 'money', 'fees', 'invoices'],
    },
    {
      id: 'nav-teachers',
      label: String(t('navigation.teachers')),
      description: String(t('eyebrows.teachers')),
      icon: GraduationCap,
      category: 'contacts',
      action: () => router.push('/teachers'),
      keywords: ['staff', 'instructors'],
    },
    {
      id: 'nav-families',
      label: String(t('navigation.families')),
      description: String(t('eyebrows.families')),
      icon: FamilyIcon,
      category: 'contacts',
      action: () => router.push('/families'),
      keywords: ['family', 'household'],
    },
    {
      id: 'nav-parents',
      label: String(t('navigation.parents')),
      description: String(t('eyebrows.parents')),
      icon: UserPlus,
      category: 'contacts',
      action: () => router.push('/parents'),
      keywords: ['guardian', 'parents'],
    },
    {
      id: 'nav-students',
      label: String(t('navigation.students')),
      description: String(t('eyebrows.students')),
      icon: BookOpen,
      category: 'contacts',
      action: () => router.push('/students'),
      keywords: ['learners', 'pupils'],
    },
    {
      id: 'nav-archive',
      label: String(t('navigation.archive')),
      description: String(t('eyebrows.archive')),
      icon: Archive,
      category: 'navigation',
      action: () => router.push('/archive'),
      keywords: ['archived', 'deleted'],
    },
    {
      id: 'nav-settings',
      label: String(t('navigation.settings')),
      description: String(t('eyebrows.settings')),
      icon: Settings,
      category: 'navigation',
      action: () => router.push('/settings'),
      keywords: ['preferences', 'config', 'account'],
    },
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
        // Pages register the `app:create-new` listener via useCreateShortcut().
        // If the current page supports "create new", its existing modal opens.
        // If not, this is a no-op (better than navigating away unexpectedly).
        dispatchCreateNew()
      },
      shortcut: 'N',
      keywords: ['add', 'create', 'new']
    }
  ]

  // Combine all commands
  const allCommands = [
    ...navigationCommands,
    ...actionCommands,
    ...customCommands
  ]

  // Command palette shortcuts are currently disabled.
  // The provider stays mounted so any pages still calling `useCommandPalette()`
  // (e.g. usePageShortcuts) won't error, but ⌘K / Ctrl+K / `/` are no-ops and
  // the palette UI never opens automatically. Re-enable by restoring the
  // useKeyboardShortcuts({ shortcuts: [...] }) block here. The `open` /
  // `toggle` actions are still exported on the context so any leftover
  // consumer code keeps compiling, but nothing wires them globally.

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