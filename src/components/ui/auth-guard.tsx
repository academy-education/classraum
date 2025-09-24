"use client"

import React, { useEffect } from 'react'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { simpleTabDetection } from '@/utils/simpleTabDetection'

interface AuthGuardProps {
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
  children: React.ReactNode
}

export function AuthGuard({
  isLoading,
  hasError,
  errorMessage,
  children
}: AuthGuardProps) {
  // Mark app as loaded when authentication is complete
  useEffect(() => {
    if (!isLoading && !hasError) {
      simpleTabDetection.markAppLoaded()
    }
  }, [isLoading, hasError])

  // Enhanced loading state management with navigation awareness
  const shouldShowLoading = () => {
    // Never show loading if returning to tab
    const suppressForNavigation = simpleTabDetection.isReturningToTab()
    if (suppressForNavigation) {
      console.log('🚫 [AuthGuard] Suppressing loading screen - navigation detected')
      return false
    }

    // Show loading only for genuine loading states
    return !!isLoading
  }

  // Handle loading state
  if (shouldShowLoading()) {
    return <LoadingScreen />
  }

  // Handle error state
  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Authentication Error</p>
          <p className="text-sm text-muted-foreground">
            {errorMessage || 'Unable to verify your authentication. Please try refreshing the page.'}
          </p>
        </div>
      </div>
    )
  }

  // Render children if no loading or error
  return <>{children}</>
}