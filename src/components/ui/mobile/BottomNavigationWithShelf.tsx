"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  ClipboardList,
  FileText,
  User,
  Calendar,
  Receipt,
  GraduationCap,
  BarChart,
  Settings,
  Bell,
  MessageSquare,
  HelpCircle,
  X
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

interface SubMenuItem {
  id: string
  href: string
  icon: React.ElementType
  labelKey: string
}

interface NavItemWithShelf {
  id: string
  href: string
  icon: React.ElementType
  labelKey: string
  subItems?: SubMenuItem[]
}

export function BottomNavigationWithShelf() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [activeShelf, setActiveShelf] = useState<string | null>(null)
  const shelfRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  // Define navigation items with their sub-menus
  const navItems: NavItemWithShelf[] = [
    {
      id: 'home',
      href: '/mobile',
      icon: Home,
      labelKey: 'mobile.navigation.home',
      subItems: [
        { id: 'dashboard', href: '/mobile', icon: Home, labelKey: 'mobile.shelf.dashboard' },
        { id: 'schedule', href: '/mobile/schedule', icon: Calendar, labelKey: 'mobile.shelf.schedule' },
        { id: 'invoices', href: '/mobile/invoices', icon: Receipt, labelKey: 'mobile.shelf.invoices' }
      ]
    },
    {
      id: 'assignments',
      href: '/mobile/assignments',
      icon: ClipboardList,
      labelKey: 'mobile.navigation.assignments',
      subItems: [
        { id: 'assignments', href: '/mobile/assignments', icon: ClipboardList, labelKey: 'mobile.shelf.assignments' },
        { id: 'grades', href: '/mobile/assignments?tab=grades', icon: GraduationCap, labelKey: 'mobile.shelf.grades' }
      ]
    },
    {
      id: 'reports',
      href: '/mobile/reports',
      icon: FileText,
      labelKey: 'mobile.navigation.reports',
      subItems: [
        { id: 'reports', href: '/mobile/reports', icon: FileText, labelKey: 'mobile.shelf.reports' },
        { id: 'performance', href: '/mobile/reports?view=performance', icon: BarChart, labelKey: 'mobile.shelf.performance' }
      ]
    },
    {
      id: 'profile',
      href: '/mobile/profile',
      icon: User,
      labelKey: 'mobile.navigation.profile',
      subItems: [
        { id: 'profile', href: '/mobile/profile', icon: User, labelKey: 'mobile.shelf.profile' },
        { id: 'messages', href: '/mobile/messages', icon: MessageSquare, labelKey: 'mobile.shelf.messages' },
        { id: 'notifications', href: '/mobile/notifications', icon: Bell, labelKey: 'mobile.shelf.notifications' },
        { id: 'settings', href: '/mobile/profile?tab=settings', icon: Settings, labelKey: 'mobile.shelf.settings' }
      ]
    }
  ]

  // Close shelf when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (
        activeShelf &&
        shelfRef.current &&
        navRef.current &&
        !shelfRef.current.contains(target) &&
        !navRef.current.contains(target)
      ) {
        setActiveShelf(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [activeShelf])

  // Close shelf on route change
  useEffect(() => {
    setActiveShelf(null)
  }, [pathname])

  const handleNavClick = useCallback((item: NavItemWithShelf) => {
    if (item.subItems && item.subItems.length > 0) {
      // Toggle shelf
      setActiveShelf(activeShelf === item.id ? null : item.id)
    } else {
      // Navigate directly
      router.push(item.href)
      setActiveShelf(null)
    }
  }, [activeShelf, router])

  const handleSubItemClick = useCallback((href: string) => {
    router.push(href)
    setActiveShelf(null)
  }, [router])

  const isActive = (href: string) => {
    if (href === '/mobile') {
      return pathname === '/mobile'
    }
    // Handle query params
    const [path] = href.split('?')
    return pathname.startsWith(path)
  }

  const isNavActive = (item: NavItemWithShelf) => {
    // Check if main href is active
    if (isActive(item.href)) return true
    // Check if any sub-item is active
    if (item.subItems) {
      return item.subItems.some(sub => isActive(sub.href))
    }
    return false
  }

  const activeItem = navItems.find(item => item.id === activeShelf)

  return (
    <>
      {/* Overlay */}
      {activeShelf && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200"
          onClick={() => setActiveShelf(null)}
        />
      )}

      {/* Shelf Panel */}
      <div
        ref={shelfRef}
        className={cn(
          "fixed left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-all duration-300 ease-out safe-area-bottom",
          activeShelf ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ bottom: '64px' }} // Height of bottom nav
      >
        {activeItem && activeItem.subItems && (
          <div className="px-4 pt-4 pb-2">
            {/* Shelf Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {String(t(activeItem.labelKey))}
              </h3>
              <button
                onClick={() => setActiveShelf(null)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Sub-menu Grid */}
            <div className="grid grid-cols-3 gap-2">
              {activeItem.subItems.map((subItem) => {
                const SubIcon = subItem.icon
                const subActive = isActive(subItem.href)

                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubItemClick(subItem.href)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl transition-all",
                      "hover:bg-gray-50 active:scale-95",
                      subActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600"
                    )}
                  >
                    <SubIcon className={cn(
                      "w-6 h-6 mb-2",
                      subActive ? "text-primary" : "text-gray-500"
                    )} />
                    <span className={cn(
                      "text-xs font-medium text-center",
                      subActive ? "text-primary" : "text-gray-600"
                    )}>
                      {String(t(subItem.labelKey))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Handle indicator */}
        <div className="flex justify-center pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom"
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isNavActive(item)
            const isShelfOpen = activeShelf === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full px-2 py-2 transition-all",
                  "hover:bg-gray-50 active:bg-gray-100",
                  "focus:outline-none",
                  isShelfOpen && "bg-gray-50"
                )}
                aria-label={String(t(item.labelKey))}
                aria-expanded={isShelfOpen}
                aria-current={active && !isShelfOpen ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "w-5 h-5 mb-1 transition-all",
                      active || isShelfOpen ? "text-primary" : "text-gray-500",
                      isShelfOpen && "transform scale-110"
                    )}
                  />
                  {/* Chevron indicator for items with sub-menus */}
                  {item.subItems && item.subItems.length > 0 && (
                    <div
                      className={cn(
                        "absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full transition-colors",
                        isShelfOpen ? "bg-primary" : "bg-gray-300"
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    active || isShelfOpen ? "text-primary" : "text-gray-500"
                  )}
                >
                  {String(t(item.labelKey))}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
