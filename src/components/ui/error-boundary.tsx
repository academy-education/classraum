"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Report a crashed subtree.
 *
 * This is a CLIENT component, so it cannot reach `@/lib/ops/alert` —
 * that module pulls in supabaseAdmin and the service-role key. The
 * client-safe reporting path the app already uses is Sentry (see
 * `src/utils/errorHandler.ts`, which pokes `window.Sentry`); we import
 * `@sentry/nextjs` directly instead, because that is the same SDK
 * `sentry.client.config.ts` already initialises on every page — it is
 * typed, it is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset, and it does
 * not depend on the global happening to be present.
 *
 * A dedicated server route was the alternative (it would have written an
 * `alerts` row). Rejected: a fetch from inside a crashed render path is
 * itself unreliable, and Sentry alert rules on `boundary:payment` /
 * `level:fatal` page admins just as well without a new unauthenticated
 * write endpoint.
 *
 * Never throws — a reporter that crashes inside componentDidCatch takes
 * the fallback UI down with it.
 */
function reportBoundaryError(
  error: Error,
  errorInfo: ErrorInfo,
  boundary: string,
  level: 'error' | 'fatal',
) {
  try {
    Sentry.captureException(error, {
      level,
      tags: { boundary, errorBoundary: 'true' },
      // componentStack tells you WHICH subtree died — without it every
      // boundary crash looks like the same generic React error.
      extra: { componentStack: errorInfo.componentStack },
    })
  } catch (e) {
    console.error('[ErrorBoundary] failed to report error:', e)
  }
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Which boundary this is, for Sentry grouping. */
  boundaryName?: string
  /** `fatal` for boundaries where a crash means lost money/data. */
  severity?: 'error' | 'fatal'
}

interface ErrorFallbackProps {
  error?: Error
  retry: () => void
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center mb-4">
        <AlertCircle className="h-6 w-6 text-rose-600 mr-2" />
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
    
    // Report BEFORE the consumer callback: a throwing onError must not
    // be able to swallow the report.
    reportBoundaryError(
      error,
      errorInfo,
      this.props.boundaryName ?? 'unknown',
      this.props.severity ?? 'error',
    )

    // Call custom error handler if provided
    try {
      this.props.onError?.(error, errorInfo)
    } catch (e) {
      console.error('[ErrorBoundary] onError handler threw:', e)
    }

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
    boundaryName="layout"
    onError={(error, errorInfo) => {
      // Layout-specific error handling
      console.error('Layout error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

// `fatal` on purpose: a crash inside the payment subtree can leave a
// charge in an unknown state, so it must page rather than sit in the
// error feed with the rest of the UI noise.
export const PaymentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    boundaryName="payment"
    severity="fatal"
    onError={(error, errorInfo) => {
      console.error('Payment error (CRITICAL):', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    boundaryName="dashboard"
    onError={(error, errorInfo) => {
      // Dashboard-specific error handling
      console.error('Dashboard error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)

// Mobile-optimized error fallback component
const MobileErrorFallback: React.FC<ErrorFallbackProps> = ({ error, retry }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
    <div className="max-w-sm w-full bg-card shadow-lg rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <AlertCircle className="h-12 w-12 text-rose-500" />
      </div>

      <h1 className="text-lg font-semibold text-foreground mb-2">
        Oops! Something went wrong
      </h1>

      <p className="text-muted-foreground text-sm mb-6">
        Don&apos;t worry, we can fix this. Try refreshing the page or go back to the home screen.
      </p>

      <div className="space-y-3">
        <Button
          onClick={retry}
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            // Navigate to mobile home instead of browser back
            window.location.href = '/mobile'
          }}
          className="w-full flex items-center justify-center gap-2"
        >
          🏠 Go to Home
        </Button>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Error Details (Dev)
          </summary>
          <pre className="text-xs text-muted-foreground mt-2 bg-muted p-2 rounded overflow-auto max-h-24">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
)

export const MobileErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={MobileErrorFallback}
    boundaryName="mobile"
    onError={(error, errorInfo) => {
      // Mobile-specific error handling. Telemetry itself goes through the
      // shared Sentry report in componentDidCatch (tagged boundary:mobile).
      console.error('Mobile app error:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)