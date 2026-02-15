"use client"

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'
import { AuthWrapper } from '@/components/ui/auth-wrapper'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { Sidebar } from '@/components/ui/sidebar'
import { DashboardBottomNavigation } from '@/components/ui/DashboardBottomNavigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { ChatWidget } from '@/components/ui/chat-widget'
import {
  Bell,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { LayoutErrorBoundary } from '@/components/ui/error-boundary'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNativeApp } from '@/hooks/useNativeApp'
import { useTranslation } from '@/hooks/useTranslation'

export default function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { userId, userName, user } = useAuth()
  const { t } = useTranslation()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [academyLogo, setAcademyLogo] = useState<string | null>(null)

  // Pull-to-refresh state (mobile only)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Pull-to-refresh handler
  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    try {
      router.refresh()
      // Dispatch event so page components can refresh their own data
      window.dispatchEvent(new CustomEvent('dashboardPullRefresh'))
    } catch (error) {
      console.error('Error refreshing:', error)
    } finally {
      setTimeout(() => setIsRefreshing(false), 800)
    }
  }, [router])

  // Pull-to-refresh touch listeners (mobile only)
  useEffect(() => {
    if (!isMobile) return

    const element = scrollRef.current
    if (!element) return

    const touchStartHandler = (e: TouchEvent) => {
      if (element.scrollTop === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY
      }
    }

    const touchMoveHandler = (e: TouchEvent) => {
      if (element.scrollTop === 0 && !isRefreshing && startY.current > 0) {
        const currentY = e.touches[0].clientY
        const diff = currentY - startY.current

        if (diff > 0) {
          if (diff > 10) {
            e.preventDefault()
          }
          setPullDistance(Math.min(diff, 100))
        }
      }
    }

    const touchEndHandler = () => {
      if (pullDistance > 80 && !isRefreshing) {
        handlePullRefresh()
      } else {
        setPullDistance(0)
      }
      startY.current = 0
    }

    element.addEventListener('touchstart', touchStartHandler, { passive: true })
    element.addEventListener('touchmove', touchMoveHandler, { passive: false })
    element.addEventListener('touchend', touchEndHandler, { passive: true })

    return () => {
      element.removeEventListener('touchstart', touchStartHandler)
      element.removeEventListener('touchmove', touchMoveHandler)
      element.removeEventListener('touchend', touchEndHandler)
    }
  }, [isMobile, pullDistance, isRefreshing, handlePullRefresh])

  // Fetch user role and academy logo
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setUserRole(null)
        setAcademyLogo(null)
        return
      }

      try {
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          setUserRole(null)
          setAcademyLogo(null)
        } else {
          setUserRole(userInfo.role)

          // Fetch academy_id from managers table for managers
          if (userInfo.role === 'manager') {
            const { data: managerData } = await supabase
              .from('managers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (managerData?.academy_id) {
              const { data: academyData } = await supabase
                .from('academies')
                .select('logo_url')
                .eq('id', managerData.academy_id)
                .single()

              setAcademyLogo(academyData?.logo_url || null)
            }
          } else if (userInfo.role === 'teacher') {
            // Teachers also belong to an academy
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (teacherData?.academy_id) {
              const { data: academyData } = await supabase
                .from('academies')
                .select('logo_url')
                .eq('id', teacherData.academy_id)
                .single()

              setAcademyLogo(academyData?.logo_url || null)
            }
          }
        }
      } catch (error) {
        setUserRole(null)
        setAcademyLogo(null)
      }
    }

    fetchUserData()
  }, [user])

  // Initialize sidebar visibility based on screen size
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 // lg breakpoint
    }
    return true
  })
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [showChatWidget, setShowChatWidget] = useState(false)
  const bellButtonRef = useRef<HTMLButtonElement | null>(null)

  const { unreadCount } = useNotifications(userId)
  const { unreadCount: unreadMessagesCount } = useUnreadMessages()

  // Initialize push notifications for native app (managers/teachers)
  usePushNotifications({
    userId: userId ?? null,
    enabled: !!userId,
  })

  // Initialize native app features (splash screen, deep linking, status bar)
  useNativeApp({
    statusBarStyle: 'dark',
    statusBarColor: '#FFFFFF',
  })

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024
      if (!isLargeScreen) {
        setSidebarVisible(false)
      }
    }

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Listen for academy logo updates from settings page
    const handleLogoUpdate = (event: CustomEvent<{ logoUrl: string | null }>) => {
      setAcademyLogo(event.detail.logoUrl)
    }
    window.addEventListener('academyLogoUpdated', handleLogoUpdate as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('academyLogoUpdated', handleLogoUpdate as EventListener)
    }
  }, [])

  // Memoize active nav computation to prevent unnecessary re-renders
  const activeNav = useMemo(() => {
    const path = pathname.split('/')[1] // Get the first segment after /
    return path || 'dashboard'
  }, [pathname])

  // Memoize notification click handler
  const handleNotificationClick = useCallback((notification: { 
    navigation_data?: { 
      page?: string; 
      filters?: { 
        classroomId?: string; 
        sessionId?: string; 
        studentId?: string 
      }; 
      action?: string 
    } 
  }) => {
    if (notification.navigation_data?.page) {
      const page = notification.navigation_data.page
      router.push(`/${page}`)
      setNotificationDropdownOpen(false)
    }
  }, [router])

  // Memoize sidebar toggle handler
  const handleSidebarToggle = useCallback(() => {
    setSidebarVisible(prev => !prev)
  }, [])

  // Memoize notification dropdown toggle
  const handleNotificationToggle = useCallback(() => {
    setNotificationDropdownOpen(prev => !prev)
  }, [])

  // Memoize help click handler  
  const handleHelpClick = useCallback(() => {
    setShowChatWidget(prev => !prev)
  }, [])

  // Memoize notification dropdown close handler
  const handleNotificationClose = useCallback(() => {
    setNotificationDropdownOpen(false)
  }, [])

  // Memoize navigation to notifications handler
  const handleNavigateToNotifications = useCallback(() => {
    router.push('/notifications')
    setNotificationDropdownOpen(false)
  }, [router])

  // Memoize navigation to messages handler
  const handleNavigateToMessages = useCallback(() => {
    router.push('/messages')
  }, [router])

  // Memoize chat widget close handler
  const handleChatWidgetClose = useCallback(() => {
    setShowChatWidget(false)
  }, [])

  // Always show layout structure - components handle their own loading states
  const layoutContent = (
    <>
      {/* Fixed safe area backgrounds - these fill the notch and home indicator areas */}
      {/* Top safe area (notch) background */}
      <div
        className="fixed top-0 left-0 right-0 bg-white z-[100]"
        style={{ height: 'var(--safe-area-top)' }}
        aria-hidden="true"
      />
      {/* Bottom safe area (home indicator) background - reduced height */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white z-[100]"
        style={{ height: 'calc(var(--safe-area-bottom) * 0.5)' }}
        aria-hidden="true"
      />

      {/* Main app container - positioned between safe areas with reduced bottom */}
      <div
        className="flex bg-gray-50 fixed"
        style={{
          top: 'var(--safe-area-top)',
          left: 0,
          right: 0,
          bottom: 'calc(var(--safe-area-bottom) * 0.5)',
        }}
      >
      {/* Sidebar - always visible during loading */}
      {sidebarVisible && (
        <Sidebar
          activeItem={activeNav}
          userName={userName}
          onHelpClick={handleHelpClick}
          academyLogo={academyLogo}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - non-scrollable */}
        <header className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2" style={{ touchAction: 'none' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Show logo on mobile when bottom nav is visible */}
              <Image
                src="/text_logo.png"
                alt="Classraum Logo"
                width={112}
                height={36}
                className="h-7 w-auto lg:hidden cursor-pointer"
                priority
                quality={100}
                onClick={() => router.push(userRole === 'teacher' ? '/classrooms' : '/dashboard')}
              />
              {/* Hide sidebar toggle on mobile when bottom nav is visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSidebarToggle}
                className="p-2 hidden lg:flex"
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-gray-600" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {/* Messages Button */}
              <Button
                size="sm"
                className="relative p-2 bg-transparent hover:bg-gray-100 border-none shadow-none"
                onClick={handleNavigateToMessages}
              >
                <MessageSquare className="w-4 h-4 text-gray-600" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center px-1 transition-opacity duration-200">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </Button>

              {/* Notifications Button */}
              <div className="relative">
                <Button
                  ref={bellButtonRef}
                  size="sm"
                  className="relative p-2 bg-transparent hover:bg-gray-100 border-none shadow-none"
                  onClick={handleNotificationToggle}
                >
                  <Bell className="w-4 h-4 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center px-1 transition-opacity duration-200">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                <NotificationDropdown
                  userId={userId || ''}
                  isOpen={notificationDropdownOpen}
                  onClose={handleNotificationClose}
                  onNavigateToNotifications={handleNavigateToNotifications}
                  onNotificationClick={handleNotificationClick}
                  bellButtonRef={bellButtonRef as React.RefObject<HTMLButtonElement>}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Use AuthProvider instead of prop cloning */}
        <main className="flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto scroll-smooth relative"
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: isMobile && pullDistance > 10 ? 'none' : 'auto'
            }}
          >
            {/* Pull-to-refresh indicator (mobile only) */}
            {isMobile && (pullDistance > 0 || isRefreshing) && (
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
                style={{
                  height: `${isRefreshing ? 48 : pullDistance}px`,
                  opacity: isRefreshing ? 1 : (pullDistance > 80 ? 1 : pullDistance / 80)
                }}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw
                    className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  <span className="text-sm text-primary font-medium">
                    {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
                  </span>
                </div>
              </div>
            )}
            <div style={{ transform: isMobile ? `translateY(${isRefreshing ? 48 : pullDistance}px)` : 'none' }} className="transition-transform">
              {children}
            </div>
          </div>
        </main>

        {/* Bottom Navigation for mobile/tablet - part of flex layout on mobile */}
        <DashboardBottomNavigation userRole={userRole} />
      </div>

      {/* Chat Widget */}
      {showChatWidget && userId && userName && (
        <ChatWidget
          userId={userId}
          userName={userName}
          onClose={handleChatWidgetClose}
        />
      )}
    </div>
    </>
  )

  return (
    <LayoutErrorBoundary>
      <AuthWrapper>
        <RoleBasedAuthWrapper
          allowedRoles={['manager', 'teacher', 'admin', 'super_admin']}
          fallbackRedirect="/auth"
        >
          {layoutContent}
        </RoleBasedAuthWrapper>
      </AuthWrapper>
    </LayoutErrorBoundary>
  )
}