"use client"

import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, FileText, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { hapticTap } from '@/lib/nativeHaptics'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

export function BottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()

  const navItems: NavItem[] = [
    {
      href: '/mobile',
      icon: Home,
      label: String(t('mobile.navigation.home'))
    },
    {
      href: '/mobile/assignments',
      icon: ClipboardList,
      label: String(t('mobile.navigation.assignments'))
    },
    {
      href: '/mobile/reports',
      icon: FileText,
      label: String(t('mobile.navigation.reports'))
    },
    {
      href: '/mobile/profile',
      icon: User,
      label: String(t('mobile.navigation.profile'))
    }
  ]

  const handleNavigation = (href: string) => {
    // Suppress haptic when tapping the already-active tab — no navigation, no feedback
    if (!isActive(href)) hapticTap()
    router.push(href)
  }

  const isActive = (href: string) => {
    if (href === '/mobile') {
      return pathname === '/mobile'
    }
    return pathname.startsWith(href)
  }

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
              className="flex flex-col items-center gap-1 flex-1 py-1.5 px-3 transition-transform active:scale-95 focus:outline-none"
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
                  "text-[10px] font-semibold tracking-tight transition-colors",
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