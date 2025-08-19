"use client"

import React from 'react'
import { Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface OfflineIndicatorProps {
  className?: string
  showPendingCount?: boolean
}

export function OfflineIndicator({ 
  className = '',
  showPendingCount = true 
}: OfflineIndicatorProps) {
  const { isOnline, pendingActions, isSyncing, hasPendingActions } = useOfflineSync()

  if (isOnline && !hasPendingActions) {
    return null // Don't show anything when online and no pending actions
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
          <WifiOff className="w-4 h-4" />
          <span>Offline</span>
        </div>
      )}

      {hasPendingActions && (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          isSyncing 
            ? 'bg-blue-100 text-blue-800' 
            : isOnline 
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          {isSyncing ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>
                {showPendingCount 
                  ? `${pendingActions.length} pending` 
                  : 'Pending changes'
                }
              </span>
            </>
          )}
        </div>
      )}

      {isOnline && hasPendingActions && !isSyncing && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </div>
      )}
    </div>
  )
}

export function OfflineBanner() {
  const { isOnline, hasPendingActions, pendingActions } = useOfflineSync()

  if (isOnline && !hasPendingActions) {
    return null
  }

  return (
    <div className={`w-full px-4 py-2 text-sm text-center ${
      !isOnline 
        ? 'bg-red-50 text-red-800 border-b border-red-200' 
        : 'bg-yellow-50 text-yellow-800 border-b border-yellow-200'
    }`}>
      <div className="flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>
              You&apos;re offline. Changes will be saved and synced when you&apos;re back online.
            </span>
          </>
        ) : hasPendingActions ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>
              You have {pendingActions.length} unsaved change(s) that will be synced automatically.
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}