'use client'

import React from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Log to monitoring service if available
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: Function }).gtag) {
      (window as unknown as { gtag: Function }).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      })
    }

    this.setState({ error, errorInfo })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  const { t } = useTranslation()

  const handleReload = () => {
    resetError()
    // If reset doesn't work, reload the page
    setTimeout(() => {
      if (error) {
        window.location.reload()
      }
    }, 100)
  }

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {t('errors.somethingWentWrong')}
      </h2>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {process.env.NODE_ENV === 'development' && error
          ? error.message
          : t('errors.defaultMessage', 'An unexpected error occurred. Please try refreshing the page.')
        }
      </p>

      <div className="flex gap-3">
        <Button onClick={handleReload} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          {t('common.retry', 'Try Again')}
        </Button>
        
        <Button 
          onClick={() => window.location.href = '/dashboard'} 
          className="flex items-center gap-2"
        >
          {t('common.goToDashboard', 'Go to Dashboard')}
        </Button>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 text-left w-full max-w-2xl">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            Technical Details
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  )
}

// HOC wrapper for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass fallback={fallback}>
      <Component {...props} />
    </ErrorBoundaryClass>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

export default ErrorBoundaryClass