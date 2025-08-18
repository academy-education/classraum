"use client"

import React from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Main PageLayout component
interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const PageLayout = React.memo<PageLayoutProps>(({
  children,
  className = "",
  maxWidth = 'full',
  padding = 'lg'
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md', 
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-none'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-6 md:p-8'
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${paddingClasses[padding]}`}>
        {children}
      </div>
    </div>
  )
})

// Page Header component
interface PageHeaderProps {
  children: React.ReactNode
  className?: string
  actions?: React.ReactNode
  showBack?: boolean
  onBack?: () => void
  backLabel?: string
}

export const PageHeader = React.memo<PageHeaderProps>(({
  children,
  className = "",
  actions,
  showBack = false,
  onBack,
  backLabel = "Back"
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {showBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 -ml-3 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      )}
      
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          {children}
        </div>
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
})

// Page Title component
interface PageTitleProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const PageTitle = React.memo<PageTitleProps>(({
  children,
  className = "",
  size = 'lg'
}) => {
  const sizeClasses = {
    sm: 'text-xl font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-3xl font-bold',
    xl: 'text-4xl font-bold'
  }

  return (
    <h1 className={`text-gray-900 ${sizeClasses[size]} ${className}`}>
      {children}
    </h1>
  )
})

// Page Description component
interface PageDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const PageDescription = React.memo<PageDescriptionProps>(({
  children,
  className = ""
}) => {
  return (
    <p className={`text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  )
})

// Page Content component
interface PageContentProps {
  children: React.ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export const PageContent = React.memo<PageContentProps>(({
  children,
  className = "",
  spacing = 'lg'
}) => {
  const spacingClasses = {
    none: 'space-y-0',
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8'
  }

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  )
})

// Page Section component
interface PageSectionProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
  headerClassName?: string
}

export const PageSection = React.memo<PageSectionProps>(({
  children,
  title,
  description,
  actions,
  className = "",
  headerClassName = ""
}) => {
  return (
    <section className={className}>
      {(title || description || actions) && (
        <div className={`mb-6 ${headerClassName}`}>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-gray-600 mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  )
})

// Page Grid component for consistent layouts
interface PageGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const PageGrid = React.memo<PageGridProps>(({
  children,
  columns = 1,
  gap = 'md',
  className = ""
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6', 
    lg: 'gap-8'
  }

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
})

// Page Toolbar component
interface PageToolbarProps {
  children: React.ReactNode
  className?: string
  sticky?: boolean
}

export const PageToolbar = React.memo<PageToolbarProps>(({
  children,
  className = "",
  sticky = false
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${
      sticky ? 'sticky top-4 z-10 shadow-sm' : ''
    } ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {children}
      </div>
    </div>
  )
})

// Page Stats component
interface PageStatsProps {
  stats: Array<{
    label: string
    value: string | number
    change?: {
      value: string | number
      type: 'increase' | 'decrease' | 'neutral'
    }
    icon?: React.ReactNode
  }>
  className?: string
}

export const PageStats = React.memo<PageStatsProps>(({
  stats,
  className = ""
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              {stat.change && (
                <div className={`text-sm mt-1 ${
                  stat.change.type === 'increase' ? 'text-green-600' :
                  stat.change.type === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {stat.change.type === 'increase' ? '↗' : 
                   stat.change.type === 'decrease' ? '↘' : '→'} {stat.change.value}
                </div>
              )}
            </div>
            {stat.icon && (
              <div className="text-gray-400">
                {stat.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
})

// Page Empty State component
interface PageEmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export const PageEmptyState = React.memo<PageEmptyStateProps>(({
  title,
  description,
  action,
  icon,
  className = ""
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
})

// Compound component assignments
PageLayout.Header = PageHeader
PageLayout.Title = PageTitle
PageLayout.Description = PageDescription
PageLayout.Content = PageContent
PageLayout.Section = PageSection
PageLayout.Grid = PageGrid
PageLayout.Toolbar = PageToolbar
PageLayout.Stats = PageStats
PageLayout.EmptyState = PageEmptyState

// Export types
export type {
  PageLayoutProps,
  PageHeaderProps,
  PageTitleProps,
  PageDescriptionProps,
  PageContentProps,
  PageSectionProps,
  PageGridProps,
  PageToolbarProps,
  PageStatsProps,
  PageEmptyStateProps
}