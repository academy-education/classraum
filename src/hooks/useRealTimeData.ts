import { useEffect, useCallback, useState } from 'react'
import { useWebSocket, WebSocketMessage } from './useWebSocket'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface RealTimeConfig {
  endpoint: string
  events: string[]
  onUpdate?: (event: string, data: unknown) => void
  onError?: (error: Error) => void
}

export function useRealTimeData<T>(config: RealTimeConfig) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const { currentUser } = useGlobalStore()

  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws`
  
  const { isConnected, sendMessage } = useWebSocket({
    url: websocketUrl,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
    onConnect: () => {
      console.log('Real-time connection established')
      
      // Authenticate user
      if (currentUser) {
        sendMessage({
          type: 'auth',
          payload: {
            userId: currentUser.id,
            token: (currentUser as { token?: string }).token || 'none' // Assuming you have auth token
          }
        })
      }
      
      // Subscribe to events
      config.events.forEach(event => {
        sendMessage({
          type: 'subscribe',
          payload: { event, endpoint: config.endpoint }
        })
      })
    },
    onMessage: (message: WebSocketMessage) => {
      handleRealtimeMessage(message)
    },
    onError: (error) => {
      console.error('Real-time connection error:', error)
      config.onError?.(error as unknown as Error)
    }
  })

  const handleRealtimeMessage = useCallback((message: WebSocketMessage) => {
    const { type, payload } = message
    const typedPayload = payload as Record<string, unknown>

    switch (type) {
      case 'data_update':
        if (config.events.includes(typedPayload.event as string)) {
          setData(typedPayload.data as T)
          setLastUpdate(new Date())
          setIsLoading(false)
          config.onUpdate?.(typedPayload.event as string, typedPayload.data)
        }
        break
        
      case 'data_created':
        if (config.events.includes(typedPayload.event as string)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return [typedPayload.data, ...prevData] as T
            }
            return typedPayload.data as T
          })
          setLastUpdate(new Date())
          config.onUpdate?.(typedPayload.event as string, typedPayload.data)
        }
        break
        
      case 'data_updated':
        if (config.events.includes(typedPayload.event as string)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return (prevData as Array<{id: string} & Record<string, unknown>>).map((item) => 
                item.id === (typedPayload.data as Record<string, unknown>).id ? { ...item, ...(typedPayload.data as Record<string, unknown>) } : item
              ) as T
            }
            return { ...prevData, ...(typedPayload.data as Record<string, unknown>) } as T
          })
          setLastUpdate(new Date())
          config.onUpdate?.(typedPayload.event as string, typedPayload.data)
        }
        break
        
      case 'data_deleted':
        if (config.events.includes(typedPayload.event as string)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return (prevData as Array<{id: string} & Record<string, unknown>>).filter((item) => item.id !== typedPayload.id) as T
            }
            return null
          })
          setLastUpdate(new Date())
          config.onUpdate?.(typedPayload.event as string, { id: typedPayload.id, deleted: true })
        }
        break
        
      case 'error':
        console.error('Real-time error:', payload)
        config.onError?.(typedPayload as unknown as Error)
        break
        
      default:
        // Handle custom events
        if (config.events.includes(type)) {
          config.onUpdate?.(type, payload)
        }
    }
  }, [config])

  // Request initial data
  const fetchInitialData = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'fetch_data',
        payload: { endpoint: config.endpoint }
      })
    }
  }, [isConnected, sendMessage, config.endpoint])

  useEffect(() => {
    if (isConnected) {
      fetchInitialData()
    }
  }, [isConnected, fetchInitialData])

  // Manual refresh
  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchInitialData()
  }, [fetchInitialData])

  return {
    data,
    isLoading,
    isConnected,
    lastUpdate,
    refresh
  }
}

// Hook for real-time notifications
export function useRealTimeNotifications() {
  const { addNotification } = useGlobalStore()

  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/notifications`

  const { isConnected } = useWebSocket({
    url: websocketUrl,
    onConnect: () => {
      console.log('Notifications WebSocket connected')
    },
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        const typedPayload = message.payload as Record<string, unknown>
        const { title, body, type, actions } = typedPayload
        
        // Show in-app notification
        addNotification({
          type: (type as "error" | "success" | "warning" | "info") || 'info',
          message: `${title}: ${body}`
        })

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(title as string, {
            body: body as string,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: (message as unknown as Record<string, unknown>).id as string,
            data: message.payload
          })

          notification.onclick = () => {
            if ((actions as Record<string, unknown>)?.onClick) {
              window.focus()
              // Handle notification click action
              ;((actions as Record<string, unknown>).onClick as () => void)()
            }
            notification.close()
          }
        }
      }
    }
  })

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }, [])

  return {
    isConnected,
    requestNotificationPermission
  }
}

