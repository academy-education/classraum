"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { X, Command, Keyboard } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { formatShortcut, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
  shortcuts?: KeyboardShortcut[]
}

// Default global shortcuts factory
const createGlobalShortcuts = (t: (key: string) => string): KeyboardShortcut[] => [
  {
    key: 'k',
    ctrlKey: true,
    action: () => {},
    description: t('common.openCommandPalette'),
    category: t('common.generalShortcuts')
  },
  {
    key: '/',
    action: () => {},
    description: t('common.openCommandPalette'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'n',
    ctrlKey: true,
    action: () => {},
    description: t('common.createNewItem'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'f',
    ctrlKey: true,
    action: () => {},
    description: t('common.focusSearch'),
    category: t('common.generalShortcuts')
  },
  {
    key: 's',
    ctrlKey: true,
    action: () => {},
    description: t('common.save'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'z',
    ctrlKey: true,
    action: () => {},
    description: t('common.undo'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'Escape',
    action: () => {},
    description: t('common.closeModal'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'Enter',
    action: () => {},
    description: t('common.confirmSubmit'),
    category: t('common.generalShortcuts')
  },
  {
    key: 'ArrowUp',
    action: () => {},
    description: t('common.navigateUp'),
    category: t('common.navigationShortcuts')
  },
  {
    key: 'ArrowDown',
    action: () => {},
    description: t('common.navigateDown'),
    category: t('common.navigationShortcuts')
  },
  {
    key: 'Tab',
    action: () => {},
    description: t('common.nextField'),
    category: t('common.navigationShortcuts')
  },
  {
    key: 'Tab',
    shiftKey: true,
    action: () => {},
    description: t('common.previousField'),
    category: t('common.navigationShortcuts')
  }
]

export function KeyboardShortcutsHelp({ 
  isOpen, 
  onClose, 
  shortcuts
}: KeyboardShortcutsHelpProps) {
  const { t } = useTranslation()
  
  // Use default shortcuts if none provided
  const displayShortcuts = shortcuts || createGlobalShortcuts(t)

  if (!isOpen) return null

  // Group shortcuts by category
  const groupedShortcuts = displayShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'General'
    if (!groups[category]) groups[category] = []
    groups[category].push(shortcut)
    return groups
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl border border-gray-200 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('common.keyboardShortcuts')}</h2>
              <p className="text-sm text-gray-600">{t('common.speedUpWorkflow')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="p-6 space-y-8">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  {category === 'General' && <Command className="w-4 h-4" />}
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div 
                      key={`${category}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-700 font-medium">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-gray-400 text-xs mx-1">+</span>
                            )}
                            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                              {key === '⌘' ? '⌘' : key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t('common.proTip')}: {t('common.useShortcut')} <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Ctrl + K</kbd> {t('common.or')} <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">/</kbd> {t('common.toOpenCommandPalette')}
            </div>
            <Button onClick={onClose} size="sm">
              {t('common.gotIt')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}