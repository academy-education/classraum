"use client"

import React, { Component, ReactNode } from 'react'
import { ErrorFallback } from '@/components/error-ui/ErrorFallback'

interface Props {
  children: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorCount: number
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is an auth-related error that we should let bubble up
    if (error.message?.includes('Missing') && error.message?.includes('auth context')) {
      // Don't catch auth errors during initialization
      return {}
    }
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't catch auth initialization errors
    if (error.message?.includes('Missing') && error.message?.includes('auth context')) {
      return
    }

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'development') {
      console.error('AppErrorBoundary caught an error:', error, errorInfo)
    }

    // Increment error count
    this.setState(prevState => ({ errorCount: prevState.errorCount + 1 }))

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })

    // If we've had multiple errors, reload the page
    if (this.state.errorCount > 2) {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.handleReset}
          errorCount={this.state.errorCount}
        />
      )
    }

    return this.props.children
  }
}