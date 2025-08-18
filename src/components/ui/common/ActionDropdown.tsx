"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, MoreVertical } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface ActionItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface ActionDropdownProps {
  items: ActionItem[]
  orientation?: 'horizontal' | 'vertical'
  className?: string
  buttonClassName?: string
  dropdownId?: string | null
  onToggle?: (id: string | null) => void
}

export function ActionDropdown({
  items,
  orientation = 'horizontal',
  className = '',
  buttonClassName = '',
  dropdownId,
  onToggle
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const uniqueId = useRef(Math.random().toString(36).substr(2, 9))

  const Icon = orientation === 'horizontal' ? MoreHorizontal : MoreVertical

  useEffect(() => {
    if (dropdownId !== null && dropdownId !== uniqueId.current) {
      setIsOpen(false)
    }
  }, [dropdownId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        onToggle?.(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  const handleToggle = () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    onToggle?.(newIsOpen ? uniqueId.current : null)
  }

  const handleItemClick = (item: ActionItem) => {
    if (item.disabled) return
    item.onClick()
    setIsOpen(false)
    onToggle?.(null)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`p-1 ${buttonClassName}`}
      >
        <Icon className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {items.map((item, index) => {
            const ItemIcon = item.icon
            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`
                  block w-full text-left px-3 py-2 text-sm transition-colors
                  ${item.disabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : item.variant === 'destructive'
                      ? 'text-red-700 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${index === 0 ? 'rounded-t-md' : ''}
                  ${index === items.length - 1 ? 'rounded-b-md' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  {item.label}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}