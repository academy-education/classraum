"use client"

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-6 w-6", 
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary",
        muted: "text-muted-foreground",
        white: "text-white",
        current: "text-current",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

interface SpinnerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string
  centered?: boolean
}

export const Spinner = React.memo<SpinnerProps>(({ 
  className, 
  size, 
  variant, 
  text, 
  centered = false,
  ...props 
}) => {
  const spinnerElement = (
    <div 
      className={cn(spinnerVariants({ size, variant }), className)} 
      role="status"
      aria-label={text || "Loading"}
      {...props}
    />
  )

  if (text) {
    return (
      <div className={cn(
        "flex items-center gap-2",
        centered && "justify-center"
      )}>
        {spinnerElement}
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    )
  }

  if (centered) {
    return (
      <div className="flex justify-center">
        {spinnerElement}
      </div>
    )
  }

  return spinnerElement
})

Spinner.displayName = "Spinner"