"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  title?: string
  message?: string
  showDetails?: boolean
  errorCount?: number
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = "Something went wrong",
  message = "We apologize for the inconvenience. Please try again or contact support if the problem persists.",
  showDetails = process.env.NODE_ENV === 'development',
  errorCount = 0
}) => {
  const handleRefresh = () => {
    if (resetError) {
      resetError()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  const handleContactSupport = () => {
    // Open chat widget or support page
    window.location.href = 'mailto:support@classraum.com'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>

        {showDetails && error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
            <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
            <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleRefresh}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {errorCount > 2 ? 'Reload Page' : 'Try Again'}
          </Button>
          
          <Button 
            onClick={handleGoHome}
            className="w-full"
            variant="outline"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          
          <Button 
            onClick={handleContactSupport}
            className="w-full"
            variant="ghost"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
}