// Hook for real-time presence (who's online)
export function useRealTimePresence(roomId: string) {
  const [onlineUsers, setOnlineUsers] = useState<unknown[]>([])
  const [userActivity, setUserActivity] = useState<Record<string, unknown>>({})
  
  const { currentUser } = useGlobalStore()
  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/presence`

  const { isConnected, sendMessage } = useWebSocket({
    url: websocketUrl,
    onConnect: () => {
      // Join room
      if (currentUser) {
        sendMessage({
          type: 'join_room',
          payload: {
            roomId,
            user: {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar
            }
          }
        })
      }
    },
    onMessage: (message: WebSocketMessage) => {
      const typedPayload = message.payload as Record<string, unknown>
      switch (message.type) {
        case 'user_joined':
          setOnlineUsers(prev => {
            const exists = prev.find(u => (u as Record<string, unknown>).id === (typedPayload.user as Record<string, unknown>).id)
            if (exists) return prev
            return [...prev, typedPayload.user]
          })
          break
          
        case 'user_left':
          setOnlineUsers(prev => prev.filter(u => (u as Record<string, unknown>).id !== typedPayload.userId))
          setUserActivity(prev => {
            const updated = { ...prev }
            delete updated[typedPayload.userId as string]
            return updated
          })
          break
          
        case 'users_list':
          setOnlineUsers(typedPayload.users as unknown[] || [])
          break
          
        case 'user_activity':
          setUserActivity(prev => ({
            ...prev,
            [typedPayload.userId as string]: {
              ...(prev[typedPayload.userId as string] as Record<string, unknown> || {}),
              ...(typedPayload.activity as Record<string, unknown>),
              timestamp: Date.now()
            }
          }))
          break
      }
    }
  })

  const updateActivity = useCallback((activity: unknown) => {
    if (isConnected) {
      sendMessage({
        type: 'update_activity',
        payload: {
          roomId,
          activity
        }
      })
    }
  }, [isConnected, sendMessage, roomId])

  const leaveRoom = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'leave_room',
        payload: { roomId }
      })
    }
  }, [isConnected, sendMessage, roomId])

  // Leave room on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom])

  return {
    onlineUsers,
    userActivity,
    isConnected,
    updateActivity,
    leaveRoom
  }
}

// Hook for real-time collaborative editing
export function useRealTimeCollaboration(documentId: string) {
  const [document, setDocument] = useState<unknown>(null)
  const [cursors, setCursors] = useState<Record<string, unknown>>({})
  const [isLocked, setIsLocked] = useState(false)
  
  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/collaboration`

  const { isConnected, sendMessage } = useWebSocket({
    url: websocketUrl,
    onConnect: () => {
      sendMessage({
        type: 'join_document',
        payload: { documentId }
      })
    },
    onMessage: (message: WebSocketMessage) => {
      const typedPayload = message.payload as Record<string, unknown>
      switch (message.type) {
        case 'document_state':
          setDocument(typedPayload.document)
          break
          
        case 'operation':
          // Apply operational transformation
          setDocument((prev: unknown) => applyOperation(prev, typedPayload.operation))
          break
          
        case 'cursor_update':
          setCursors(prev => ({
            ...prev,
            [typedPayload.userId as string]: typedPayload.cursor
          }))
          break
          
        case 'user_left_document':
          setCursors(prev => {
            const updated = { ...prev }
            delete updated[typedPayload.userId as string]
            return updated
          })
          break
          
        case 'document_locked':
          setIsLocked(typedPayload.locked as boolean)
          break
      }
    }
  })

  const sendOperation = useCallback((operation: unknown) => {
    if (isConnected && !isLocked) {
      sendMessage({
        type: 'operation',
        payload: {
          documentId,
          operation
        }
      })
    }
  }, [isConnected, isLocked, sendMessage, documentId])

  const updateCursor = useCallback((cursor: unknown) => {
    if (isConnected) {
      sendMessage({
        type: 'cursor_update',
        payload: {
          documentId,
          cursor
        }
      })
    }
  }, [isConnected, sendMessage, documentId])

  return {
    document,
    cursors,
    isLocked,
    isConnected,
    sendOperation,
    updateCursor
  }
}

// Simple operational transformation for collaborative editing
function applyOperation(document: unknown, operation: unknown): unknown {
  // This is a simplified example - real OT would be much more complex
  const typedDoc = document as Record<string, unknown>
  const typedOp = operation as Record<string, unknown>
  
  switch (typedOp.type) {
    case 'insert':
      return {
        ...typedDoc,
        content: (typedDoc.content as string).slice(0, typedOp.position as number) + 
                (typedOp.text as string) + 
                (typedDoc.content as string).slice(typedOp.position as number)
      }
    case 'delete':
      return {
        ...typedDoc,
        content: (typedDoc.content as string).slice(0, typedOp.position as number) + 
                (typedDoc.content as string).slice((typedOp.position as number) + (typedOp.length as number))
      }
    case 'replace':
      return {
        ...typedDoc,
        content: (typedDoc.content as string).slice(0, typedOp.position as number) + 
                (typedOp.text as string) + 
                (typedDoc.content as string).slice((typedOp.position as number) + (typedOp.length as number))
      }
    default:
      return document
  }
}