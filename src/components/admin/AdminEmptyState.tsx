'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * AdminEmptyState — shared "no rows / no data" block for admin lists.
 *
 *   <AdminEmptyState
 *     icon={Users}
 *     title="No users found"
 *     description="Try adjusting your search or filter criteria."
 *     action={<Button onClick={onClear}>Clear filters</Button>}
 *   />
 *
 * Replaces ~10 hand-rolled `<div className="p-12 text-center">` blocks
 * scattered across admin pages — same icon-in-circle treatment, same
 * vertical rhythm, same muted palette. Use the `compact` variant inside
 * `<td colSpan>` cells where surrounding padding is already wide.
 */

export interface AdminEmptyStateProps {
  icon: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  /** Tighter padding for use inside table cells. Default: false. */
  compact?: boolean
  className?: string
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: AdminEmptyStateProps) {
  return (
    <div className={`text-center ${compact ? 'py-10' : 'py-16'} ${className ?? ''}`}>
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-300" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && (
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
