"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-4 ${className}`}>
      <Icon className="w-10 h-10 text-gray-400 mx-auto mb-1" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-primary text-white">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}