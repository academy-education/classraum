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
      className="flex-shrink-0 px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50"
      style={{ touchAction: 'none' }}
    >
      {/* Floating, rounded bar — friendlier than a flat edge-to-edge strip.
          The active tab lifts into a filled circle for a clear, playful anchor. */}
      <div className="relative flex items-stretch justify-around h-[64px] rounded-[26px] bg-white/95 backdrop-blur-sm ring-1 ring-gray-200/70 shadow-[0_2px_6px_rgba(0,0,0,0.05),0_16px_32px_-14px_rgba(40,133,232,0.28)]">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 focus:outline-none"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-300",
                  active
                    ? "w-12 h-12 -translate-y-3 bg-primary text-white ring-4 ring-white shadow-[0_8px_18px_-6px_rgba(40,133,232,0.55)]"
                    : "w-11 h-8 text-gray-500 group-active:scale-90"
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-tight transition-colors truncate max-w-full",
                  active ? "-mt-2 text-primary" : "text-gray-500"
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
