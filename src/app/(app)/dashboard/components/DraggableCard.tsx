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
    isDragging
  } = useSortable({ id, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group h-full",
        isDragging && "opacity-50",
        isEditMode && "ring-2 ring-primary/20 ring-offset-2 rounded-lg"
      )}
    >
      {/* Drag Handle - Only visible in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -top-2 -left-2 z-10 p-1.5 rounded-lg",
            "bg-white border border-gray-200 shadow-sm",
            "cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-gray-50 hover:border-primary/50",
            isDragging && "opacity-100"
          )}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      )}

      {/* Card Content */}
      <div className="h-full">
        {children}
      </div>
    </div>
  )
})

DraggableCard.displayName = 'DraggableCard'
