"use client"

import React, { Component, ReactNode } from 'react'
import { RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react'

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

/**
 * Comprehensive error boundary for mobile pages with retry functionality
 * Handles both loading errors and runtime errors gracefully
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
    const retryableErrors = [
      'network',
      'timeout',
      'fetch',
      'connection',
      'aborted'
    ]

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

    // Call custom retry handler if provided
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
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center space-y-4">
              <RefreshCw className="w-8 h-8 mx-auto text-primary animate-spin" />
              <p className="text-sm text-gray-600">
                Retrying... (Attempt {this.state.retryCount + 1})
              </p>
            </div>
          </div>
        )
      }

      // Show error UI with retry options
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center space-y-6">
            <div className="space-y-3">
              <AlertTriangle className="w-12 h-12 mx-auto text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Something went wrong
              </h2>
              <p className="text-sm text-gray-600">
                {this.state.error?.message?.includes('network') ||
                 this.state.error?.message?.includes('fetch')
                  ? 'Network connection issue. Please check your internet connection and try again.'
                  : 'An unexpected error occurred. Please try refreshing the page.'}
              </p>
            </div>

            <div className="space-y-3">
              {(this.props.showRetry !== false) && (
                <button
                  onClick={this.handleManualRetry}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              <button
                onClick={this.handleGoBack}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}