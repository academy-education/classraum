"use client"

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useMobileNav } from './useMobileNav'

/**
 * Desktop navigation rail for the /mobile shell — shown only at lg+,
 * where the bottom bar is hidden. Same nav model as BottomNavigation
 * (via useMobileNav) so the two never drift. A vertical list of
 * icon+label rows with a soft active pill, sized to sit beside the
 * scrolling content column.
 */
export function StudySidebar() {
  const router = useRouter()
  const { navItems, isActive, inSession } = useMobileNav()

  // Match the bottom bar's focus-mode hide so a full-screen session
  // isn't flanked by the rail either.
  if (inSession) return null

  return (
    <nav
      aria-label="Study navigation"
      className="hidden lg:flex flex-shrink-0 w-56 xl:w-60 flex-col gap-1 border-r border-gray-100 bg-white/80 px-3 py-5 overflow-y-auto"
    >
      {navItems.map(item => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => { if (!active) router.push(item.href) }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 h-11 text-[14px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary/[0.08] text-primary'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            )}
          >
            <Icon
              className={cn('w-5 h-5 transition-transform group-active:scale-90', active ? 'scale-105' : '')}
              strokeWidth={active ? 2.3 : 1.9}
            />
            <span className="truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
