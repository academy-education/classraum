"use client"

import React, { ComponentType } from 'react'
import { AppErrorBoundary } from '@/components/error-boundaries/AppErrorBoundary'

interface WithErrorBoundaryOptions {
  fallback?: React.ComponentType<any>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function withErrorBoundary<P extends {}>(
  Component: ComponentType<P>,
  options?: WithErrorBoundaryOptions
) {
  const WrappedComponent = (props: P) => {
    return (
      <AppErrorBoundary onError={options?.onError}>
        <Component {...props} />
      </AppErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}