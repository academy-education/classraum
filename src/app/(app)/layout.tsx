"use client"

import React, { useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthWrapper } from '@/components/ui/auth-wrapper'
import { AuthProvider } from '@/contexts/AuthContext'
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
// import { useTranslation } from '@/hooks/useTranslation'
import { useNotifications } from '@/hooks/useNotifications'

export default function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  // const { t } = useTranslation()
  const [userData, setUserData] = useState<{
    userId: string
    userName: string
    academyId: string
  } | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false)
  const [showChatWidget, setShowChatWidget] = useState(false)
  const bellButtonRef = useRef<HTMLButtonElement | null>(null)

  const { unreadCount } = useNotifications(userData?.userId)

  // Determine active nav based on current pathname
  const getActiveNav = () => {
    const path = pathname.split('/')[1] // Get the first segment after /
    return path || 'dashboard'
  }

  const handleNotificationClick = (notification: { 
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
  }

  const handleHelpClick = () => {
    setShowChatWidget(!showChatWidget)
  }

  const handleUserData = useCallback((data: {
    userId: string
    userName: string
    academyId: string
  }) => {
    console.log('Layout: handleUserData called with:', data)
    setUserData(data)
  }, [])

  // Show loading skeleton until userData is available
  const layoutContent = userData ? (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar 
          activeItem={getActiveNav()} 
          userName={userData.userName} 
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
                onClick={() => setSidebarVisible(!sidebarVisible)}
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
                  variant="ghost" 
                  size="sm" 
                  className="relative p-2"
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                >
                  <Bell className="w-4 h-4 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-3 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center px-0.5 transition-opacity duration-200">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
                
                <NotificationDropdown
                  userId={userData.userId}
                  isOpen={notificationDropdownOpen}
                  onClose={() => setNotificationDropdownOpen(false)}
                  onNavigateToNotifications={() => {
                    router.push('/notifications')
                    setNotificationDropdownOpen(false)
                  }}
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
            <AuthProvider userData={userData}>
              {children}
            </AuthProvider>
          </div>
        </main>
      </div>

      {/* Chat Widget */}
      {showChatWidget && (
        <ChatWidget 
          userId={userData.userId}
          userName={userData.userName}
          onClose={() => setShowChatWidget(false)}
        />
      )}
    </div>
  ) : (
    // Show loading screen while waiting for user data
    <LoadingScreen />
  )

  return (
    <AuthWrapper onUserData={handleUserData}>
      {layoutContent}
    </AuthWrapper>
  )
}