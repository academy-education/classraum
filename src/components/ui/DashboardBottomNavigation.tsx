"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  School,
  Calendar,
  ClipboardList,
  ClipboardCheck,
  UserCheck,
  BarChart,
  CreditCard,
  GraduationCap,
  Home as FamilyIcon,
  UserPlus,
  BookOpen,
  Archive,
  Settings,
  LayoutGrid,
  Users,
  MoreHorizontal,
  X,
  Megaphone,
  LogOut
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

interface SubMenuItem {
  id: string
  href: string
  icon: React.ElementType
  labelKey: string
  badge?: number
}

interface NavItemWithShelf {
  id: string
  icon: React.ElementType
  labelKey: string
  subItems: SubMenuItem[]
}

interface DashboardBottomNavigationProps {
  userRole?: string | null
}

export function DashboardBottomNavigation({ userRole }: DashboardBottomNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useTranslation()
  const [activeShelf, setActiveShelf] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const shelfRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()

      // Clear storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      router.push('/auth')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
      setActiveShelf(null)
    }
  }, [router])

  // Define navigation items with their sub-menus
  const getNavItems = (): NavItemWithShelf[] => {
    const items: NavItemWithShelf[] = [
      {
        id: 'home',
        icon: Home,
        labelKey: 'dashboard.shelf.home',
        subItems: [
          { id: 'dashboard', href: '/dashboard', icon: Home, labelKey: 'navigation.dashboard' }
        ]
      },
      {
        id: 'classes',
        icon: LayoutGrid,
        labelKey: 'dashboard.shelf.classes',
        subItems: [
          { id: 'classrooms', href: '/classrooms', icon: School, labelKey: 'navigation.classrooms' },
          { id: 'sessions', href: '/sessions', icon: Calendar, labelKey: 'navigation.sessions' },
          { id: 'attendance', href: '/attendance', icon: UserCheck, labelKey: 'navigation.attendance' },
          { id: 'assignments', href: '/assignments', icon: ClipboardList, labelKey: 'navigation.assignments' },
          { id: 'announcements', href: '/announcements', icon: Megaphone, labelKey: 'navigation.announcements' }
        ]
      },
      {
        id: 'admin',
        icon: ClipboardCheck,
        labelKey: 'dashboard.shelf.admin',
        subItems: [
          { id: 'reports', href: '/reports', icon: BarChart, labelKey: 'navigation.reports' },
          ...(userRole !== 'teacher' ? [{ id: 'payments', href: '/payments', icon: CreditCard, labelKey: 'navigation.payments' }] : [])
        ]
      },
      {
        id: 'people',
        icon: Users,
        labelKey: 'dashboard.shelf.people',
        subItems: [
          { id: 'teachers', href: '/teachers', icon: GraduationCap, labelKey: 'navigation.teachers' },
          { id: 'families', href: '/families', icon: FamilyIcon, labelKey: 'navigation.families' },
          { id: 'parents', href: '/parents', icon: UserPlus, labelKey: 'navigation.parents' },
          { id: 'students', href: '/students', icon: BookOpen, labelKey: 'navigation.students' }
        ]
      },
      {
        id: 'more',
        icon: MoreHorizontal,
        labelKey: 'dashboard.shelf.more',
        subItems: [
          { id: 'archive', href: '/archive', icon: Archive, labelKey: 'navigation.archive' },
          { id: 'subscription', href: '/settings/subscription', icon: CreditCard, labelKey: 'navigation.subscription' },
          { id: 'settings', href: '/settings', icon: Settings, labelKey: 'navigation.settings' },
          { id: 'logout', href: '#logout', icon: LogOut, labelKey: 'common.signOut' }
        ]
      }
    ]

    // Filter out dashboard for teachers
    if (userRole === 'teacher') {
      items[0].subItems = items[0].subItems.filter(item => item.id !== 'dashboard')
      // If home shelf is empty after filtering, remove it or add a default
      if (items[0].subItems.length === 0) {
        items[0].subItems = [
          { id: 'classrooms', href: '/classrooms', icon: School, labelKey: 'navigation.classrooms' }
        ]
      }
    }

    return items
  }

  const navItems = getNavItems()

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
    if (item.subItems.length === 1) {
      // Navigate directly if only one sub-item
      router.push(item.subItems[0].href)
      setActiveShelf(null)
    } else {
      // Toggle shelf
      setActiveShelf(activeShelf === item.id ? null : item.id)
    }
  }, [activeShelf, router])

  const handleSubItemClick = useCallback((href: string) => {
    if (href === '#logout') {
      handleLogout()
      return
    }
    router.push(href)
    setActiveShelf(null)
  }, [router, handleLogout])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const isNavActive = (item: NavItemWithShelf) => {
    return item.subItems.some(sub => isActive(sub.href))
  }

  const activeItem = navItems.find(item => item.id === activeShelf)

  // Calculate grid columns based on number of sub-items
  const getGridCols = (count: number) => {
    if (count <= 2) return 'grid-cols-2'
    if (count <= 3) return 'grid-cols-3'
    return 'grid-cols-4'
  }

  return (
    <>
      {/* Overlay */}
      {activeShelf && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 lg:hidden"
          onClick={() => setActiveShelf(null)}
        />
      )}

      {/* Container for nav and shelf - relative positioning for shelf */}
      <div className="relative flex-shrink-0 lg:hidden" style={{ touchAction: 'none' }}>
        {/* Shelf Panel - positioned above the nav */}
        <div
          ref={shelfRef}
          className={cn(
            "absolute left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-all duration-300 ease-out",
            activeShelf ? "translate-y-0" : "translate-y-full pointer-events-none"
          )}
          style={{ bottom: '100%' }}
        >
          {activeItem && (
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
              <div className={cn("grid gap-2", getGridCols(activeItem.subItems.length))}>
                {activeItem.subItems.map((subItem) => {
                  const SubIcon = subItem.icon
                  const subActive = isActive(subItem.href)
                  const hasBadge = subItem.badge && subItem.badge > 0
                  const isLogout = subItem.id === 'logout'

                  return (
                    <button
                      key={subItem.id}
                      onClick={() => handleSubItemClick(subItem.href)}
                      disabled={isLogout && loggingOut}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl transition-all",
                        "hover:bg-gray-50 active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        subActive
                          ? "bg-primary/10 text-primary"
                          : isLogout
                          ? "text-red-600 hover:bg-red-50"
                          : "text-gray-600"
                      )}
                    >
                      <div className="relative">
                        <SubIcon className={cn(
                          "w-6 h-6 mb-2",
                          subActive ? "text-primary" : isLogout ? "text-red-500" : "text-gray-500",
                          isLogout && loggingOut && "animate-pulse"
                        )} />
                        {hasBadge && (
                          <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center px-1">
                            {subItem.badge! > 9 ? '9+' : subItem.badge}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium text-center",
                        subActive ? "text-primary" : isLogout ? "text-red-600" : "text-gray-600"
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
          className="bg-white border-t border-gray-200 z-50"
        >
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isNavActive(item)
              const isShelfOpen = activeShelf === item.id

              // Check if any sub-item has a badge
              const totalBadge = item.subItems.reduce((sum, sub) => sum + (sub.badge || 0), 0)

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
                    {/* Badge for items with notifications */}
                    {totalBadge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] bg-primary text-white text-[10px] rounded-full flex items-center justify-center px-1">
                        {totalBadge > 9 ? '9+' : totalBadge}
                      </span>
                    )}
                    {/* Dot indicator for items with multiple sub-menus */}
                    {item.subItems.length > 1 && !totalBadge && (
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
      </div>
    </>
  )
}
