"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, FileText, User, BookOpen, Route, Shuffle, Trophy } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { resolveMode, storeMode, modeForPath } from '@/lib/study/currentMode'

/**
 * Shared nav model for the mobile bottom bar AND the desktop sidebar,
 * so the two can never drift. Mode-aware: Grades vs Study shows a
 * different tab set; active-state logic keeps a section-root tab lit
 * on its sub-pages.
 */

export interface MobileNavItem {
  href: string
  icon: React.ElementType
  label: string
  /** Section-root tab: stays active on sub-pages unless a sibling claims the path. */
  matchExact?: boolean
  /** Extra path prefixes this tab owns, for content that lives on a
   *  different route than the tab href (e.g. the Review tab renders the
   *  wrong-notebook, which also has a /print sub-route). */
  matchPrefixes?: string[]
}

export function useMobileNav() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()

  // Study-only students (no academy membership) have exactly one
  // mode — never show them the Grades tab set, regardless of path or
  // stored preference. StudyOnlyGuard redirects them off academy
  // routes; this keeps the nav from flashing grades in the meantime.
  const studyOnly = user?.role === 'student' && user.academyIds.length === 0

  const [resolved, setResolved] = useState<'grades' | 'study'>('grades')
  useEffect(() => {
    const explicit = modeForPath(pathname)
    if (explicit) storeMode(explicit)
    setResolved(resolveMode(pathname))
  }, [pathname])
  const mode: 'grades' | 'study' = studyOnly ? 'study' : resolved
  const inStudy = mode === 'study'

  const gradesNav: MobileNavItem[] = [
    { href: '/mobile', icon: Home, label: String(t('mobile.navigation.home')), matchExact: true },
    { href: '/mobile/assignments', icon: ClipboardList, label: String(t('mobile.navigation.assignments')) },
    { href: '/mobile/reports', icon: FileText, label: String(t('mobile.navigation.reports')) },
    { href: '/mobile/profile', icon: User, label: String(t('mobile.navigation.profile')) },
  ]

  const studyNav: MobileNavItem[] = [
    { href: '/mobile/study', icon: BookOpen, label: String(t('mobile.navigation.study')), matchExact: true },
    // Path is the core mascot-led loop — give it a permanent tab (it
    // replaces Snap, which links to a "coming soon" page).
    { href: '/mobile/study/path', icon: Route, label: String(t('mobile.navigation.path')) },
    { href: '/mobile/study/review', icon: Shuffle, label: String(t('mobile.navigation.review')), matchPrefixes: ['/mobile/study/wrong-notebook'] },
    { href: '/mobile/study/league', icon: Trophy, label: String(t('mobile.navigation.league')) },
    { href: '/mobile/profile', icon: User, label: String(t('mobile.navigation.profile')) },
  ]

  const navItems = inStudy ? studyNav : gradesNav

  // A tab "claims" the current path if the path is (or is under) its
  // href or any of its extra owned prefixes.
  const claims = (n: MobileNavItem) =>
    pathname === n.href ||
    pathname.startsWith(`${n.href}/`) ||
    (n.matchPrefixes ?? []).some(p => pathname === p || pathname.startsWith(`${p}/`))

  const isActive = (href: string) => {
    const item = navItems.find(n => n.href === href)
    if (!item) return false
    if (item.matchExact) {
      if (pathname === href) return true
      // Section-root stays lit on its own sub-pages, but yields to any
      // sibling that claims the path (via its href or owned prefixes).
      return pathname.startsWith(`${href}/`) &&
        !navItems.some(n => n.href !== href && claims(n))
    }
    return claims(item)
  }

  // Focus mode — hide nav inside an active study session (the session
  // UI is full-screen). Reappears on the summary.
  const inSession = pathname.startsWith('/mobile/study/session/') &&
    !pathname.endsWith('/summary')

  return { mode, inStudy, navItems, isActive, inSession }
}
