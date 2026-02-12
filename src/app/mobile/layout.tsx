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
    const suppressForNavigation = appInitTracker.shouldSuppressLoadingForNavigation()
    if (suppressForNavigation) {
      return false
    }
    return isInitializing
  }

  const shouldShowLoadingForAuth = () => {
    const suppressForNavigation = appInitTracker.shouldSuppressLoadingForNavigation()
    if (suppressForNavigation) {
      return false
    }
    return !isAuthenticated
  }

  const isLoading = shouldShowLoadingForInitializing() || shouldShowLoadingForAuth()

  // Render the content - safe area backgrounds are handled by parent MobileLayout
  return (
    <>
      {/* Header - non-scrollable */}
      <MobileHeader />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div
          className="h-full overflow-y-auto scroll-smooth bg-gray-50"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {isLoading ? <LoadingScreen /> : children}
        </div>
      </main>

      {/* Bottom Navigation - non-scrollable */}
      <BottomNavigation />
    </>
  )
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  // Safe area backgrounds and main container are rendered here UNCONDITIONALLY
  // This ensures they're always visible regardless of auth/loading states in child wrappers
  return (
    <MobileErrorBoundary>
      {/* Fixed safe area backgrounds - ALWAYS rendered */}
      <div
        className="fixed top-0 left-0 right-0 bg-white z-[100]"
        style={{ height: 'var(--safe-area-top)' }}
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 right-0 bg-white z-[100]"
        style={{ height: 'var(--safe-area-bottom)' }}
        aria-hidden="true"
      />

      {/* Main app container - ALWAYS rendered, positioned between safe areas */}
      <div
        className="flex bg-white fixed"
        style={{
          top: 'var(--safe-area-top)',
          left: 0,
          right: 0,
          bottom: 'var(--safe-area-bottom)',
        }}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>
      </div>
    </MobileErrorBoundary>
  )
}
