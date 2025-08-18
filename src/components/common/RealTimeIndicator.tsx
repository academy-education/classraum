"use client"

import React from 'react'
import { Wifi, WifiOff, Users, Activity } from 'lucide-react'
import { useRealTimePresence } from '@/hooks/useRealTimeData'

interface RealTimeIndicatorProps {
  roomId: string
  showUserCount?: boolean
  showActivity?: boolean
  className?: string
}

export function RealTimeIndicator({ 
  roomId, 
  showUserCount = true, 
  showActivity = false,
  className = '' 
}: RealTimeIndicatorProps) {
  const { onlineUsers, userActivity, isConnected } = useRealTimePresence(roomId)

  const getActivityIcon = (activity: any) => {
    switch (activity?.type) {
      case 'typing':
        return '✏️'
      case 'viewing':
        return '👁️'
      case 'editing':
        return '📝'
      default:
        return '👤'
    }
  }

  const getActivityText = (activity: any) => {
    if (!activity) return 'Online'
    
    switch (activity.type) {
      case 'typing':
        return 'Typing...'
      case 'viewing':
        return 'Viewing'
      case 'editing':
        return 'Editing'
      default:
        return 'Online'
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-xs font-medium ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* User Count */}
      {showUserCount && isConnected && (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-600">
            {onlineUsers.length}
          </span>
        </div>
      )}

      {/* User Activity */}
      {showActivity && isConnected && onlineUsers.length > 0 && (
        <div className="flex items-center gap-2">
          {onlineUsers.slice(0, 3).map(user => {
            const activity = userActivity[user.id]
            return (
              <div
                key={user.id}
                className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1"
                title={`${user.name} - ${getActivityText(activity)}`}
              >
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name}
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs">{getActivityIcon(activity)}</span>
              </div>
            )
          })}
          
          {onlineUsers.length > 3 && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
              <span className="text-xs text-gray-600">
                +{onlineUsers.length - 3} more
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LiveDataBadge({ isLive = false }: { isLive?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isLive 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
      }`} />
      {isLive ? 'Live' : 'Static'}
    </div>
  )
}

export function ActivityIndicator({ 
  activity, 
  className = '' 
}: { 
  activity?: any
  className?: string 
}) {
  if (!activity) return null

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'typing':
        return 'text-blue-600 bg-blue-100'
      case 'editing':
        return 'text-green-600 bg-green-100'
      case 'viewing':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      getActivityColor(activity.type)
    } ${className}`}>
      <Activity className="w-3 h-3" />
      <span>{activity.type === 'typing' ? 'Typing...' : activity.type}</span>
    </div>
  )
}