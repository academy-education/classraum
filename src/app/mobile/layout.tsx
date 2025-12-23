"use client"

import { ReactNode, useCallback } from 'react'
import { BottomNavigation } from '@/components/ui/mobile/BottomNavigation'
import { MobileHeader } from '@/components/ui/mobile/MobileHeader'
import { PersistentMobileAuthProvider, usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { ParentAuthWrapper } from '@/components/ui/parent-auth-wrapper'
import { MobileErrorBoundary } from '@/components/ui/error-boundary'
import { AuthWrapper } from '@/components/ui/auth-wrapper'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'
import { appInitTracker } from '@/utils/appInitializationTracker'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNativeApp } from '@/hooks/useNativeApp'

interface MobileLayoutProps {
  children: ReactNode
}

function MobileLayoutContent({ children }: MobileLayoutProps) {
  const { isInitializing, isAuthenticated, user, refetch } = usePersistentMobileAuth()

  // Handle app resume - refresh data when coming back from background
  const handleAppResume = useCallback(() => {
    console.log('App resumed - refreshing data')
    refetch?.()
  }, [refetch])

  // Initialize native app features (splash screen, deep linking, status bar)
  useNativeApp({
    onResume: handleAppResume,
    statusBarStyle: 'dark',
    statusBarColor: '#FFFFFF',
  })

  // Initialize push notifications for native app
  usePushNotifications({
    userId: user?.userId ?? null,
    enabled: isAuthenticated,
  })

  // Enhanced loading state management with navigation awareness
  const shouldShowLoadingForInitializing = () => {
    // Never show loading if app was previously initialized (navigation scenario)
    const suppressForNavigation = appInitTracker.shouldSuppressLoadingForNavigation()
    if (suppressForNavigation) {
      console.log('🚫 [MobileLayoutContent] Suppressing initializing loading - navigation detected')
      return false
    }

    // Show loading only for genuine initialization
    return isInitializing
  }

  const shouldShowLoadingForAuth = () => {
    // Never show loading if app was previously initialized (navigation scenario)
    const suppressForNavigation = appInitTracker.shouldSuppressLoadingForNavigation()
    if (suppressForNavigation) {
      console.log('🚫 [MobileLayoutContent] Suppressing auth loading - navigation detected')
      return false
    }

    // Show loading only for genuine authentication checks
    return !isAuthenticated
  }

  // Only show loading screen during initial app launch
  if (shouldShowLoadingForInitializing()) {
    return <LoadingScreen />
  }

  // If not authenticated after initialization, redirect will happen automatically
  // Show loading screen while redirecting to avoid white screen
  if (shouldShowLoadingForAuth()) {
    return <LoadingScreen />
  }

  // Always render the mobile interface immediately for navigation
  return (
    <MobileErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Fixed header */}
        <MobileHeader />

        {/* Main content with padding for sticky header and bottom nav */}
        <main className="pb-16">
          {children}
        </main>

        {/* Fixed bottom navigation */}
        <BottomNavigation />
      </div>
    </MobileErrorBoundary>
  )
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <AuthWrapper>
      <RoleBasedAuthWrapper
        allowedRoles={['student', 'parent']}
        fallbackRedirect="/auth"
      >
        <PersistentMobileAuthProvider>
          <ParentAuthWrapper>
            <MobileLayoutContent>
              {children}
            </MobileLayoutContent>
          </ParentAuthWrapper>
        </PersistentMobileAuthProvider>
      </RoleBasedAuthWrapper>
    </AuthWrapper>
  )
}