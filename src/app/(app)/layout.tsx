"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { RoleBasedAuthWrapper } from '@/components/ui/role-based-auth-wrapper'
import { AuthWrapper } from '@/components/ui/auth-wrapper'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { Sidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from '@/components/ui/notification-dropdown'
import { ChatWidget } from '@/components/ui/chat-widget'
import { 
  Bell,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { LayoutErrorBoundary } from '@/components/ui/error-boundary'

export default function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { userId, userName } = useAuth()
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [showChatWidget, setShowChatWidget] = useState(false)
  const bellButtonRef = useRef<HTMLButtonElement | null>(null)

  const { unreadCount } = useNotifications(userId)


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

  // Memoize chat widget close handler
  const handleChatWidgetClose = useCallback(() => {
    setShowChatWidget(false)
  }, [])

  // Always show layout structure - components handle their own loading states
  const layoutContent = (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - always visible during loading */}
      {sidebarVisible && (
        <Sidebar
          activeItem={activeNav}
          userName={userName}
          onHelpClick={handleHelpClick}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSidebarToggle}
                className="p-2"
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-gray-600" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  ref={bellButtonRef}
                  size="sm"
                  className="relative p-2 bg-transparent hover:bg-transparent border-none shadow-none"
                  onClick={handleNotificationToggle}
                >
                  <Bell className="w-4 h-4 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-white text-[11px] rounded-full flex items-center justify-center px-1 transition-opacity duration-200">
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
          <div className="h-full overflow-y-auto scroll-smooth">
            {children}
          </div>
        </main>
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