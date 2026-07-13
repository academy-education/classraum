"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { hapticTap } from '@/lib/nativeHaptics'
import { useMobileNav } from './useMobileNav'

/**
 * Mode-aware bottom navigation (mobile / narrow screens only — hidden
 * at lg where the desktop StudySidebar takes over).
 *
 * The tab set switches based on which top-level mode the student is
 * in (Grades vs Study). Nav model + active logic live in useMobileNav
 * so the sidebar can't drift from this bar.
 *
 * Focus mode (auto-hide on /mobile/study/session/*) stays — the
 * session UI is full-screen interactive.
 */
export function BottomNavigation() {
  const router = useRouter()
  const { mode, navItems, isActive, inSession } = useMobileNav()

  const handleNavigation = (href: string) => {
    if (!isActive(href)) hapticTap()
    router.push(href)
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

  if (inSession) return null

  return (
    // No env(safe-area-inset-bottom) padding here: the mobile layout's
    // app container already stops at var(--safe-area-bottom) (a white
    // spacer fills the gap below), so adding the inset again floated
    // the bar ~34px+ above the bottom on native builds.
    // Hidden at lg — the desktop sidebar takes over there.
    <nav
      className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-1 z-50 lg:hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Flat hairline-top bar; the only ornament is the pill gliding
          between tabs with a gentle ease-out — clean at rest, alive on
          every switch. */}
      <div className="relative flex items-stretch justify-around h-[52px] max-w-3xl mx-auto px-2">
        {pill && (
          <span
            aria-hidden
            className="absolute top-1/2 -translate-y-1/2 h-[40px] rounded-2xl bg-primary/[0.08]"
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
