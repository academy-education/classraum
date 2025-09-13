"use client"

import React, { Suspense } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { AppErrorBoundary } from '@/components/error-boundaries/AppErrorBoundary'

interface LazyPageWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export const LazyPageWrapper = React.memo<LazyPageWrapperProps>(function LazyPageWrapper({
  children,
  fallback,
  errorFallback
}) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading page..." />
    </div>
  )

  const defaultErrorFallback = (
    <div className="flex items-center justify-center min-h-[400px] bg-red-50 border border-red-200 rounded-lg p-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load page</h3>
        <p className="text-red-600">Please try refreshing the page.</p>
      </div>
    </div>
  )

  return (
    <AppErrorBoundary fallback={errorFallback || defaultErrorFallback}>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </AppErrorBoundary>
  )
})