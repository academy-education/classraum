"use client"

import { ReactNode } from 'react'
import { BottomNavigation } from '@/components/ui/mobile/BottomNavigation'
import { MobileHeader } from '@/components/ui/mobile/MobileHeader'
import { PersistentMobileAuthProvider, usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface MobileLayoutProps {
  children: ReactNode
}

function MobileLayoutContent({ children }: MobileLayoutProps) {
  const { isInitializing, isAuthenticated } = usePersistentMobileAuth()

  // Only show loading screen during initial app launch
  if (isInitializing) {
    return <LoadingScreen />
  }

  // If not authenticated after initialization, redirect will happen automatically
  // Show loading screen while redirecting to avoid white screen
  if (!isAuthenticated) {
    return <LoadingScreen />
  }

  // Always render the mobile interface immediately for navigation
  return (
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
  )
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <LanguageProvider>
      <PersistentMobileAuthProvider>
        <MobileLayoutContent>
          {children}
        </MobileLayoutContent>
      </PersistentMobileAuthProvider>
    </LanguageProvider>
  )
}