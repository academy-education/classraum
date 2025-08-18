"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Hash,
  FileText,
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

export interface CommandAction {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<any>
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

const categoryIcons: Record<string, React.ComponentType<any>> = {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder || t('common.typeCommand')}
            className="flex-1 border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-lg"
          />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘</kbd>
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">K</kbd>
          </div>
        </div>

        {/* Commands List */}
        <div 
          ref={listRef}
          className="max-h-96 overflow-y-auto py-2"
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>{t('common.noResultsFound') || t('common.noResults')}</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category} className="mb-2">
                {Object.keys(groupedCommands).length > 1 && (
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    {categoryIcons[category] && (
                      React.createElement(categoryIcons[category], { className: "w-3 h-3" })
                    )}
                    {category === 'navigation' ? t('navigation.pages') : 
                     category === 'general' ? t('common.general') : 
                     category === 'actions' ? t('common.actions') : 
                     t(`common.${category}`) || category}
                  </div>
                )}
                {categoryCommands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command)
                  const Icon = command.icon
                  
                  return (
                    <div
                      key={command.id}
                      data-command-index={globalIndex}
                      className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                        globalIndex === selectedIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      }`}
                      onClick={() => {
                        command.action()
                        onClose()
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {Icon && <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900">{command.label}</div>
                          {command.description && (
                            <div className="text-sm text-gray-500 truncate">{command.description}</div>
                          )}
                        </div>
                      </div>
                      {command.shortcut && (
                        <div className="text-xs text-gray-400 ml-2">
                          {command.shortcut.split(' + ').map(key => (
                            <kbd key={key} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs mr-1">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
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
                <kbd className="px-1 py-0.5 bg-gray-200 rounded">esc</kbd>
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