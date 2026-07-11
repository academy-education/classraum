"use client"

import { useEffect, useRef, useState } from 'react'
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
    if (item?.matchExact) {
      if (pathname === href) return true
      // Section-root tabs stay lit on their sub-pages (topic, journey,
      // stats, ...) as long as no sibling tab claims the path — a bar
      // with nothing highlighted reads as broken.
      return pathname.startsWith(`${href}/`) &&
        !navItems.some(n => n.href !== href && pathname.startsWith(n.href))
    }
    return pathname.startsWith(href)
  }

  // Sliding active pill: measure the active tab's button and glide a
  // soft tinted pill under it. The measurement lives in state so the
  // pill animates with a plain CSS transition — no animation library.
  const activeIndex = navItems.findIndex(n => isActive(n.href))
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null)
  const measuredOnce = useRef(false)
  useEffect(() => {
    const measure = () => {
      const el = activeIndex >= 0 ? btnRefs.current[activeIndex] : null
      if (!el) { setPill(null); return }
      // Inset the pill from the tab's edges so neighbours get air.
      const inset = Math.max(6, (el.offsetWidth - 64) / 2)
      setPill({ left: el.offsetLeft + inset, width: el.offsetWidth - inset * 2 })
      measuredOnce.current = true
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex, mode])

  // Focus mode — hide bottom nav inside an active study session so
  // the session UI gets the full screen. Reappears on the summary.
  const inSession = pathname.startsWith('/mobile/study/session/') &&
    !pathname.endsWith('/summary')

  if (inSession) return null

  return (
    <nav
      className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-[max(0.25rem,env(safe-area-inset-bottom))] z-50"
      style={{ touchAction: 'none' }}
    >
      {/* Flat hairline-top bar; the only ornament is the pill gliding
          between tabs with a gentle ease-out — clean at rest, alive on
          every switch. */}
      <div className="relative flex items-stretch justify-around h-[56px] max-w-3xl mx-auto px-2">
        {pill && (
          <span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 h-[44px] rounded-2xl bg-primary/[0.08]"
            style={{
              left: pill.left,
              width: pill.width,
              transition: measuredOnce.current
                ? 'left 350ms cubic-bezier(0.22,1,0.36,1), width 350ms cubic-bezier(0.22,1,0.36,1)'
                : undefined,
            }}
          />
        )}
        {navItems.map((item, i) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              ref={el => { btnRefs.current[i] = el }}
              onClick={() => handleNavigation(item.href)}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1 px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  "w-[22px] h-[22px] transition-all duration-300 ease-out group-active:scale-90",
                  active ? "text-primary scale-105" : "text-gray-400"
                )}
                strokeWidth={active ? 2.3 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] tracking-tight transition-colors duration-300 truncate max-w-full leading-none",
                  active ? "text-primary font-semibold" : "text-gray-400 font-medium"
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
