import React from 'react'
import { Card } from '@/components/ui/card'
import { withPerformanceTracking } from '@/lib/performance'

interface PerformanceOptimizedCardProps {
  children: React.ReactNode
  className?: string
  [key: string]: unknown
}

const BaseCard: React.FC<PerformanceOptimizedCardProps> = React.memo(({ 
  children, 
  className,
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