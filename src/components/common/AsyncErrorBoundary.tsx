"use client"

import React, { useState, useEffect, ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void | Promise<void>
  retryText?: string
}

export function AsyncErrorBoundary({ 
  children, 
  fallback, 
  onRetry,
  retryText = 'Try Again'
}: AsyncErrorBoundaryProps) {
  const [asyncError, setAsyncError] = useState<Error | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Handle async errors from promises
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      setAsyncError(new Error(event.reason?.message || 'Async operation failed'))
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      if (onRetry) {
        await onRetry()
      }
      setAsyncError(null)
    } catch (error) {
      console.error('Retry failed:', error)
      setAsyncError(error as Error)
    } finally {
      setIsRetrying(false)
    }
  }

  const asyncErrorFallback = (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Operation Failed
      </h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        {asyncError?.message || 'An unexpected error occurred while loading data.'}
      </p>
      <Button 
        onClick={handleRetry} 
        disabled={isRetrying}
        className="bg-primary text-white"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Retrying...' : retryText}
      </Button>
    </div>
  )

  if (asyncError) {
    return fallback || asyncErrorFallback
  }

  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        console.error('ErrorBoundary caught error:', error, errorInfo)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}