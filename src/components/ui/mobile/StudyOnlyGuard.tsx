"use client"

import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { storeMode } from '@/lib/study/currentMode'
import { LoadingScreen } from '@/components/ui/loading-screen'

/**
 * Keeps study-only students (role=student with NO active academy
 * membership) out of academy-mode surfaces.
 *
 * The entry routers ((app)/page.tsx and the /auth redirect) already
 * send academy-less students to /mobile/study, and ModeChip /
 * ModeSwitcherSheet hide the Grades option for them — but none of
 * that protects a DIRECT arrival on an academy route: a cold launch
 * restoring the last URL, a deep link / push-notification tap, or a
 * back-swipe into /mobile. Without this guard those students land on
 * an empty Grades dashboard ("academy mode") they can never have data
 * for.
 *
 * Behavior:
 *   - Students with zero academyIds: mode is pinned to 'study'
 *     (persisted, so shared routes like /mobile/profile resolve the
 *     study nav) and any academy-only path is replaced with
 *     /mobile/study. While that redirect is in flight we render the
 *     loading screen instead of the academy page, so no academy UI
 *     flashes.
 *   - Students with academies, parents, and everyone else: untouched.
 *     (Managers/teachers never reach /mobile — RoleBasedAuthWrapper
 *     already fences them out.)
 */

// Academy-only surfaces. Shared routes (profile, notifications,
// messages) and everything under /mobile/study stay reachable.
const ACADEMY_ONLY_PREFIXES = [
  '/mobile/assignments',
  '/mobile/reports',
  '/mobile/report',
  '/mobile/schedule',
  '/mobile/session',
  '/mobile/invoices',
  '/mobile/invoice',
  '/mobile/announcements',
  // The Grades/Study hub — its Grades tile is a dead end with no academy.
  '/mobile/start',
]

export function isAcademyOnlyPath(pathname: string): boolean {
  if (pathname === '/mobile' || pathname === '/mobile/') return true
  return ACADEMY_ONLY_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function StudyOnlyGuard({ children }: { children: ReactNode }) {
  const { user } = usePersistentMobileAuth()
  const pathname = usePathname() ?? ''
  const router = useRouter()

  // Only students can be study-only. Parents always belong to an
  // academy (auth-wrapper errors otherwise), and managers/teachers
  // never render this layout.
  const studyOnly = user?.role === 'student' && user.academyIds.length === 0
  const mustRedirect = studyOnly && isAcademyOnlyPath(pathname)

  useEffect(() => {
    if (!studyOnly) return
    // Pin the persisted mode so shared routes (profile, notifications)
    // resolve the study nav instead of the 'grades' default.
    storeMode('study')
    if (mustRedirect) {
      router.replace('/mobile/study')
    }
  }, [studyOnly, mustRedirect, router])

  // Hold the academy page back while the redirect lands — a brief
  // loading screen beats flashing an empty Grades dashboard.
  if (mustRedirect) return <LoadingScreen />

  return <>{children}</>
}
