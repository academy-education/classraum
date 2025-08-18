"use client"

import React from 'react'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'warning' | 'success' | 'error'
  text: string
  size?: 'sm' | 'md'
  showIcon?: boolean
}

const statusVariants = {
  active: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: CheckCircle
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: CheckCircle
  },
  inactive: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: Clock
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: AlertCircle
  }
}

const sizeVariants = {
  sm: {
    text: 'text-xs',
    padding: 'px-2 py-1',
    icon: 'w-3 h-3'
  },
  md: {
    text: 'text-sm',
    padding: 'px-3 py-1',
    icon: 'w-4 h-4'
  }
}

export function StatusBadge({ 
  status, 
  text, 
  size = 'sm',
  showIcon = true 
}: StatusBadgeProps) {
  const variant = statusVariants[status]
  const sizeVariant = sizeVariants[size]
  const Icon = variant.icon

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full border font-medium
      ${variant.bg} ${variant.text} ${variant.border}
      ${sizeVariant.text} ${sizeVariant.padding}
    `}>
      {showIcon && <Icon className={sizeVariant.icon} />}
      {text}
    </span>
  )
}