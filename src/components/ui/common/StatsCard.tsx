"use client"

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'indigo'
  subtitle?: string
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    icon: 'text-green-600'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    icon: 'text-red-600'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    icon: 'text-purple-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    icon: 'text-yellow-600'
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    icon: 'text-indigo-600'
  }
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  subtitle 
}: StatsCardProps) {
  const variant = colorVariants[color]

  return (
    <div className={`${variant.bg} border ${variant.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${variant.text}`}>{title}</p>
          <p className={`text-2xl font-bold ${variant.text}`}>{value}</p>
          {subtitle && (
            <p className={`text-xs ${variant.text} opacity-75 mt-1`}>{subtitle}</p>
          )}
        </div>
        <Icon className={`w-8 h-8 ${variant.icon}`} />
      </div>
    </div>
  )
}