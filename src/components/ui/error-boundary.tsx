"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorFallbackProps {
  error?: Error
  retry: () => void
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center mb-4">
        <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
        <h1 className="text-lg font-semibold text-gray-900">
          Something went wrong
        </h1>
      </div>
      
      <p className="text-gray-600 mb-6">
        We encountered an unexpected error. Please try refreshing the page or go back to the previous page.
      </p>
      
      <div className="flex gap-3">
        <Button onClick={retry} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </div>
      
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6">
          <summary className="text-sm text-gray-500 cursor-pointer">
            Error Details (Development Only)
          </summary>
          <pre className="text-xs text-gray-600 mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
)

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // TODO: Send to error tracking service in production
    // errorTrackingService.captureException(error, { extra: errorInfo })
    
    this.setState({ error, errorInfo })
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Specialized error boundaries for different contexts
export const LayoutErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Layout-specific error handling
      console.error('Layout error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

export const PaymentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Payment-specific error handling - critical errors
      console.error('Payment error (CRITICAL):', error, errorInfo)
      // TODO: Alert administrators immediately for payment errors
    }}
  >
    {children}
  </ErrorBoundary>
)

export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      // Dashboard-specific error handling
      console.error('Dashboard error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)