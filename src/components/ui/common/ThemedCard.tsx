"use client"

import React, { forwardRef } from 'react'
import { useTheme } from '@/hooks/useTheme'

interface ThemedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  children: React.ReactNode
  hover?: boolean
  interactive?: boolean
}

export const ThemedCard = forwardRef<HTMLDivElement, ThemedCardProps>(
  ({ 
    variant = 'default',
    children,
    hover = false,
    interactive = false,
    className = '',
    ...props 
  }, ref) => {
    const { prefersReducedMotion } = useTheme()

    const baseClasses = `
      rounded-lg transition-colors duration-200
      ${!prefersReducedMotion ? 'transition-all duration-200' : ''}
    `

    const variantClasses = {
      default: `
        bg-primary border border-primary
        ${hover ? 'hover:shadow-theme-md' : ''}
        ${interactive ? 'cursor-pointer hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent' : ''}
      `,
      elevated: `
        bg-primary shadow-theme-md
        ${hover ? 'hover:shadow-theme-lg' : ''}
        ${interactive ? 'cursor-pointer hover:shadow-theme-xl focus:outline-none focus:ring-2 focus:ring-accent' : ''}
      `,
      outlined: `
        bg-transparent border-2 border-primary
        ${hover ? 'hover:bg-secondary' : ''}
        ${interactive ? 'cursor-pointer hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent' : ''}
      `,
      filled: `
        bg-secondary border border-secondary
        ${hover ? 'hover:bg-tertiary' : ''}
        ${interactive ? 'cursor-pointer hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent' : ''}
      `
    }

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ThemedCard.displayName = 'ThemedCard'