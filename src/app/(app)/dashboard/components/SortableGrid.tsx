"use client"

import React from 'react'

interface SortableGridProps {
  children: React.ReactNode
  className?: string
}

// Simple grid container - SortableContext is now at the parent level
export const SortableGrid = React.memo(function SortableGrid({
  children,
  className
}: SortableGridProps) {
  return (
    <div className={className} style={{ position: 'relative' }}>
      {children}
    </div>
  )
})

SortableGrid.displayName = 'SortableGrid'
