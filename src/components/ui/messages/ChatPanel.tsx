"use client"

import { RefObject, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Conversation, Message } from './MessagesPage'

interface ChatPanelProps {
  conversation: Conversation | null
  messages: Message[]
  loading: boolean
  newMessage: string
  onNewMessageChange: (message: string) => void
  onSendMessage: () => void
  sendingMessage: boolean
  messagesEndRef: RefObject<HTMLDivElement | null>
  currentUserId: string | null
}

interface PresenceState {
  [key: string]: { isTyping: boolean; userId: string }[]
}

export function ChatPanel({
  conversation,
  messages,
  loading,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  sendingMessage,
  messagesEndRef,
  currentUserId
}: ChatPanelProps) {
  const { t, language } = useTranslation()

  // Map language to locale
  const locale = language === 'korean' ? 'ko-KR' : 'en-US'
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  // Presence channel for typing indicators
  useEffect(() => {
    if (!conversation || !currentUserId) return

    const channelName = `typing:conversation:${conversation.id}`
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const otherTyping = Object.values(state)
          .flat()
          .some(p => p.userId !== currentUserId && p.isTyping)
        setIsOtherTyping(otherTyping)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation, currentUserId])

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    onNewMessageChange(value)

    if (!conversation || !currentUserId) return

    const channelName = `typing:conversation:${conversation.id}`
    const channel = supabase.channel(channelName)

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Track typing state
    if (value.length > 0) {
      channel.track({ isTyping: true, userId: currentUserId })

      // Stop typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        channel.track({ isTyping: false, userId: currentUserId })
      }, 2000)
      setTypingTimeout(timeout)
    } else {
      channel.track({ isTyping: false, userId: currentUserId })
    }
  }

  // Stop typing when sending message
  const handleSend = () => {
    if (!conversation || !currentUserId) return

    const channelName = `typing:conversation:${conversation.id}`
    const channel = supabase.channel(channelName)
    channel.track({ isTyping: false, userId: currentUserId })

    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }

    onSendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return String(t('messages.today'))
    } else if (diffDays === 1) {
      return String(t('messages.yesterday'))
    } else {
      return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
    }
  }

  const shouldShowDateDivider = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true
    const currentDate = new Date(currentMsg.createdAt).toDateString()
    const prevDate = new Date(prevMsg.createdAt).toDateString()
    return currentDate !== prevDate
  }

  // Get role color for header badge
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-700'
      case 'teacher':
        return 'bg-blue-100 text-blue-700'
      case 'student':
        return 'bg-green-100 text-green-700'
      case 'parent':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRoleLabel = (role: string) => {
    const roleKey = `common.roles.${role}`
    return String(t(roleKey) || role)
  }

  // Empty state - shows on the right panel when no conversation is selected
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-center px-4 min-w-0">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {String(t('messages.selectConversation'))}
        </h3>
        <p className="text-gray-500 max-w-sm text-sm">
          {String(t('messages.noConversationsDescription'))}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header - Hidden on mobile (shown in main header) */}
      <div className="hidden md:flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {conversation.participant?.name || 'Unknown'}
            </h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              getRoleColor(conversation.participant?.role)
            )}>
              {getRoleLabel(conversation.participant?.role)}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {conversation.participant?.email}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-gray-500">{String(t('messages.noConversationsDescription'))}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null
              const showDateDivider = shouldShowDateDivider(message, prevMessage)

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-white text-gray-500 text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
                        {formatDateDivider(message.createdAt)}
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex",
                      message.isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                        message.isOwn
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                      <p
                        className={cn(
                          "text-xs mt-1.5",
                          message.isOwn ? "text-white/70" : "text-gray-400"
                        )}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Input
            placeholder={String(t('messages.typeMessage'))}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendingMessage}
            className="flex-1 h-11 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="h-11 w-11 rounded-lg"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
