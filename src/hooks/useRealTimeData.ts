import { useEffect, useCallback, useState } from 'react'
import { useWebSocket, WebSocketMessage } from './useWebSocket'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface RealTimeConfig {
  endpoint: string
  events: string[]
  onUpdate?: (event: string, data: any) => void
  onError?: (error: any) => void
}

export function useRealTimeData<T>(config: RealTimeConfig) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const { currentUser } = useGlobalStore()

  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws`
  
  const { isConnected, sendMessage, subscribe } = useWebSocket({
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
            token: currentUser.token // Assuming you have auth token
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
      config.onError?.(error)
    }
  })

  const handleRealtimeMessage = useCallback((message: WebSocketMessage) => {
    const { type, payload } = message

    switch (type) {
      case 'data_update':
        if (config.events.includes(payload.event)) {
          setData(payload.data)
          setLastUpdate(new Date())
          setIsLoading(false)
          config.onUpdate?.(payload.event, payload.data)
        }
        break
        
      case 'data_created':
        if (config.events.includes(payload.event)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return [payload.data, ...prevData] as T
            }
            return payload.data
          })
          setLastUpdate(new Date())
          config.onUpdate?.(payload.event, payload.data)
        }
        break
        
      case 'data_updated':
        if (config.events.includes(payload.event)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return (prevData as any[]).map(item => 
                item.id === payload.data.id ? { ...item, ...payload.data } : item
              ) as T
            }
            return { ...prevData, ...payload.data } as T
          })
          setLastUpdate(new Date())
          config.onUpdate?.(payload.event, payload.data)
        }
        break
        
      case 'data_deleted':
        if (config.events.includes(payload.event)) {
          setData(prevData => {
            if (Array.isArray(prevData)) {
              return (prevData as any[]).filter(item => item.id !== payload.id) as T
            }
            return null
          })
          setLastUpdate(new Date())
          config.onUpdate?.(payload.event, { id: payload.id, deleted: true })
        }
        break
        
      case 'error':
        console.error('Real-time error:', payload)
        config.onError?.(payload)
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
  const { currentUser } = useGlobalStore()

  const websocketUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/notifications`

  const { isConnected } = useWebSocket({
    url: websocketUrl,
    onConnect: () => {
      console.log('Notifications WebSocket connected')
    },
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        const { title, body, type, actions } = message.payload
        
        // Show in-app notification
        addNotification({
          type: type || 'info',
          message: `${title}: ${body}`
        })

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: message.id,
            data: message.payload
          })

          notification.onclick = () => {
            if (actions?.onClick) {
              window.focus()
              // Handle notification click action
              actions.onClick()
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
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [userActivity, setUserActivity] = useState<Record<string, any>>({})
  
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
      switch (message.type) {
        case 'user_joined':
          setOnlineUsers(prev => {
            const exists = prev.find(u => u.id === message.payload.user.id)
            if (exists) return prev
            return [...prev, message.payload.user]
          })
          break
          
        case 'user_left':
          setOnlineUsers(prev => prev.filter(u => u.id !== message.payload.userId))
          setUserActivity(prev => {
            const updated = { ...prev }
            delete updated[message.payload.userId]
            return updated
          })
          break
          
        case 'users_list':
          setOnlineUsers(message.payload.users || [])
          break
          
        case 'user_activity':
          setUserActivity(prev => ({
            ...prev,
            [message.payload.userId]: {
              ...prev[message.payload.userId],
              ...message.payload.activity,
              timestamp: Date.now()
            }
          }))
          break
      }
    }
  })

  const updateActivity = useCallback((activity: any) => {
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
  const [document, setDocument] = useState<any>(null)
  const [cursors, setCursors] = useState<Record<string, any>>({})
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
      switch (message.type) {
        case 'document_state':
          setDocument(message.payload.document)
          break
          
        case 'operation':
          // Apply operational transformation
          setDocument(prev => applyOperation(prev, message.payload.operation))
          break
          
        case 'cursor_update':
          setCursors(prev => ({
            ...prev,
            [message.payload.userId]: message.payload.cursor
          }))
          break
          
        case 'user_left_document':
          setCursors(prev => {
            const updated = { ...prev }
            delete updated[message.payload.userId]
            return updated
          })
          break
          
        case 'document_locked':
          setIsLocked(message.payload.locked)
          break
      }
    }
  })

  const sendOperation = useCallback((operation: any) => {
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

  const updateCursor = useCallback((cursor: any) => {
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
function applyOperation(document: any, operation: any): any {
  // This is a simplified example - real OT would be much more complex
  switch (operation.type) {
    case 'insert':
      return {
        ...document,
        content: document.content.slice(0, operation.position) + 
                operation.text + 
                document.content.slice(operation.position)
      }
    case 'delete':
      return {
        ...document,
        content: document.content.slice(0, operation.position) + 
                document.content.slice(operation.position + operation.length)
      }
    case 'replace':
      return {
        ...document,
        content: document.content.slice(0, operation.position) + 
                operation.text + 
                document.content.slice(operation.position + operation.length)
      }
    default:
      return document
  }
}