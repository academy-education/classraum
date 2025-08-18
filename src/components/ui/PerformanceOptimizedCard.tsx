import React from 'react'
import { Card } from '@/components/ui/card'
import { withPerformanceTracking } from '@/lib/performance'

interface PerformanceOptimizedCardProps {
  children: React.ReactNode
  className?: string
  componentName?: string
  [key: string]: any
}

const BaseCard: React.FC<PerformanceOptimizedCardProps> = React.memo(({ 
  children, 
  className,
  componentName,
  ...props 
}) => {
  return (
    <Card className={className} {...props}>
      {children}
    </Card>
  )
})

BaseCard.displayName = 'PerformanceOptimizedCard'

export const PerformanceOptimizedCard = withPerformanceTracking(BaseCard, 'PerformanceOptimizedCard')