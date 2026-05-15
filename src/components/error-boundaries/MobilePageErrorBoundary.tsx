"use client"

import React, { Component, ReactNode } from 'react'
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showRetry?: boolean
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  retryCount: number
  isRetrying: boolean
}

interface FallbackProps {
  error?: Error
  retryCount: number
  showRetry: boolean
  onRetry: () => void
  onGoBack: () => void
}

interface RetryingProps {
  attempt: number
}

// Functional fallback components so we can use useTranslation (the parent
// is a class component for getDerivedStateFromError / componentDidCatch).
function ErrorFallback({ error, showRetry, onRetry, onGoBack }: FallbackProps) {
  const { t } = useTranslation()

  const isNetworkError =
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-sm w-full p-6">
        {/* Icon chip — matches profile modal pattern (centered chip + title + description) */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {t('errorBoundary.title') || 'Something went wrong'}
          </h2>
          <p className="text-sm text-gray-500">
            {isNetworkError
              ? t('errorBoundary.networkError') || 'Network connection issue. Please check your internet connection and try again.'
              : t('errorBoundary.unexpected') || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
        </div>

        {/* Actions — primary "try again" + secondary "go back", same Button shapes as other modals */}
        <div className="space-y-2">
          {showRetry && (
            <Button
              onClick={onRetry}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.75} />
              {t('errorBoundary.tryAgain') || 'Try Again'}
            </Button>
          )}
          <Button
            onClick={onGoBack}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.75} />
            {t('errorBoundary.goBack') || 'Go Back'}
          </Button>
        </div>

        {/* Dev-only stack trace — collapsed details, soft palette */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-5 text-left">
            <summary className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 cursor-pointer hover:text-gray-600">
              {t('errorBoundary.errorDetails') || 'Error Details (Dev Only)'}
            </summary>
            <pre className="text-[11px] text-rose-700 mt-2 p-3 bg-rose-50 ring-1 ring-rose-100 rounded-lg overflow-auto max-h-48">
              {error.stack}
            </pre>
          </details>
        )}
      </Card>
    </div>
  )
}

function RetryingFallback({ attempt }: RetryingProps) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" strokeWidth={1.75} />
        </div>
        <p className="text-sm text-gray-500">
          {t('errorBoundary.retrying', { count: attempt }) || `Retrying… (attempt ${attempt})`}
        </p>
      </div>
    </div>
  )
}

/**
 * Comprehensive error boundary for mobile pages with retry functionality.
 * Handles both loading errors and runtime errors gracefully.
 */
export class MobilePageErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0,
      isRetrying: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MobilePageErrorBoundary caught error:', error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < 2) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  shouldAutoRetry = (error: Error): boolean => {
    const retryableErrors = ['network', 'timeout', 'fetch', 'connection', 'aborted']
    return retryableErrors.some(keyword =>
      error.message?.toLowerCase().includes(keyword)
    )
  }

  scheduleRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000)
    this.setState({ isRetrying: true })
    this.retryTimeout = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1,
      isRetrying: false
    }))
    this.props.onRetry?.()
  }

  handleManualRetry = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
    this.handleRetry()
  }

  handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/mobile'
    }
  }

  render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Show retry loading state
      if (this.state.isRetrying) {
        return <RetryingFallback attempt={this.state.retryCount + 1} />
      }

      // Show error UI with retry options
      return (
        <ErrorFallback
          error={this.state.error}
          retryCount={this.state.retryCount}
          showRetry={this.props.showRetry !== false}
          onRetry={this.handleManualRetry}
          onGoBack={this.handleGoBack}
        />
      )
    }

    return this.props.children
  }
}
