"use client"

import React from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'warning' | 'success' | 'error'
  text: string
  size?: 'sm' | 'md'
  showIcon?: boolean
}

// Soft-tinted semantic palette: subdued background + matching text + 1px ring.
// Modernized from the older "100/800/200" tonal scheme.
const statusVariants = {
  active: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-100',
    icon: CheckCircle,
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-100',
    icon: CheckCircle,
  },
  inactive: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-100',
    icon: XCircle,
  },
  error: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-100',
    icon: XCircle,
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-100',
    icon: Clock,
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-100',
    icon: AlertCircle,
  },
}

const sizeVariants = {
  sm: {
    text: 'text-[11px]',
    padding: 'px-2 py-0.5',
    icon: 'w-3 h-3',
  },
  md: {
    text: 'text-xs',
    padding: 'px-2.5 py-1',
    icon: 'w-3.5 h-3.5',
  },
}

export const StatusBadge = React.memo<StatusBadgeProps>(function StatusBadge({
  status,
  text,
  size = 'sm',
  showIcon = true,
}) {
  const variant = statusVariants[status]
  const sizeVariant = sizeVariants[size]
  const Icon = variant.icon

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full ring-1 font-semibold
      ${variant.bg} ${variant.text} ${variant.ring}
      ${sizeVariant.text} ${sizeVariant.padding}
    `}>
      {showIcon && <Icon className={sizeVariant.icon} strokeWidth={2.5} />}
      {text}
    </span>
  )
})