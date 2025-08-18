"use client"

import React from 'react'

// Loading spinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const LoadingSpinner = React.memo<LoadingSpinnerProps>(({ 
  size = 'md', 
  className = "",
  text = "Loading..."
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
})

// Error component
interface ErrorDisplayProps {
  error: Error | string
  retry?: () => void
  className?: string
}

const ErrorDisplay = React.memo<ErrorDisplayProps>(({ 
  error, 
  retry, 
  className = "" 
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="text-red-500 mb-2">
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
      <p className="text-gray-600 mb-4">{errorMessage}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
})

// HOC props interface
interface WithLoadingProps {
  loading?: boolean
  error?: Error | string | null
  retry?: () => void
  loadingText?: string
  loadingSize?: 'sm' | 'md' | 'lg'
  showLoadingOverlay?: boolean
}

// Higher-order component that adds loading and error states
export function withLoading<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    loadingText?: string
    loadingSize?: 'sm' | 'md' | 'lg'
    showFullPageLoading?: boolean
  } = {}
) {
  const WithLoadingComponent = React.memo<P & WithLoadingProps>((props) => {
    const {
      loading = false,
      error = null,
      retry,
      loadingText = options.loadingText || "Loading...",
      loadingSize = options.loadingSize || 'md',
      showLoadingOverlay = false,
      ...componentProps
    } = props

    // Show error state
    if (error) {
      return (
        <ErrorDisplay 
          error={error} 
          retry={retry}
          className={options.showFullPageLoading ? 'min-h-screen' : ''}
        />
      )
    }

    // Show loading state
    if (loading) {
      if (showLoadingOverlay) {
        return (
          <div className="relative">
            <div className="opacity-50 pointer-events-none">
              <WrappedComponent {...(componentProps as P)} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <LoadingSpinner size={loadingSize} text={loadingText} />
            </div>
          </div>
        )
      }

      return (
        <LoadingSpinner 
          size={loadingSize} 
          text={loadingText}
          className={options.showFullPageLoading ? 'min-h-screen' : ''}
        />
      )
    }

    // Render the wrapped component
    return <WrappedComponent {...(componentProps as P)} />
  })

  WithLoadingComponent.displayName = `withLoading(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithLoadingComponent
}

// Hook for managing loading state
interface UseLoadingReturn {
  loading: boolean
  error: Error | string | null
  setLoading: (loading: boolean) => void
  setError: (error: Error | string | null) => void
  clearError: () => void
  withLoadingWrapper: <T>(asyncFn: () => Promise<T>) => Promise<T | undefined>
}

export const useLoading = (initialLoading = false): UseLoadingReturn => {
  const [loading, setLoading] = React.useState(initialLoading)
  const [error, setError] = React.useState<Error | string | null>(null)

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const withLoadingWrapper = React.useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T | undefined> => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error(String(err))
      setError(errorMessage)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    setLoading,
    setError,
    clearError,
    withLoadingWrapper
  }
}

// Skelton component for better loading UX
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
}

export const Skeleton = React.memo<SkeletonProps>(({
  className = "",
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = "animate-pulse bg-gray-200 rounded"
  
  const variantClasses = {
    text: 'h-4',
    rectangular: 'h-24',
    circular: 'rounded-full h-12 w-12'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = width
  if (height) style.height = height

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={style}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  )
})

// Loading boundary component
interface LoadingBoundaryProps {
  children: React.ReactNode
  loading?: boolean
  error?: Error | string | null
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  retry?: () => void
}

export const LoadingBoundary = React.memo<LoadingBoundaryProps>(({
  children,
  loading = false,
  error = null,
  fallback,
  errorFallback,
  retry
}) => {
  if (error) {
    return errorFallback ? (
      <>{errorFallback}</>
    ) : (
      <ErrorDisplay error={error} retry={retry} />
    )
  }

  if (loading) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <LoadingSpinner />
    )
  }

  return <>{children}</>
})

// Export components
export { LoadingSpinner, ErrorDisplay }