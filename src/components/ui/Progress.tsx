"use client"

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressVariants = cva(
  "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
  {
    variants: {
      size: {
        sm: "h-2",
        md: "h-4",
        lg: "h-6",
      }
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const progressBarVariants = cva(
  "h-full w-full flex-1 bg-primary transition-all",
  {
    variants: {
      variant: {
        default: "bg-primary",
        success: "bg-green-500",
        warning: "bg-yellow-500", 
        danger: "bg-red-500",
        info: "bg-blue-500",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants>,
    VariantProps<typeof progressBarVariants> {
  value?: number
  max?: number
  showLabel?: boolean
  label?: string
  animated?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100,
    size,
    variant,
    showLabel = false,
    label,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    return (
      <div className="w-full">
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">
              {label || `${Math.round(percentage)}%`}
            </span>
            {showLabel && !label && (
              <span className="text-sm text-muted-foreground">
                {value}/{max}
              </span>
            )}
          </div>
        )}
        <div
          ref={ref}
          className={cn(progressVariants({ size }), className)}
          {...props}
        >
          <div
            className={cn(
              progressBarVariants({ variant }),
              animated && "animate-pulse"
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

// Circular Progress Component
interface CircularProgressProps {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  showLabel?: boolean
  label?: string
}

const CircularProgress = React.memo<CircularProgressProps>(({
  value = 0,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className = "",
  variant = 'default',
  showLabel = false,
  label
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const variantColors = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
          opacity={0.2}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("transition-all duration-300", variantColors[variant])}
        />
      </svg>
      {(showLabel || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"

export { Progress, CircularProgress }