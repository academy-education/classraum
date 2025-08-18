import { useCallback } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface ErrorHandlerOptions {
  showNotification?: boolean
  logToConsole?: boolean
  reportToService?: boolean
}

export function useErrorHandler() {
  const { addNotification } = useGlobalStore()

  const handleError = useCallback((
    error: Error | unknown,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      logToConsole = true,
      reportToService = process.env.NODE_ENV === 'production'
    } = options

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    const errorContext = context ? `[${context}] ` : ''
    const fullMessage = `${errorContext}${errorMessage}`

    // Log to console in development
    if (logToConsole && process.env.NODE_ENV === 'development') {
      console.error(fullMessage, error)
    }

    // Show user notification
    if (showNotification) {
      addNotification({
        type: 'error',
        message: errorMessage
      })
    }

    // Report to error monitoring service
    if (reportToService && typeof window !== 'undefined') {
      // Example: Sentry, LogRocket, etc.
      // window.Sentry?.captureException(error, { tags: { context } })
    }

    return {
      message: errorMessage,
      context,
      originalError: error
    }
  }, [addNotification])

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    context?: string,
    options?: ErrorHandlerOptions
  ): Promise<{ data: T | null; error: Error | null }> => {
    try {
      const data = await asyncOperation()
      return { data, error: null }
    } catch (error) {
      const handledError = handleError(error, context, options)
      return { data: null, error: handledError.originalError as Error }
    }
  }, [handleError])

  const createErrorHandler = useCallback((
    context: string,
    options?: ErrorHandlerOptions
  ) => {
    return (error: Error | unknown) => handleError(error, context, options)
  }, [handleError])

  return {
    handleError,
    handleAsyncError,
    createErrorHandler
  }
}