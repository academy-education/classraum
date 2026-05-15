"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Search, 
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Users,
  Calendar,
  Settings,
  DollarSign,
  BookOpen,
  Home,
  BarChart3,
  Bell,
  LogOut
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'

export interface CommandAction {
  id: string
  label: string
  description?: string
  // Widened to accept full SVG props (including strokeWidth) so callers
  // can pass lucide-react icons with their typical decoration props.
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string }>
  category?: string
  keywords?: string[]
  action: () => void
  shortcut?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: CommandAction[]
  placeholder?: string
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  navigation: Home,
  students: Users,
  payments: DollarSign,
  reports: BarChart3,
  settings: Settings,
  general: Command,
  classrooms: BookOpen,
  sessions: Calendar,
  notifications: Bell,
  auth: LogOut
}

export function CommandPalette({ 
  isOpen, 
  onClose, 
  commands, 
  placeholder 
}: CommandPaletteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands

    const searchTerm = query.toLowerCase().trim()
    
    return commands.filter(command => {
      const searchableText = [
        command.label,
        command.description,
        command.category,
        ...(command.keywords || [])
      ].join(' ').toLowerCase()
      
      return searchableText.includes(searchTerm)
    }).sort((a, b) => {
      // Prioritize matches in label over description
      const aLabelMatch = a.label.toLowerCase().includes(searchTerm)
      const bLabelMatch = b.label.toLowerCase().includes(searchTerm)
      
      if (aLabelMatch && !bLabelMatch) return -1
      if (!aLabelMatch && bLabelMatch) return 1
      
      return 0
    })
  }, [commands, query])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {}
    
    filteredCommands.forEach(command => {
      const category = command.category || 'general'
      if (!groups[category]) groups[category] = []
      groups[category].push(command)
    })
    
    return groups
  }, [filteredCommands])

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      // Find the selected command element by data attribute
      const selectedElement = listRef.current.querySelector(`[data-command-index="${selectedIndex}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] ring-1 ring-gray-100 overflow-hidden">
        {/* Search Input — plain native input bypasses the Input primitive's
            ring/border styles so the palette's chrome stays clean (no focus
            border line cutting through the row). */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || String(t('common.typeCommand'))}
            className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="text-[10px] font-medium text-gray-500 bg-white ring-1 ring-gray-200 rounded px-1.5 py-0.5 flex items-center gap-0.5 flex-shrink-0">
            <Command className="w-3 h-3" strokeWidth={2} />K
          </kbd>
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto p-2"
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <EmptyState
              icon={Search}
              title={String(t('common.noResultsFound') || t('common.noResults'))}
              size="sm"
              variant="subtle"
            />
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category} className="mb-1">
                {Object.keys(groupedCommands).length > 1 && (
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
                    {category === 'navigation' ? t('navigation.pages') :
                     category === 'contacts' ? t('navigation.contacts') :
                     category === 'general' ? t('common.general') :
                     category === 'actions' ? t('common.actions') :
                     t(`common.${category}`) || category}
                  </div>
                )}
                {categoryCommands.map((command) => {
                  const globalIndex = filteredCommands.indexOf(command)
                  const Icon = command.icon
                  const isSelected = globalIndex === selectedIndex

                  return (
                    <div
                      key={command.id}
                      data-command-index={globalIndex}
                      className={`px-2 py-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        command.action()
                        onClose()
                      }}
                    >
                      {Icon && (
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-gray-400'}`} strokeWidth={isSelected ? 2 : 1.75} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{command.label}</div>
                        {command.description && (
                          <div className="text-xs text-gray-500 truncate">{command.description}</div>
                        )}
                      </div>
                      {command.shortcut && (
                        <div className="text-[10px] text-gray-400 ml-2 flex items-center gap-0.5">
                          {command.shortcut.split(' + ').map(key => (
                            <kbd key={key} className="px-1.5 py-0.5 bg-gray-50 ring-1 ring-gray-200 rounded text-[10px] font-medium">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                      {isSelected && !command.shortcut && (
                        <span className="text-[10px] text-primary/60 ml-2">↵</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                <span>{t('common.toNavigate')}</span>
              </div>
              <div className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                <span>{t('common.toSelect')}</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white ring-1 ring-gray-200 rounded text-[10px] font-medium">esc</kbd>
                <span>{t('common.toClose')}</span>
              </div>
            </div>
            <div className="text-gray-400">
              {filteredCommands.length} {filteredCommands.length === 1 ? t('common.result') : t('common.results')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}