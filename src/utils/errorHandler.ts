import { useUIStore, showErrorToast } from '@/stores/useUIStore'

export interface ErrorHandlerOptions {
  showToast?: boolean
  logToConsole?: boolean
  operation?: string
  resource?: string
  fallbackMessage?: string
}

export class AppError extends Error {
  public code?: string
  public statusCode?: number
  public userMessage?: string

  constructor(
    message: string,
    options?: {
      code?: string
      statusCode?: number
      userMessage?: string
      cause?: unknown
    }
  ) {
    super(message)
    this.name = 'AppError'
    this.code = options?.code
    this.statusCode = options?.statusCode
    this.userMessage = options?.userMessage
    this.cause = options?.cause
  }
}

export function createErrorHandler(defaultOptions: ErrorHandlerOptions = {}) {
  return function handleError(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): void {
    const mergedOptions = { ...defaultOptions, ...options }
    const {
      showToast = true,
      logToConsole = true,
      operation = 'operation',
      resource = 'data',
      fallbackMessage = 'An unexpected error occurred'
    } = mergedOptions

    // Log to console if enabled
    if (logToConsole) {
      console.error(`Error during ${operation}:`, error)
    }

    // Determine user-friendly message
    let userMessage = fallbackMessage
    let technicalMessage = ''

    if (error instanceof AppError) {
      userMessage = error.userMessage || error.message
      technicalMessage = error.message
    } else if (error instanceof Error) {
      technicalMessage = error.message
      
      // Handle common Supabase errors
      if (error.message.includes('auth')) {
        userMessage = 'Authentication required. Please sign in again.'
      } else if (error.message.includes('network')) {
        userMessage = 'Network error. Please check your connection and try again.'
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.'
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        userMessage = 'You do not have permission to perform this action.'
      } else if (error.message.includes('not found')) {
        userMessage = `${resource} not found.`
      } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
        userMessage = `This ${resource} already exists.`
      } else {
        userMessage = `Failed to ${operation}. ${fallbackMessage}`
      }
    } else if (typeof error === 'string') {
      userMessage = error
      technicalMessage = error
    }

    // Show toast notification if enabled
    if (showToast) {
      showErrorToast(
        userMessage,
        process.env.NODE_ENV === 'development' ? technicalMessage : undefined
      )
    }

    // Log to external monitoring service if available
    if (typeof window !== 'undefined') {
      // Analytics/monitoring integration
      const windowWithGtag = window as Window & {
        gtag?: (command: string, eventName: string, parameters: Record<string, unknown>) => void
      }
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', 'exception', {
          description: technicalMessage,
          fatal: false,
          operation,
          resource
        })
      }

      // Sentry integration example
      const windowWithSentry = window as Window & {
        Sentry?: {
          addBreadcrumb: (breadcrumb: {
            message: string
            category: string
            level: string
            data: Record<string, unknown>
          }) => void
          captureException: (error: Error) => void
          captureMessage: (message: string) => void
        }
      }
      if (windowWithSentry.Sentry) {
        windowWithSentry.Sentry.addBreadcrumb({
          message: `Error in ${operation}`,
          category: 'error',
          level: 'error',
          data: { resource, operation }
        })
        
        if (error instanceof Error) {
          windowWithSentry.Sentry.captureException(error)
        } else {
          windowWithSentry.Sentry.captureMessage(String(error))
        }
      }
    }
  }
}

// Pre-configured error handlers for common operations
export const handleDataFetchError = createErrorHandler({
  operation: 'fetch data',
  fallbackMessage: 'Please try refreshing the page'
})

export const handleDataSaveError = createErrorHandler({
  operation: 'save data',
  fallbackMessage: 'Please check your input and try again'
})

export const handlePaymentError = createErrorHandler({
  operation: 'process payment',
  resource: 'payment',
  fallbackMessage: 'Please try again or contact support'
})

export const handleAuthError = createErrorHandler({
  operation: 'authenticate',
  resource: 'session',
  fallbackMessage: 'Please sign in again'
})

// Utility functions for common error scenarios
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('connection')
  }
  return false
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('auth') ||
           error.message.toLowerCase().includes('unauthorized') ||
           error.message.toLowerCase().includes('permission')
  }
  return false
}

export function shouldRetry(error: unknown, attemptCount: number = 0): boolean {
  if (attemptCount >= 3) return false
  
  // Retry on network errors
  if (isNetworkError(error)) return true
  
  // Retry on temporary server errors
  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) {
    return true
  }
  
  return false
}

// Hook for using error handler in components
export function useErrorHandler(defaultOptions?: ErrorHandlerOptions) {
  return createErrorHandler(defaultOptions)
}