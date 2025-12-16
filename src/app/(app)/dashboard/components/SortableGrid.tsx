"use client"

import React from 'react'

interface SortableGridProps {
  children: React.ReactNode
  className?: string
}

// Simple grid container - SortableContext is now handled at the page level
export const SortableGrid = React.memo(function SortableGrid({
  children,
  className
}: SortableGridProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
})

SortableGrid.displayName = 'SortableGrid'
