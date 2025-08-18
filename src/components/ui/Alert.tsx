"use client"

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success:
          "border-green-500/50 text-green-700 bg-green-50 dark:border-green-500 dark:text-green-400 dark:bg-green-950 [&>svg]:text-green-700 dark:[&>svg]:text-green-400",
        warning:
          "border-yellow-500/50 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-950 [&>svg]:text-yellow-700 dark:[&>svg]:text-yellow-400",
        info:
          "border-blue-500/50 text-blue-700 bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  dismissible?: boolean
  onDismiss?: () => void
  icon?: React.ReactNode
  showDefaultIcon?: boolean
}

const defaultIcons = {
  default: <Info className="h-4 w-4" />,
  destructive: <XCircle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant = "default", 
    dismissible = false,
    onDismiss,
    icon,
    showDefaultIcon = true,
    children,
    ...props 
  }, ref) => {
    const displayIcon = icon || (showDefaultIcon ? defaultIcons[variant || "default"] : null)

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {displayIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {displayIcon}
            </div>
          )}
          <div className="flex-1">
            {children}
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }