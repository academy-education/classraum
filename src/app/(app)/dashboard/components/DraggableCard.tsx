"use client"

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraggableCardProps {
  id: string
  children: React.ReactNode
  isEditMode: boolean
}

export const DraggableCard = React.memo(function DraggableCard({
  id,
  children,
  isEditMode
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isSorting
  } = useSortable({
    id,
    disabled: !isEditMode
  })

  // When not in edit mode, render without drag functionality
  if (!isEditMode) {
    return <div className="h-full">{children}</div>
  }

  // Use Translate to prevent scale issues, no transition when actively dragging
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : (transition || 'transform 150ms ease'),
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 999 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative h-full rounded-lg cursor-grab active:cursor-grabbing select-none",
        "ring-2 ring-primary/20 ring-offset-2",
        isDragging && "shadow-2xl ring-primary/50"
      )}
    >
      {/* Drag Handle Indicator */}
      <div className="absolute -top-2 -left-2 z-10 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm pointer-events-none">
        <GripVertical className="w-4 h-4 text-gray-500" />
      </div>

      {/* Card Content */}
      <div className="h-full pointer-events-none">{children}</div>
    </div>
  )
})

DraggableCard.displayName = 'DraggableCard'
