"use client"

import { ReactNode, useCallback, useEffect, useRef } from 'react'
import { BottomNavigation } from '@/components/ui/mobile/BottomNavigation'
import { StudySidebar } from '@/components/ui/mobile/StudySidebar'
import { MobileHeader } from '@/components/ui/mobile/MobileHeader'
import { useMobileNav } from '@/components/ui/mobile/useMobileNav'
import { StudyOnlyGuard } from '@/components/ui/mobile/StudyOnlyGuard'
import { XpToast } from '@/app/mobile/study/_shared/XpToast'
import { UndoToast } from '@/app/mobile/study/_shared/UndoToast'
import { DailyGoalCelebration } from '@/app/mobile/study/_shared/DailyGoalCelebration'
import { NavTour } from '@/app/mobile/study/_shared/NavTour'
import { PersistentMobileAuthProvider, usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { ParentAuthWrapper } from '@/components/ui/parent-auth-wrapper'
import { MobileErrorBoundary } from '@/components/ui/error-boundary'
import { AuthWrapper } from '@/components/ui/auth-wrapper'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'
import { appInitTracker } from '@/utils/appInitializationTracker'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNativeApp } from '@/hooks/useNativeApp'
import { useTheme } from '@/hooks/useTheme'
import { fetchThemeFromAccount } from '@/lib/theme-account'
import { stashReferralFromUrl } from '@/lib/study/pending-referral'

interface MobileLayoutProps {
  children: ReactNode
}

// Capture a referral code from an invite link (?ref=CODE) the moment the
// mobile tree first renders — BEFORE the auth gate below can redirect a
// logged-out visitor to /auth (which drops the query string). Stashed to
// localStorage so it survives login + onboarding and surfaces as the
// claim banner once the student reaches the study home. Module-guarded so
// it runs once per page load, and render-safe (idempotent, never throws).
let referralStashed = false

function MobileLayoutContent({ children }: MobileLayoutProps) {
  const { isInitializing, isAuthenticated, user, refetch } = usePersistentMobileAuth()

  // Focus mode — inside an active test/session, the session UI owns the
  // whole screen (its own progress + timer bar). Hiding the shell chrome
  // (header, sidebar, bottom bar) turns it into a dedicated test surface
  // instead of a mobile page nested under a redundant top bar. The
  // sidebar and bottom bar already self-hide on inSession; the header
  // is hidden here to match.
  const { inSession } = useMobileNav()

  // Apply the persisted theme on EVERY /mobile page (not just profile,
  // where the appearance setting lives). Without this, dark mode only
  // took effect once Profile mounted its own useTheme; a client-side
  // nav into any other study page left the boot-script class stale.
  const { setTheme } = useTheme()

  // Hydrate the theme from the ACCOUNT once per sign-in. The on-device
  // store is only a pre-paint cache (and can be wiped on a native
  // relaunch); the account's user_preferences.theme is the durable source
  // of truth, so a fresh install / new device shows the saved appearance.
  const themeHydratedFor = useRef<string | null>(null)
  useEffect(() => {
    const uid = user?.userId
    if (!uid || themeHydratedFor.current === uid) return
    themeHydratedFor.current = uid
    void (async () => {
      const saved = await fetchThemeFromAccount(uid)
      if (saved) setTheme(saved)
    })()
  }, [user?.userId, setTheme])

  // Handle app resume - refresh data when coming back from background
  const handleAppResume = useCallback(() => {
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
      {/* Desktop shell (lg+): a FULL-HEIGHT nav rail on the left with the
          logo at its top-left corner, and the content column to its
          right carrying its own top utility strip. On phones the rail is
          hidden, so the header spans full width on top exactly as before
          and the bottom bar shows. */}
      <div className="flex-1 flex overflow-hidden">
        <StudySidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - non-scrollable. Full width on phones; a top-right
              utility strip beside the content on desktop (its logo hides
              at lg since the rail owns it). Hidden inside an active
              session so the test surface is full-screen. */}
          {!inSession && <MobileHeader />}
          <main className="flex-1 overflow-hidden">
            <div
              className="h-full overflow-y-auto scroll-smooth bg-gray-50"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {isLoading ? <LoadingScreen /> : <StudyOnlyGuard>{children}</StudyOnlyGuard>}
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation - non-scrollable (hidden at lg) */}
      <BottomNavigation />

      {/* Global XP toast — listens for window 'study:xp' events.
          Mounted at the layout level so any study page can fire and
          the chip survives navigation. */}
      <XpToast />
      {/* Global undo toast — 5s window to reverse dismissals. */}
      <UndoToast />
      {/* Daily-goal celebration — pops when the student crosses their
          daily minutes goal. Polls every 30s while mounted. */}
      <DailyGoalCelebration />
      {/* First-visit bottom-nav tour — 4 steps introducing Snap,
          Review, League, Wrong-Answer Notebook. Auto-shows on first
          visit to /mobile/study; localStorage-gated thereafter. */}
      <NavTour />
    </>
  )
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  // Capture an invite-link referral code synchronously on the first client
  // render — this runs above (and before) the AuthWrapper redirect, so a
  // logged-out visitor's ?ref= is stashed before router.replace('/auth')
  // strips the query. See stashReferralFromUrl for why this is render-safe.
  if (typeof window !== 'undefined' && !referralStashed) {
    referralStashed = true
    stashReferralFromUrl()
  }

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
