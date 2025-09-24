"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  retryKey: number
}

/**
 * Error boundary specifically for skeleton loading components
 * Shows a loading fallback instead of error UI to prevent breaking the skeleton pattern
 */
export class SkeletonErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      retryKey: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Only catch loading-related errors
    if (error.message?.includes('timeout') ||
        error.message?.includes('aborted') ||
        error.message?.includes('network') ||
        error.message?.includes('fetch')) {
      return { hasError: true, error }
    }

    // Let other errors bubble up
    return {}
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only handle loading-related errors
    if (!(error.message?.includes('timeout') ||
          error.message?.includes('aborted') ||
          error.message?.includes('network') ||
          error.message?.includes('fetch'))) {
      return
    }

    console.warn('SkeletonErrorBoundary caught loading error:', error, errorInfo)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Automatically retry after 3 seconds
    this.retryTimeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryKey: prevState.retryKey + 1
      }))
    }, 3000)
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  render() {
    if (this.state.hasError) {
      // Show fallback or skeleton instead of error UI
      return this.props.fallback || (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      )
    }

    // Use key to force remount on retry
    return (
      <div key={this.state.retryKey}>
        {this.props.children}
      </div>
    )
  }
}