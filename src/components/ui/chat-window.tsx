"use client"

import { useState, useRef, useEffect } from 'react'
import { X, Minus, Send } from 'lucide-react'
import Image from 'next/image'
import { Button } from './button'
import { Textarea } from './textarea'
import { ChatMessage } from './chat-message'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  sender: 'user' | 'support'
  message: string
  timestamp: Date
  senderName?: string
}

interface DbMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_type: 'user' | 'support'
  message: string
  message_type: string
  created_at: string
  users?: {
    name?: string
    email?: string
  }
}

interface ChatWindowProps {
  userId?: string
  userName?: string
  userEmail?: string
  onClose: () => void
  onMinimize: () => void
}

export function ChatWindow({ userId, userName, userEmail, onClose, onMinimize }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const convertDbMessageToMessage = (dbMessage: DbMessage): Message => ({
    id: dbMessage.id,
    sender: dbMessage.sender_type,
    message: dbMessage.message,
    timestamp: new Date(dbMessage.created_at),
    senderName: dbMessage.sender_type === 'support' ? 'Support Team' : dbMessage.users?.name || userName || 'You'
  })

  const initializeConversation = async () => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      // First, try to get existing conversations
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Conversation fetch error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: '/api/chat/conversations'
        })
        throw new Error(`Failed to fetch conversations: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      const conversations = data.conversations || []
      
      let activeConversation = conversations.find((conv: { status: string; id: string }) => conv.status === 'active')
      
      if (!activeConversation) {
        // Create new conversation
        const createResponse = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ title: 'Support Chat' })
        })
        
        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Conversation creation error:', createResponse.status, errorData)
          throw new Error(`Failed to create conversation: ${errorData.error || createResponse.status}`)
        }
        
        const createData = await createResponse.json()
        console.log('Created conversation:', createData)
        activeConversation = createData.conversation
      }

      if (activeConversation?.id) {
        console.log('Using conversation:', activeConversation.id)
        setConversationId(activeConversation.id)
        await loadMessages(activeConversation.id)
      } else {
        console.error('No valid conversation created:', activeConversation)
        throw new Error('No conversation ID available')
      }
    } catch (error) {
      console.error('Error initializing conversation:', error)
      // Add welcome message as fallback
      setMessages([{
        id: '1',
        sender: 'support',
        message: t("chat.welcomeMessage"),
        timestamp: new Date(),
        senderName: 'Support Team'
      }])
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (convId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/chat/messages?conversation_id=${convId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const { messages: dbMessages } = await response.json()
      
      if (dbMessages && dbMessages.length > 0) {
        const convertedMessages = dbMessages.map(convertDbMessageToMessage)
        setMessages(convertedMessages)
      } else {
        // Add welcome message if no messages exist
        setMessages([{
          id: '1',
          sender: 'support',
          message: t("chat.welcomeMessage"),
          timestamp: new Date(),
          senderName: 'Support Team'
        }])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  useEffect(() => {
    initializeConversation()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Auto-focus input when window opens
    if (inputRef.current && !loading) {
      inputRef.current.focus()
    }
  }, [loading])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newDbMessage = payload.new as DbMessage
          
          // Fetch the complete message with user info
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) return
          
          const response = await fetch(`/api/chat/messages?conversation_id=${conversationId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          const { messages: dbMessages } = await response.json()
          const fullMessage = dbMessages.find((msg: DbMessage) => msg.id === newDbMessage.id)
          
          if (fullMessage) {
            const convertedMessage = convertDbMessageToMessage(fullMessage)
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              if (prev.some(msg => msg.id === convertedMessage.id)) {
                return prev
              }
              return [...prev, convertedMessage]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId) {
      console.error('Cannot send message: missing input or conversation ID', {
        hasMessage: !!inputMessage.trim(),
        conversationId
      })
      return
    }

    const messageText = inputMessage.trim()
    setInputMessage('')
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = '40px'
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageText
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API Error:', response.status, errorData)
        throw new Error(`Failed to send message: ${errorData.error || response.status}`)
      }

      const { message: newMessage } = await response.json()
      const convertedMessage = convertDbMessageToMessage(newMessage)
      
      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        if (prev.some(msg => msg.id === convertedMessage.id)) {
          return prev
        }
        return [...prev, convertedMessage]
      })

    } catch (error) {
      console.error('Error sending message:', error)
      // Re-add the message to input on error
      setInputMessage(messageText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className="w-80 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Image
              src="/inverse-logo.png"
              alt="Support"
              width={20}
              height={20}
              className="w-5 h-5"
            />
          </div>
          <div>
            <h3 className="font-medium text-sm">{t("chat.classraumSupport")}</h3>
            <p className="text-xs text-white/80">{t("chat.weAreHereToHelp")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Minimize chat"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>Support team is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              placeholder={t("chat.typeYourMessage")}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="min-h-[42px] max-h-[120px] pr-12 py-3 resize-none border border-input bg-transparent rounded-md shadow-xs transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || loading}
            size="sm"
            className="bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] hover:shadow-lg shrink-0 h-[42px] w-[42px] rounded-lg p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t("chat.pressEnterToSend")}
        </p>
      </div>
    </div>
  )
}