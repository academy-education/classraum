'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { appInitTracker } from '@/utils/appInitializationTracker'
import { readStoredMode } from '@/lib/study/currentMode'
import { studentEntryTarget } from '@/lib/study/student-entry'

/* /home — the app's role-aware entry point.
 *
 * This component used to live at (app)/page.tsx, which resolves to "/" —
 * the same path as the marketing landing page. Next served the marketing
 * page there and the middleware sent the app subdomain's root straight to
 * /dashboard, so this router NEVER RAN. That is why a super admin opening
 * app.classraum.com landed on the manager dashboard: nothing was reading
 * their role outside the login handler.
 *
 * It now has a path of its own and the middleware points at it. */
export default function AppRootPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, isInitialized, userDataLoading } = useAuth()

  useEffect(() => {
    // Wait for auth initialization and user data loading
    if (!isInitialized || isLoading || userDataLoading) {
      return
    }

    /* No user after initialization: go to /auth OURSELVES. The comment
     * here used to say "AuthWrapper will handle redirect to /auth" — it
     * does not, and never did: AuthWrapper always renders children, and
     * the layout deliberately skips RoleBasedAuthWrapper for /home so
     * the role ladder below can run. Nothing else guards this page, so
     * a signed-out visitor to app.classraum.com sat on the LoadingScreen
     * forever. */
    if (!user) {
      router.replace('/auth')
      return
    }

    const roleBasedRedirect = async () => {
      try {
        // Get user role from database - this is safe because AuthWrapper has validated the user
        const { db } = await import('@/lib/supabase')
        const { data: userInfo, error } = await db
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          console.error('[AppRoot] Error fetching user role:', error)
          // Same trap as the !user branch: nothing "handles" errors here
          // but this page. /auth can show a real error and offers a way
          // forward; an eternal spinner offers neither.
          router.replace('/auth')
          return
        }

        const userRole = userInfo.role

        // Redirect based on role (only if not already on target page).
        // The student ladder lives in studentEntryTarget() — shared with
        // the post-login redirect in /auth, which had a diverging copy.
        // Parents go to the Grades dashboard since Study is student-only.
        if (userRole === 'student') {
          const target = await studentEntryTarget(db, user.id)
          if (pathname !== target) {
            router.replace(target)
          }
        } else if (userRole === 'parent') {
          // Parents default to Grades but keep their last-used mode —
          // study is open to them too (ModeChip offers the switch).
          const target = readStoredMode() === 'study' ? '/mobile/study' : '/mobile'
          if (pathname !== target) {
            router.replace(target)
          }
        } else if (userRole === 'manager' || userRole === 'teacher') {
          // Camp-only school (academies.camp_only, migration 087):
          // managers and teachers land on Camp — the dashboard and
          // classroom pages are about a curriculum they don't run.
          const isCampOnly = async () => {
            const { data: membership } = await db
              .from(userRole === 'manager' ? 'managers' : 'teachers')
              .select('academy_id')
              .eq('user_id', user.id)
              .limit(1)
              .maybeSingle()
            if (!membership?.academy_id) return false
            const { data: academy } = await db
              .from('academies')
              .select('camp_only')
              .eq('id', membership.academy_id)
              .maybeSingle()
            return academy?.camp_only === true
          }
          const target = (await isCampOnly())
            ? '/camp-program'
            : userRole === 'manager' ? '/dashboard' : '/classrooms'
          if (pathname !== target) {
            router.replace(target)
          }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          if (pathname !== '/admin') {
            router.replace('/admin')
          }
        } else {
          console.warn('[AppRoot] Unknown role, staying on current page:', userRole)
          // Don't redirect to auth - let AuthWrapper handle invalid roles
        }
      } catch (error) {
        console.error('[AppRoot] Error in role-based redirect:', error)
        // Let AuthWrapper handle the error
      }
    }

    roleBasedRedirect()
  }, [user, isInitialized, isLoading, userDataLoading, router, pathname])

  // Show loading screen while auth is initializing (with navigation awareness)
  if (appInitTracker.shouldSuppressLoadingForNavigation()) {
    // Return empty to avoid blocking - the redirect useEffect will handle navigation
    return <></>
  }

  return <LoadingScreen />
}