"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Loader2,
  User,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { cn } from '@/lib/utils'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

interface Conversation {
  id: string
  participant: {
    id: string
    name: string
    email: string
    role: string
  }
  lastMessage: {
    id: string
    message: string
    senderId: string
    createdAt: string
    isRead: boolean
    isOwn: boolean
  } | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

interface Message {
  id: string
  senderId: string
  message: string
  isRead: boolean
  createdAt: string
  isOwn: boolean
}

interface Contact {
  id: string
  name: string
  email: string
  role: string
  category: string
}

interface GroupedContacts {
  teachers: Contact[]
  students: Contact[]
  parents: Contact[]
  family: Contact[]
}

type ViewMode = 'list' | 'chat' | 'new'

function MobileMessagesPageContent() {
  const router = useRouter()
  const { t, language } = useTranslation()

  // Map language to locale
  const locale = language === 'korean' ? 'ko-KR' : 'en-US'
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [groupedContacts, setGroupedContacts] = useState<GroupedContacts>({ teachers: [], students: [], parents: [], family: [] })
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [creatingConversation, setCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getUser()
  }, [])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load conversations'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      setMessages(data.messages || [])

      // Update unread count in conversation list
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ))

      // Dispatch event to update header unread count
      window.dispatchEvent(new CustomEvent('messageRead'))
    } catch (error) {
      console.error('Error fetching messages:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load messages'))
    } finally {
      setMessagesLoading(false)
    }
  }, [t])

  // Fetch contacts for new conversation
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/messages/contacts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      setGroupedContacts(data.contacts || { teachers: [], students: [], parents: [], family: [] })
    } catch (error) {
      console.error('Error fetching contacts:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load contacts'))
    } finally {
      setContactsLoading(false)
    }
  }, [t])

  // Select conversation
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
    setViewMode('chat')
  }, [fetchMessages])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return

    // Stop typing indicator
    stopTyping()

    setSendingMessage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/messages/${selectedConversation.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add new message to list
      setMessages(prev => [...prev, data.message])
      setNewMessage('')

      // Update conversation's last message
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id
          ? {
              ...conv,
              lastMessage: {
                id: data.message.id,
                message: data.message.message,
                senderId: data.message.senderId,
                createdAt: data.message.createdAt,
                isRead: false,
                isOwn: true
              },
              updatedAt: data.message.createdAt
            }
          : conv
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
    } catch (error) {
      console.error('Error sending message:', error)
      showErrorToast(String(t('messages.sendError') || 'Failed to send message'))
    } finally {
      setSendingMessage(false)
    }
  }

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', messageId)

      // Dispatch event to update header unread count
      window.dispatchEvent(new CustomEvent('messageRead'))
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }, [])

  // Use refs to access current values in the subscription callback without recreating the subscription
  const selectedConversationRef = useRef(selectedConversation)
  const currentUserIdRef = useRef(currentUserId)

  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return

    console.log('[Mobile Messages] Setting up real-time subscription for user:', currentUserId)

    const channel = supabase
      .channel('mobile_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages'
        },
        async (payload) => {
          const newMsg = payload.new as any
          const currentConversation = selectedConversationRef.current
          const userId = currentUserIdRef.current

          console.log('[Mobile Messages] Real-time message received:', {
            messageId: newMsg.id,
            conversationId: newMsg.conversation_id,
            senderId: newMsg.sender_id,
            currentConversationId: currentConversation?.id,
            currentUserId: userId
          })

          // If message is in current conversation, add it and mark as read
          if (currentConversation && newMsg.conversation_id === currentConversation.id) {
            // Only add if not our own message (already added optimistically)
            if (newMsg.sender_id !== userId) {
              console.log('[Mobile Messages] Adding message to current conversation')
              setMessages(prev => {
                // Check if message already exists
                if (prev.some(m => m.id === newMsg.id)) return prev
                return [...prev, {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  message: newMsg.message,
                  isRead: true,
                  createdAt: newMsg.created_at,
                  isOwn: false
                }]
              })
              // Mark the message as read in the database
              markMessageAsRead(newMsg.id)

              // Update conversation list but keep unread count at 0
              setConversations(prev => prev.map(conv => {
                if (conv.id === currentConversation.id) {
                  return {
                    ...conv,
                    lastMessage: {
                      id: newMsg.id,
                      message: newMsg.message,
                      senderId: newMsg.sender_id,
                      createdAt: newMsg.created_at,
                      isRead: true,
                      isOwn: false
                    },
                    updatedAt: newMsg.created_at,
                    unreadCount: 0
                  }
                }
                return conv
              }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
            }
          } else {
            // Message is for a different conversation, refresh the list
            console.log('[Mobile Messages] Message for different conversation, refreshing list')
            fetchConversations()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Mobile Messages] Subscription status:', status)
      })

    return () => {
      console.log('[Mobile Messages] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations, markMessageAsRead])

  // Presence channel for typing indicators
  useEffect(() => {
    if (!selectedConversation || !currentUserId) return

    const channelName = `typing:conversation:${selectedConversation.id}`
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as { [key: string]: { isTyping: boolean; userId: string }[] }
        const otherTyping = Object.values(state)
          .flat()
          .some(p => p.userId !== currentUserId && p.isTyping)
        setIsOtherTyping(otherTyping)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation, currentUserId])

  // Handle typing indicator when input changes
  const handleInputChange = (value: string) => {
    setNewMessage(value)

    if (!selectedConversation || !currentUserId) return

    const channelName = `typing:conversation:${selectedConversation.id}`
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
  const stopTyping = () => {
    if (!selectedConversation || !currentUserId) return

    const channelName = `typing:conversation:${selectedConversation.id}`
    const channel = supabase.channel(channelName)
    channel.track({ isTyping: false, userId: currentUserId })

    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Create new conversation
  const handleCreateConversation = async (contact: Contact) => {
    setCreatingConversation(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId: contact.id })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()

      // Refresh conversations and select the new one
      await fetchConversations()

      // Find and select the conversation
      const newConv = conversations.find(c => c.id === data.conversation.id) || {
        id: data.conversation.id,
        participant: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          role: contact.role
        },
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      handleSelectConversation(newConv as Conversation)
    } catch (error) {
      console.error('Error creating conversation:', error)
      showErrorToast(String(t('messages.createError') || 'Failed to create conversation'))
    } finally {
      setCreatingConversation(false)
    }
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    try {
      await fetchConversations()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Flatten and filter contacts by search
  const allContacts = [
    ...groupedContacts.teachers,
    ...groupedContacts.students,
    ...groupedContacts.parents,
    ...groupedContacts.family
  ]

  const filteredContacts = allContacts.filter(contact =>
    contact.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())
  )

  // Back button handler
  const handleBack = () => {
    if (viewMode === 'chat' || viewMode === 'new') {
      setViewMode('list')
      setSelectedConversation(null)
    } else {
      router.back()
    }
  }

  // Format time for conversation list
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return String(t('messages.yesterday'))
    } else if (diffDays < 7) {
      return date.toLocaleDateString(locale, { weekday: 'short' })
    } else {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    }
  }

  // Format message time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  // Get role label
  const getRoleLabel = (role: string) => {
    const roleKey = `common.roles.${role}`
    return String(t(roleKey) || role)
  }

  // Get role color
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

  // Calculate unread count
  const totalUnreadCount = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)

  // Render conversation list view
  const renderListView = () => (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto flex-1"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? handleTouchStart : undefined}
      onTouchMove={MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? handleTouchMove : undefined}
      onTouchEnd={MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? handleTouchEnd : undefined}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <div style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }} className="transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                {t('messages.title')}
              </h1>
              {totalUnreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {t('messages.unreadCount', { count: totalUnreadCount })}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={() => {
              setViewMode('new')
              fetchContacts()
            }}
            size="icon"
            className="rounded-full h-9 w-9"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('messages.searchConversations'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 rounded-lg border border-gray-200 bg-white"
            />
          </div>
        </div>

        {/* Conversations */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <MessageSquare className="w-10 h-10 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm">{String(t('messages.noConversations'))}</div>
              <div className="text-gray-400 text-xs">{String(t('messages.noConversationsDescription'))}</div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "p-4 transition-all cursor-pointer active:scale-[0.98]",
                  conversation.unreadCount > 0 ? "bg-white border-l-4 border-l-primary" : "bg-white"
                )}
                onClick={() => handleSelectConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-semibold truncate",
                            conversation.unreadCount > 0 ? "text-gray-900" : "text-gray-700"
                          )}>
                            {conversation.participant?.name || 'Unknown'}
                          </span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                            getRoleColor(conversation.participant?.role)
                          )}>
                            {getRoleLabel(conversation.participant?.role)}
                          </span>
                        </div>
                        {conversation.lastMessage && (
                          <p className={cn(
                            "text-sm mt-1 truncate",
                            conversation.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                          )}>
                            {conversation.lastMessage.isOwn && (
                              <span className="text-gray-400">{String(t('messages.you'))}: </span>
                            )}
                            {conversation.lastMessage.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-400">
                            {formatTime(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                        {conversation.unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-semibold rounded-full flex items-center justify-center">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Render chat view
  const renderChatView = () => (
    <div className="flex flex-col flex-1 bg-gray-50">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Button>
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {selectedConversation?.participant?.name || 'Unknown'}
          </h2>
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium inline-block",
            getRoleColor(selectedConversation?.participant?.role || '')
          )}>
            {getRoleLabel(selectedConversation?.participant?.role || '')}
          </span>
        </div>
      </div>

      {/* Messages - scrollable area with padding for fixed input */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">{String(t('messages.startConversation'))}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.isOwn ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm",
                    message.isOwn
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.isOwn ? "text-white/70" : "text-gray-400"
                    )}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {/* Typing Indicator */}
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

      {/* Message Input - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white safe-area-bottom z-10">
        <div className="flex items-center gap-3">
          <Input
            placeholder={String(t('messages.typeMessage'))}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={sendingMessage}
            className="flex-1 h-11 rounded-full border border-gray-200 bg-gray-50 focus:bg-white px-4"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="h-11 w-11 rounded-full"
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

  // Render new conversation view
  const renderNewConversationView = () => (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Button>
        <h2 className="text-lg font-semibold text-gray-900">
          {String(t('messages.newMessage'))}
        </h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <Input
              type="text"
              placeholder={String(t('messages.searchContacts'))}
              value={contactSearchQuery}
              onChange={(e) => setContactSearchQuery(e.target.value)}
              className="h-10 pl-10 rounded-lg border border-gray-200 bg-white"
            />
          </div>
        </div>

        {/* Contacts */}
        {contactsLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <User className="w-10 h-10 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm">{String(t('messages.noContacts'))}</div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <Card
                key={contact.id}
                className="p-4 transition-all cursor-pointer active:scale-[0.98]"
                onClick={() => !creatingConversation && handleCreateConversation(contact)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 block truncate">
                      {contact.name}
                    </span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium inline-block mt-1",
                      getRoleColor(contact.role)
                    )}>
                      {getRoleLabel(contact.role)}
                    </span>
                  </div>

                  {creatingConversation && (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] bg-white">
      {viewMode === 'list' && renderListView()}
      {viewMode === 'chat' && renderChatView()}
      {viewMode === 'new' && renderNewConversationView()}
    </div>
  )
}

export default function MobileMessagesPage() {
  return (
    <MobilePageErrorBoundary>
      <MobileMessagesPageContent />
    </MobilePageErrorBoundary>
  )
}
