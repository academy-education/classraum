"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useTranslation } from "@/hooks/useTranslation"
import { useAuth } from "@/contexts/AuthContext"
import Image from "next/image"
import {
  Home,
  Settings,
  HelpCircle,
  LogOut,
  School,
  Calendar,
  ClipboardList,
  UserCheck,
  BarChart,
  GraduationCap,
  Home as FamilyIcon,
  UserPlus,
  BookOpen,
  CreditCard,
  Zap,
  Archive,
  Megaphone
} from "lucide-react"

interface SidebarProps {
  activeItem?: string
  userName?: string
  onHelpClick?: () => void
  academyLogo?: string | null
}

const getNavigationItems = (t: (key: string) => string | string[]) => [
  { id: "dashboard", label: String(t("navigation.dashboard")), icon: Home },
  { id: "classrooms", label: String(t("navigation.classrooms")), icon: School },
  { id: "sessions", label: String(t("navigation.sessions")), icon: Calendar },
  { id: "assignments", label: String(t("navigation.assignments")), icon: ClipboardList },
  { id: "attendance", label: String(t("navigation.attendance")), icon: UserCheck },
  { id: "announcements", label: String(t("navigation.announcements")), icon: Megaphone },
  { id: "reports", label: String(t("navigation.reports")), icon: BarChart },
  { id: "payments", label: String(t("navigation.payments")), icon: CreditCard }
]

const getContactsItems = (t: (key: string) => string | string[]) => [
  { id: "teachers", label: String(t("navigation.teachers")), icon: GraduationCap },
  { id: "families", label: String(t("navigation.families")), icon: FamilyIcon },
  { id: "parents", label: String(t("navigation.parents")), icon: UserPlus },
  { id: "students", label: String(t("navigation.students")), icon: BookOpen }
]

const getArchiveItem = (t: (key: string) => string | string[]) => ({
  id: "archive", 
  label: String(t("navigation.archive")), 
  icon: Archive
})

const getBottomItems = (t: (key: string) => string | string[]) => [
  { id: "settings", label: String(t("navigation.settings")), icon: Settings, submenu: [
    { id: "settings", label: String(t("navigation.generalSettings")), path: "/settings" },
    { id: "subscription", label: String(t("navigation.subscriptionManagement")), path: "/settings/subscription" }
  ]},
  { id: "help", label: String(t("navigation.getHelp")), icon: HelpCircle },
  { id: "upgrade", label: String(t("navigation.upgradeNow")), icon: Zap, highlight: true }
]

export function Sidebar({ activeItem, userName, onHelpClick, academyLogo }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const { t } = useTranslation()
  const { user } = useAuth()

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setUserRole(null)
        return
      }

      try {
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          console.error('Error fetching user role:', error)
          setUserRole(null)
        } else {
          setUserRole(userInfo.role)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole(null)
      }
    }

    fetchUserRole()
  }, [user])

  // Determine active item from pathname if not provided
  const currentActiveItem = activeItem || pathname.split('/')[1] || 'dashboard'

  // Filter navigation items based on user role
  const allNavigationItems = getNavigationItems(t)
  const navigationItems = allNavigationItems.filter(item => {
    // While loading, don't show items that might be hidden for teachers to prevent flash
    if (userRole === null) {
      // Optimistically hide items that would be hidden for teachers during loading
      if (item.id === 'dashboard' || item.id === 'payments') {
        return false
      }
    }
    // Hide dashboard and payments for teachers
    if (userRole === 'teacher' && (item.id === 'dashboard' || item.id === 'payments')) {
      return false
    }
    return true
  })

  const contactsItems = getContactsItems(t)
  const archiveItem = getArchiveItem(t)

  // Filter bottom items based on role
  const allBottomItems = getBottomItems(t)
  const bottomItems = allBottomItems
    .filter(item => {
      // While loading, hide upgrade to prevent flash for teachers
      if (userRole === null && item.id === 'upgrade') {
        return false
      }
      // Hide upgrade for teachers
      if (userRole === 'teacher' && item.id === 'upgrade') {
        return false
      }
      return true
    })
    .map(item => {
      // Remove subscription submenu for teachers in settings
      if ((userRole === 'teacher' || userRole === null) && item.id === 'settings' && item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter((subItem: any) => subItem.id !== 'subscription')
        }
      }
      return item
    })

  const handleLogout = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }

      // Force clear localStorage and sessionStorage to ensure complete logout
      if (typeof window !== 'undefined') {
        // Clear all Supabase auth keys from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })

        // Clear all cached data from sessionStorage to prevent stale data on next login
        sessionStorage.clear()
      }

      // Wait a moment for auth state to propagate
      setTimeout(() => {
        router.push('/auth')
        setLoading(false)
      }, 100)
    } catch (error) {
      console.error('Logout failed:', error)
      setLoading(false)
    }
  }

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Company Header */}
      <div className="px-5 py-3 h-[57px] flex items-center border-b border-gray-100">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push(userRole === 'teacher' ? '/classrooms' : '/dashboard')}
        >
          {academyLogo ? (
            <img
              src={academyLogo}
              alt="Academy Logo"
              className="h-7 w-auto max-w-[160px] object-contain"
            />
          ) : (
            <Image
              src="/text_logo.png"
              alt="Classraum Logo"
              width={112}
              height={36}
              className="h-7 w-auto"
              priority
              quality={100}
              style={{
                maxWidth: '100%',
                height: 'auto',
              }}
            />
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2 flex flex-col">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = currentActiveItem === item.id

            return (
              <button
                key={item.id}
                onClick={() => router.push(`/${item.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contacts Section */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t("navigation.contacts")}
          </h3>
          <div className="space-y-1">
            {contactsItems.map((item) => {
              const Icon = item.icon
              const isActive = currentActiveItem === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/${item.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Spacer to push archive to bottom */}
        <div className="flex-grow"></div>

        {/* Archive Section - aligned to bottom of nav area */}
        <div className="mb-4">
          <div className="space-y-1">
            <button
              onClick={() => router.push(`/${archiveItem.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                currentActiveItem === archiveItem.id 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{archiveItem.label}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="space-y-1">
          {bottomItems.map((item: any) => {
            const Icon = item.icon
            const isActive = currentActiveItem === item.id || pathname.startsWith(`/${item.id}`)
            const isHighlight = item.highlight
            const hasSubmenu = item.submenu && item.submenu.length > 0
            const isExpanded = expandedMenu === item.id || pathname.startsWith(`/${item.id}`)

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasSubmenu) {
                      setExpandedMenu(isExpanded ? null : item.id)
                    } else if (item.id === 'help') {
                      onHelpClick?.()
                    } else if (item.id === 'upgrade') {
                      router.push('/upgrade')
                    } else {
                      router.push(`/${item.id}`)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm font-medium ${
                    isHighlight
                      ? "bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white hover:shadow-lg hover:scale-105 hover:shadow-cyan-500/25 transform"
                      : isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                  {hasSubmenu && (
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {hasSubmenu && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subItem: any) => (
                      <button
                        key={subItem.id}
                        onClick={() => router.push(subItem.path)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                          pathname === subItem.path
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>

        {/* User Section - always render to prevent layout shift */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            {userName ? (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={loading ? String(t("common.loading")) : String(t("common.signOut"))}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {/* Skeleton while loading */}
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                </div>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}