"use client"

import React from 'react'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Main Card component
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'outlined' | 'elevated' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  onClick?: () => void
}

export const Card = React.memo<CardProps>(({
  children,
  className = "",
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  onClick
}) => {
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border-2 border-gray-300',
    elevated: 'bg-white shadow-lg border border-gray-100',
    flat: 'bg-gray-50'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  const interactionClasses = []
  if (hoverable) interactionClasses.push('hover:shadow-md transition-shadow')
  if (clickable) interactionClasses.push('cursor-pointer hover:bg-gray-50 transition-colors')

  return (
    <div
      className={`rounded-lg ${variantClasses[variant]} ${paddingClasses[padding]} ${interactionClasses.join(' ')} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
})

// Card Header component
interface CardHeaderProps {
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  showActionsMenu?: boolean
  onActionsClick?: () => void
}

export const CardHeader = React.memo<CardHeaderProps>(({
  children,
  className = "",
  actions,
  showActionsMenu = false,
  onActionsClick
}) => {
  return (
    <div className={`flex justify-between items-start ${className}`}>
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {(actions || showActionsMenu) && (
        <div className="flex items-center gap-2 ml-4">
          {actions}
          {showActionsMenu && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onActionsClick}
              className="text-gray-400 hover:text-gray-600"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
})

// Card Title component
interface CardTitleProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const CardTitle = React.memo<CardTitleProps>(({
  children,
  className = "",
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-base font-medium',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-bold'
  }

  return (
    <h3 className={`text-gray-900 ${sizeClasses[size]} ${className}`}>
      {children}
    </h3>
  )
})

// Card Subtitle component
interface CardSubtitleProps {
  children: React.ReactNode
  className?: string
}

export const CardSubtitle = React.memo<CardSubtitleProps>(({
  children,
  className = ""
}) => {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  )
})

// Card Content component
interface CardContentProps {
  children: React.ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export const CardContent = React.memo<CardContentProps>(({
  children,
  className = "",
  spacing = 'md'
}) => {
  const spacingClasses = {
    none: '',
    sm: 'mt-2',
    md: 'mt-4',
    lg: 'mt-6'
  }

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  )
})

// Card Footer component
interface CardFooterProps {
  children: React.ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  divider?: boolean
}

export const CardFooter = React.memo<CardFooterProps>(({
  children,
  className = "",
  spacing = 'md',
  divider = false
}) => {
  const spacingClasses = {
    none: '',
    sm: 'mt-2',
    md: 'mt-4',
    lg: 'mt-6'
  }

  return (
    <div className={`${spacingClasses[spacing]} ${divider ? 'pt-4 border-t border-gray-200' : ''} ${className}`}>
      {children}
    </div>
  )
})

// Card Actions component
interface CardActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

export const CardActions = React.memo<CardActionsProps>(({
  children,
  className = "",
  align = 'right'
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={`flex items-center gap-2 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  )
})

// Card Badge component
interface CardBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
}

export const CardBadge = React.memo<CardBadgeProps>(({
  children,
  className = "",
  variant = 'default',
  size = 'sm'
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  )
})

// Clickable Card component (extends Card with built-in navigation)
interface ClickableCardProps extends Omit<CardProps, 'clickable' | 'onClick'> {
  href?: string
  onClick?: () => void
  showArrow?: boolean
}

export const ClickableCard = React.memo<ClickableCardProps>(({
  children,
  href,
  onClick,
  showArrow = false,
  className = "",
  ...props
}) => {
  const handleClick = React.useCallback(() => {
    if (href) {
      window.location.href = href
    } else if (onClick) {
      onClick()
    }
  }, [href, onClick])

  return (
    <Card
      {...props}
      clickable
      onClick={handleClick}
      className={`group ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {children}
        </div>
        {showArrow && (
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        )}
      </div>
    </Card>
  )
})

// Stat Card component (specialized for displaying metrics)
interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string | number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  icon?: React.ReactNode
  className?: string
}

export const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  change,
  icon,
  className = ""
}) => {
  const changeColors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <Card className={`${className}`} hoverable>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className={`text-sm mt-1 ${changeColors[change.type]}`}>
              {change.type === 'increase' ? '↗' : change.type === 'decrease' ? '↘' : '→'} {change.value}
              {change.period && <span className="text-gray-500 ml-1">{change.period}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
})

// Compound component assignments
Card.Header = CardHeader
Card.Title = CardTitle
Card.Subtitle = CardSubtitle
Card.Content = CardContent
Card.Footer = CardFooter
Card.Actions = CardActions
Card.Badge = CardBadge
Card.Clickable = ClickableCard
Card.Stat = StatCard

// Export types
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardSubtitleProps,
  CardContentProps,
  CardFooterProps,
  CardActionsProps,
  CardBadgeProps,
  ClickableCardProps,
  StatCardProps
}