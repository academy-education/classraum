"use client"

import React, { Suspense } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { AppErrorBoundary } from '@/components/error-boundaries/AppErrorBoundary'

interface LazyPageWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const LazyPageWrapper = React.memo<LazyPageWrapperProps>(function LazyPageWrapper({
  children,
  fallback
}) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading page..." />
    </div>
  )


  return (
    <AppErrorBoundary>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </AppErrorBoundary>
  )
})