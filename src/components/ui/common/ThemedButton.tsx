"use client"

import React, { forwardRef } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const ThemedButton = forwardRef<HTMLButtonElement, ThemedButtonProps>(
  ({ 
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    className = '',
    ...props 
  }, ref) => {
    const { prefersReducedMotion } = useTheme()

    const baseClasses = `
      inline-flex items-center justify-center font-medium rounded-md
      transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      ${!prefersReducedMotion ? 'transition-all duration-200' : ''}
    `

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    const variantClasses = {
      primary: `
        bg-primary text-inverse border border-transparent
        hover:bg-opacity-90 focus:ring-accent
        shadow-theme-sm hover:shadow-theme-md
      `,
      secondary: `
        bg-secondary text-primary border border-primary
        hover:bg-tertiary focus:ring-accent
      `,
      outline: `
        bg-transparent text-primary border border-primary
        hover:bg-secondary focus:ring-accent
      `,
      ghost: `
        bg-transparent text-primary border border-transparent
        hover:bg-secondary focus:ring-accent
      `,
      destructive: `
        bg-red-600 text-white border border-transparent
        hover:bg-red-700 focus:ring-red-500
        shadow-theme-sm hover:shadow-theme-md
      `
    }

    // Use CSS variables for theming
    const themeStyles = {
      primary: {
        backgroundColor: 'var(--interactive-primary)',
        color: 'var(--text-inverse)',
        borderColor: 'transparent'
      },
      secondary: {
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-primary)'
      },
      outline: {
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-primary)'
      },
      ghost: {
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        borderColor: 'transparent'
      },
      destructive: {
        backgroundColor: 'var(--status-error)',
        color: 'var(--text-inverse)',
        borderColor: 'transparent'
      }
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        style={themeStyles[variant]}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span className={loading ? 'opacity-70' : ''}>
          {children}
        </span>
      </button>
    )
  }
)

ThemedButton.displayName = 'ThemedButton'