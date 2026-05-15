"use client"

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  "relative w-full rounded-xl p-4 ring-1 ring-gray-100 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.12),0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
  {
    variants: {
      variant: {
        default: "bg-white text-foreground before:bg-gray-300",
        destructive: "bg-white text-gray-900 before:bg-rose-500",
        success: "bg-white text-gray-900 before:bg-emerald-500",
        warning: "bg-white text-gray-900 before:bg-amber-500",
        info: "bg-white text-gray-900 before:bg-sky-500",
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

    // Match the icon-chip background AND icon color to the variant's left rail.
    // Both must come from the same palette so the icon doesn't visually drift
    // from the rail/chip.
    const chipStyles =
      variant === 'destructive' ? { bg: 'bg-rose-50', text: 'text-rose-600' } :
      variant === 'success' ? { bg: 'bg-emerald-50', text: 'text-emerald-600' } :
      variant === 'warning' ? { bg: 'bg-amber-50', text: 'text-amber-600' } :
      variant === 'info' ? { bg: 'bg-sky-50', text: 'text-sky-600' } :
      { bg: 'bg-gray-100', text: 'text-gray-500' }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3 pl-2">
          {displayIcon && (
            <div className={cn("flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center", chipStyles.bg, chipStyles.text)}>
              {displayIcon}
            </div>
          )}
          <div className="flex-1 pt-1">
            {children}
          </div>
          {dismissible && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1 -mr-1 -mt-1 rounded-md hover:bg-gray-50"
            >
              <X className="h-3.5 w-3.5" />
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