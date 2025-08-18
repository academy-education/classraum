import { useState, useEffect, useCallback, useRef } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface OfflineAction {
  id: string
  type: string
  data: any
  timestamp: number
  retryCount: number
  maxRetries?: number
}

interface OfflineConfig {
  storageKey?: string
  maxRetries?: number
  retryDelay?: number
  enableBackgroundSync?: boolean
}

export function useOfflineSync(config: OfflineConfig = {}) {
  const {
    storageKey = 'offline_actions',
    maxRetries = 3,
    retryDelay = 1000,
    enableBackgroundSync = true
  } = config

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  
  const { addNotification } = useGlobalStore()
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load pending actions from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const actions = JSON.parse(stored) as OfflineAction[]
        setPendingActions(actions)
      }
    } catch (error) {
      console.error('Failed to load offline actions:', error)
    }
  }, [storageKey])

  // Save pending actions to localStorage
  const savePendingActions = useCallback((actions: OfflineAction[]) => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, JSON.stringify(actions))
    } catch (error) {
      console.error('Failed to save offline actions:', error)
    }
  }, [storageKey])

  // Update online status
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      addNotification({
        type: 'success',
        message: 'Connection restored. Syncing pending changes...'
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      addNotification({
        type: 'warning',
        message: 'You are offline. Changes will be synced when connection is restored.'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [addNotification])

  // Queue an action for offline execution
  const queueAction = useCallback((
    type: string,
    data: any,
    options: { maxRetries?: number } = {}
  ) => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || maxRetries
    }

    setPendingActions(prev => {
      const updated = [...prev, action]
      savePendingActions(updated)
      return updated
    })

    // Try to sync immediately if online
    if (isOnline && enableBackgroundSync) {
      scheduleSync()
    }

    return action.id
  }, [isOnline, maxRetries, enableBackgroundSync, savePendingActions])

  // Execute a single action
  const executeAction = useCallback(async (
    action: OfflineAction,
    executor: (type: string, data: any) => Promise<any>
  ): Promise<boolean> => {
    try {
      await executor(action.type, action.data)
      return true
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error)
      
      if (action.retryCount < (action.maxRetries || maxRetries)) {
        // Increment retry count
        setPendingActions(prev => 
          prev.map(a => 
            a.id === action.id 
              ? { ...a, retryCount: a.retryCount + 1 }
              : a
          )
        )
        return false
      } else {
        // Max retries reached, remove action
        addNotification({
          type: 'error',
          message: `Failed to sync ${action.type} after ${action.maxRetries} attempts`
        })
        return true // Remove from queue
      }
    }
  }, [maxRetries, addNotification])

  // Sync all pending actions
  const syncPendingActions = useCallback(async (
    executor: (type: string, data: any) => Promise<any>
  ) => {
    if (!isOnline || isSyncing || pendingActions.length === 0) {
      return
    }

    setIsSyncing(true)

    try {
      const actionsToRemove: string[] = []

      for (const action of pendingActions) {
        const shouldRemove = await executeAction(action, executor)
        
        if (shouldRemove) {
          actionsToRemove.push(action.id)
        }

        // Add delay between retries
        if (action.retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * action.retryCount))
        }
      }

      // Remove successfully executed actions
      if (actionsToRemove.length > 0) {
        setPendingActions(prev => {
          const updated = prev.filter(action => !actionsToRemove.includes(action.id))
          savePendingActions(updated)
          return updated
        })

        if (actionsToRemove.length === pendingActions.length) {
          addNotification({
            type: 'success',
            message: 'All pending changes synced successfully'
          })
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
      addNotification({
        type: 'error',
        message: 'Failed to sync some changes. Will retry automatically.'
      })
    } finally {
      setIsSyncing(false)
    }
  }, [
    isOnline,
    isSyncing,
    pendingActions,
    executeAction,
    retryDelay,
    savePendingActions,
    addNotification
  ])

  // Schedule background sync
  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      if (isOnline && pendingActions.length > 0) {
        // This would need to be called with the appropriate executor
        // syncPendingActions(executor)
      }
    }, 1000) // Sync after 1 second delay
  }, [isOnline, pendingActions.length])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && enableBackgroundSync) {
      scheduleSync()
    }
  }, [isOnline, pendingActions.length, enableBackgroundSync, scheduleSync])

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  const clearPendingActions = useCallback(() => {
    setPendingActions([])
    savePendingActions([])
  }, [savePendingActions])

  const removeAction = useCallback((actionId: string) => {
    setPendingActions(prev => {
      const updated = prev.filter(action => action.id !== actionId)
      savePendingActions(updated)
      return updated
    })
  }, [savePendingActions])

  return {
    isOnline,
    pendingActions,
    isSyncing,
    queueAction,
    syncPendingActions,
    clearPendingActions,
    removeAction,
    hasPendingActions: pendingActions.length > 0
  }
}