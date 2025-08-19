"use client"

import React, { createContext, useContext, useEffect } from 'react'
import { useRealTimeNotifications } from '@/hooks/useRealTimeData'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface RealTimeContextValue {
  isConnected: boolean
  requestNotificationPermission: () => Promise<boolean>
}

const RealTimeContext = createContext<RealTimeContextValue | null>(null)

interface RealTimeProviderProps {
  children: React.ReactNode
  enableNotifications?: boolean
  enablePresence?: boolean
}

export function RealTimeProvider({
  children,
  enableNotifications = true
}: RealTimeProviderProps) {
  // Suppress unused variable warning
  void enableNotifications
  const { currentUser } = useGlobalStore()
  
  const { 
    isConnected: notificationsConnected, 
    requestNotificationPermission 
  } = useRealTimeNotifications()

  // Auto-request notification permission for logged-in users
  useEffect(() => {
    if (enableNotifications && currentUser && 'Notification' in window) {
      // Check if permission is already granted or denied
      if (Notification.permission === 'default') {
        // Show a subtle prompt to enable notifications
        setTimeout(() => {
          requestNotificationPermission()
        }, 5000) // Wait 5 seconds after login
      }
    }
  }, [currentUser, enableNotifications, requestNotificationPermission])

  const contextValue: RealTimeContextValue = {
    isConnected: notificationsConnected,
    requestNotificationPermission
  }

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  )
}

export function useRealTimeContext() {
  const context = useContext(RealTimeContext)
  if (!context) {
    throw new Error('useRealTimeContext must be used within RealTimeProvider')
  }
  return context
}

// Component for showing real-time connection status
export function RealTimeStatus({ className = '' }: { className?: string }) {
  const { isConnected } = useRealTimeContext()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected 
          ? 'bg-green-500 animate-pulse' 
          : 'bg-red-500'
      }`} />
      <span className={`text-xs font-medium ${
        isConnected ? 'text-green-600' : 'text-red-600'
      }`}>
        {isConnected ? 'Real-time Active' : 'Real-time Disconnected'}
      </span>
    </div>
  )
}

// Hook for enabling real-time features on specific components
export function useRealTimeEnabled() {
  const { isConnected } = useRealTimeContext()
  const { currentUser } = useGlobalStore()

  return {
    isEnabled: isConnected && !!currentUser,
    isConnected,
    hasUser: !!currentUser
  }
}

// Component wrapper that adds real-time capabilities
export function WithRealTime({
  children,
  roomId
}: {
  children: React.ReactNode
  roomId?: string
}) {
  const { isEnabled } = useRealTimeEnabled()

  // Only render real-time features if enabled
  if (!isEnabled) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {children}
      {roomId && (
        <div className="absolute top-2 right-2">
          <RealTimeStatus />
        </div>
      )}
    </div>
  )
}