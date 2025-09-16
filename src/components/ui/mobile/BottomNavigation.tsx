"use client"

import { usePathname, useRouter } from 'next/navigation'
import { Home, ClipboardList, FileText, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

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
      label: t('mobile.navigation.home')
    },
    {
      href: '/mobile/assignments',
      icon: ClipboardList,
      label: t('mobile.navigation.assignments')
    },
    {
      href: '/mobile/reports',
      icon: FileText,
      label: t('mobile.navigation.reports')
    },
    {
      href: '/mobile/profile',
      icon: User,
      label: t('mobile.navigation.profile')
    }
  ]

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  const isActive = (href: string) => {
    if (href === '/mobile') {
      return pathname === '/mobile'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 py-2 transition-colors",
                "hover:bg-gray-50 active:bg-gray-100",
                "focus:outline-none"
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mb-1 transition-colors",
                  active ? "text-primary" : "text-gray-500"
                )}
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
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