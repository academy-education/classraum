"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, FileText, User, BookOpen, Camera, Shuffle, Trophy } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { hapticTap } from '@/lib/nativeHaptics'
import { resolveMode, storeMode, modeForPath } from '@/lib/study/currentMode'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  /** Optional matcher override for active state — defaults to `pathname.startsWith(href)`. */
  matchExact?: boolean
}

/**
 * Mode-aware bottom navigation.
 *
 * The tab set switches based on which top-level mode the student is
 * in (Grades vs Study). Grades mode keeps the original Home /
 * Assignments / Reports / Profile set; Study mode shows the surfaces
 * unique to the learning loop: Study home, Snap, Review, League, and
 * the shared Profile.
 *
 * Focus mode (auto-hide on /mobile/study/session/*) stays — the
 * session UI is full-screen interactive.
 */
export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()

  // Mode-aware nav. Pathname wins when explicit (study/*); shared
  // routes (profile, messages, notifications) use the stored
  // preference so tapping "프로필" from study mode stays in study.
  const [mode, setMode] = useState<'grades' | 'study'>('grades')
  useEffect(() => {
    const explicit = modeForPath(pathname)
    if (explicit) storeMode(explicit)
    setMode(resolveMode(pathname))
  }, [pathname])
  const inStudy = mode === 'study'

  const gradesNav: NavItem[] = [
    { href: '/mobile', icon: Home, label: String(t('mobile.navigation.home')), matchExact: true },
    { href: '/mobile/assignments', icon: ClipboardList, label: String(t('mobile.navigation.assignments')) },
    { href: '/mobile/reports', icon: FileText, label: String(t('mobile.navigation.reports')) },
    { href: '/mobile/profile', icon: User, label: String(t('mobile.navigation.profile')) },
  ]

  const studyNav: NavItem[] = [
    { href: '/mobile/study', icon: BookOpen, label: String(t('mobile.navigation.study')), matchExact: true },
    { href: '/mobile/study/snap', icon: Camera, label: String(t('mobile.navigation.snap')) },
    { href: '/mobile/study/review', icon: Shuffle, label: String(t('mobile.navigation.review')) },
    { href: '/mobile/study/league', icon: Trophy, label: String(t('mobile.navigation.league')) },
    { href: '/mobile/profile', icon: User, label: String(t('mobile.navigation.profile')) },
  ]

  const navItems = inStudy ? studyNav : gradesNav

  const handleNavigation = (href: string) => {
    if (!isActive(href)) hapticTap()
    router.push(href)
  }

  const isActive = (href: string) => {
    const item = navItems.find(n => n.href === href)
    if (item?.matchExact) return pathname === href
    return pathname.startsWith(href)
  }

  // Focus mode — hide bottom nav inside an active study session so
  // the session UI gets the full screen. Reappears on the summary.
  const inSession = pathname.startsWith('/mobile/study/session/') &&
    !pathname.endsWith('/summary')

  if (inSession) return null

  return (
    <nav
      className="flex-shrink-0 bg-white shadow-[0_-1px_0_rgba(0,0,0,0.04)] z-50"
      style={{ touchAction: 'none' }}
    >
      <div className="flex items-center justify-around h-[72px] px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className="flex flex-col items-center gap-1 flex-1 py-1.5 px-2 transition-transform active:scale-95 focus:outline-none"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-7 rounded-full transition-colors",
                  active ? "bg-primary/10" : ""
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-primary" : "text-gray-500"
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-tight transition-colors truncate max-w-full",
                  active ? "text-primary" : "text-gray-500"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
