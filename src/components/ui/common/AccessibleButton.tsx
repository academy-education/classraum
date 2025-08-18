"use client"

import React, { forwardRef } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { useAccessibleId } from '@/hooks/useAccessibility'

interface AccessibleButtonProps extends ButtonProps {
  'aria-label'?: string
  'aria-describedby'?: string
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    'aria-label': ariaLabel, 
    'aria-describedby': ariaDescribedBy,
    loading = false,
    loadingText = 'Loading...',
    disabled,
    children,
    ...props 
  }, ref) => {
    const buttonId = useAccessibleId('button')

    return (
      <Button
        ref={ref}
        id={buttonId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        disabled={disabled || loading}
        {...props}
      >
        <span aria-hidden={loading}>
          {children}
        </span>
        {loading && (
          <span className="sr-only">
            {loadingText}
          </span>
        )}
      </Button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'