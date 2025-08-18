"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface BulkAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface BulkActionBarProps {
  selectedCount: number
  actions: BulkAction[]
  onClearSelection: () => void
  countLabel?: string
  className?: string
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClearSelection,
  countLabel = 'items selected',
  className = ''
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          {selectedCount} {countLabel}
        </span>
        <div className="flex gap-2">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                size="sm"
                variant={action.variant === 'destructive' ? 'outline' : 'outline'}
                onClick={action.onClick}
                disabled={action.disabled}
                className={
                  action.variant === 'destructive'
                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                    : ''
                }
              >
                <Icon className="w-4 h-4 mr-1" />
                {action.label}
              </Button>
            )
          })}
          <Button
            size="sm"
            variant="outline"
            onClick={onClearSelection}
          >
            Clear Selection
          </Button>
        </div>
      </div>
    </div>
  )
}