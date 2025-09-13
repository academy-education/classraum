"use client"

import { useCallback } from 'react'

export const useErrorHandler = () => {
  const handleError = useCallback((error: Error, context?: string) => {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context || 'component'}:`, error)
    }

    // In production, send to monitoring service
    // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
    
    // Show user-friendly error message
    // This could trigger a toast notification or update component state
    return {
      message: 'Something went wrong. Please try again.',
      type: 'error' as const,
      retry: true
    }
  }, [])

  const handleAsyncError = useCallback(async (asyncFn: () => Promise<any>, context?: string) => {
    try {
      return await asyncFn()
    } catch (error) {
      return handleError(error as Error, context)
    }
  }, [handleError])

  return {
    handleError,
    handleAsyncError
  }
}