import { useEffect, useRef, useCallback, useState } from 'react'
import { useGlobalStore } from '@/stores/useGlobalStore'

export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  onMessage?: (data: any) => void
}

export interface WebSocketMessage {
  type: string
  payload?: any
  timestamp?: number
  id?: string
}

export function useWebSocket(config: WebSocketConfig) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([])
  
  const ws = useRef<WebSocket | null>(null)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef<NodeJS.Timeout>()
  const heartbeatTimer = useRef<NodeJS.Timeout>()
  const messageQueue = useRef<WebSocketMessage[]>([])
  
  const { addNotification } = useGlobalStore()

  const connect = useCallback(() => {
    try {
      setConnectionState('connecting')
      
      ws.current = new WebSocket(config.url, config.protocols)
      
      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionState('connected')
        reconnectAttempt.current = 0
        
        // Send queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift()
          if (message && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message))
          }
        }
        
        // Start heartbeat
        if (config.heartbeatInterval) {
          heartbeatTimer.current = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              sendMessage({ type: 'ping' })
            }
          }, config.heartbeatInterval)
        }
        
        config.onConnect?.()
      }
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage
          
          // Handle pong responses
          if (data.type === 'pong') {
            return
          }
          
          setLastMessage(data)
          setMessageHistory(prev => [...prev.slice(-99), data]) // Keep last 100 messages
          
          config.onMessage?.(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setConnectionState('disconnected')
        
        // Clear heartbeat
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current)
        }
        
        config.onDisconnect?.()
        
        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttempt.current < (config.reconnectAttempts || 5)) {
          const delay = (config.reconnectDelay || 1000) * Math.pow(2, reconnectAttempt.current)
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempt.current + 1})`)
          
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempt.current++
            connect()
          }, delay)
        } else if (reconnectAttempt.current >= (config.reconnectAttempts || 5)) {
          addNotification({
            type: 'error',
            message: 'Lost connection to server. Please refresh the page.'
          })
        }
      }
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('error')
        config.onError?.(error)
      }
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionState('error')
    }
  }, [config, addNotification])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Client disconnect')
      ws.current = null
    }
    
    setIsConnected(false)
    setConnectionState('disconnected')
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const messageWithMetadata = {
      ...message,
      timestamp: Date.now(),
      id: generateMessageId()
    }
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageWithMetadata))
      return true
    } else {
      // Queue message for when connection is restored
      messageQueue.current.push(messageWithMetadata)
      return false
    }
  }, [])

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    const unsubscribe = () => {
      // This would be implemented based on your WebSocket protocol
      sendMessage({
        type: 'unsubscribe',
        payload: { eventType }
      })
    }
    
    // Subscribe to event type
    sendMessage({
      type: 'subscribe',
      payload: { eventType }
    })
    
    // Return unsubscribe function
    return unsubscribe
  }, [sendMessage])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
      }
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current)
      }
    }
  }, [])

  return {
    isConnected,
    connectionState,
    lastMessage,
    messageHistory,
    sendMessage,
    subscribe,
    connect,
    disconnect,
    clearHistory: () => setMessageHistory([])
  }
}

// Hook for Server-Sent Events
export function useServerSentEvents(url: string, options: {
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  reconnect?: boolean
  reconnectDelay?: number
}) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<any>(null)
  const eventSource = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (eventSource.current) {
      eventSource.current.close()
    }

    eventSource.current = new EventSource(url)

    eventSource.current.onopen = () => {
      console.log('SSE connected')
      setIsConnected(true)
      options.onOpen?.()
    }

    eventSource.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastEvent(data)
        options.onMessage?.(data)
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.current.onerror = (error) => {
      console.error('SSE error:', error)
      setIsConnected(false)
      options.onError?.(error)

      if (options.reconnect) {
        reconnectTimer.current = setTimeout(() => {
          connect()
        }, options.reconnectDelay || 3000)
      }
    }
  }, [url, options])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
    }
    
    if (eventSource.current) {
      eventSource.current.close()
      eventSource.current = null
    }
    
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect
  }
}

// Utility function to generate message IDs
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}