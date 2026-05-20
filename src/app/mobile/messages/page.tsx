"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { MobileBackButton } from '@/components/ui/mobile/MobileBackButton'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  MessageSquare,
  Plus,
  Send,
  Loader2,
  User,
  Users,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { cn } from '@/lib/utils'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'

interface ConversationParticipant {
  id: string
  name: string
  email: string
  role: string
}

interface Conversation {
  id: string
  /** True for multi-party group chats. The API returns `is_group` from
   *  the user_conversations row. Without surfacing this on mobile, group
   *  chats showed "Unknown" because the legacy `participant` field is null. */
  isGroup: boolean
  /** Group name (set by the manager who created the group). Null for 1:1. */
  name: string | null
  /** Optional avatar uploaded by group admin. */
  avatarUrl: string | null
  /** Everyone in the conversation EXCEPT the current user. Always populated. */
  participants: ConversationParticipant[]
  /** Legacy single-user shape — only set for 1:1 conversations. Kept so any
   *  code that still reads `conversation.participant` for 1:1 keeps working. */
  participant: ConversationParticipant | null
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
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [groupedContacts, setGroupedContacts] = useState<GroupedContacts>({ teachers: [], students: [], parents: [], family: [] })
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactSearchQuery, setContactSearchQuery] = useState('')
  const [creatingConversation, setCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Composer textarea ref + auto-grow effect — mirrors the desktop ChatPanel
  // pattern so multi-line messages display naturally and Shift+Enter inserts
  // a newline. Capped at ~6 lines (144px) before scrolling.
  const composerRef = useRef<HTMLTextAreaElement>(null)
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

  // Fetch messages for selected conversation.
  //
  // Optimistic clear runs BEFORE the await so the bell badge + conversation
  // list unread count drop the instant the user taps in — not 200-500ms
  // later after the network round-trip. The server-side bulk mark-as-read
  // happens inside the GET handler (`UPDATE user_messages SET is_read=true
  // WHERE conversation_id=$id AND sender_id<>me AND is_read=false`), and
  // those UPDATE rows trigger realtime subscribers on the manager's web
  // bell to refetch — keeping cross-device unread state in sync.
  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true)

    // Optimistic: clear unread for this conversation now, dispatch event so
    // MobileHeader and other listeners refetch their bell counts.
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    ))
    window.dispatchEvent(new CustomEvent('messageRead'))

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


          // If message is in current conversation, add it and mark as read
          if (currentConversation && newMsg.conversation_id === currentConversation.id) {
            // Only add if not our own message (already added optimistically)
            if (newMsg.sender_id !== userId) {
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
            fetchConversations()
          }
        }
      )
      .subscribe((status) => {
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations, markMessageAsRead])

  // Presence channel for typing indicators.
  // Hold the SUBSCRIBED channel in a ref so handleInputChange / stopTyping
  // can reuse it. Calling supabase.channel(name) per keystroke creates a
  // brand-new unsubscribed channel object — every track() silently no-ops
  // AND each call leaks a channel.
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
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

    typingChannelRef.current = channel

    return () => {
      typingChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [selectedConversation, currentUserId])

  // Handle typing indicator when input changes
  const handleInputChange = (value: string) => {
    setNewMessage(value)

    const channel = typingChannelRef.current
    if (!channel || !currentUserId) return

    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    if (value.length > 0) {
      channel.track({ isTyping: true, userId: currentUserId })
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
    const channel = typingChannelRef.current
    if (!channel || !currentUserId) return

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

  // Composer auto-grow — pure CSS can't auto-grow a <textarea>; the
  // conventional pattern is reset to 'auto' then set to scrollHeight.
  // Cap at 144px (~6 lines) so the input never eats more than a third of
  // the screen on mobile.
  useEffect(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }, [newMessage])

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

  // Filter conversations by search — covers both 1:1 (participant name/email)
  // and groups (group name, plus any member's name).
  const filteredConversations = conversations.filter(conv => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    if (conv.isGroup) {
      if (conv.name?.toLowerCase().includes(q)) return true
      return conv.participants.some(p => p.name?.toLowerCase().includes(q))
    }
    return (
      conv.participant?.name?.toLowerCase().includes(q) ||
      conv.participant?.email?.toLowerCase().includes(q)
    )
  })

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
        return 'bg-violet-50 text-violet-700'
      case 'teacher':
        return 'bg-emerald-50 text-emerald-700'
      case 'student':
        return 'bg-sky-50 text-sky-700'
      case 'parent':
        return 'bg-amber-50 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Calculate unread count
  const totalUnreadCount = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)
  // Unread-only filter applied AFTER the search filter — both are local-only,
  // no DB hit. Mirrors the desktop ConversationList affordance.
  const visibleConversations = unreadOnly
    ? filteredConversations.filter(c => c.unreadCount > 0)
    : filteredConversations

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
            <MobileBackButton />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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
        <div className="mb-3">
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

        {/* Unread filter chips — only when there's unread to filter. Same
            behavior as the desktop ConversationList so the mobile/web
            experiences match. */}
        {totalUnreadCount > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors',
                !unreadOnly
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {String(t('messages.filterAll'))}
            </button>
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1.5',
                unreadOnly
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {String(t('messages.filterUnread'))}
              <span className={cn(
                'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center',
                unreadOnly ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
              )}>
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            </button>
          </div>
        )}

        {/* Conversations */}
        {loading ? (
          <StaggeredListSkeleton items={4} variant="message" />
        ) : visibleConversations.length === 0 ? (
          <Card>
            <EmptyState
              icon={MessageSquare}
              title={String(unreadOnly && filteredConversations.length > 0
                ? t('messages.allCaughtUp')
                : t('messages.noConversations'))}
              description={String(unreadOnly && filteredConversations.length > 0
                ? t('messages.allCaughtUpDescription')
                : t('messages.noConversationsDescription'))}
              size="sm"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleConversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={cn(
                  "p-4 transition-all cursor-pointer active:scale-[0.98]",
                  conversation.unreadCount > 0 ? "bg-white border-l-4 border-l-primary" : "bg-white"
                )}
                onClick={() => handleSelectConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar — group icon for groups, person icon for 1:1.
                      Mirrors the desktop ConversationList pattern so groups
                      created on web look right when opened on mobile. */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    {conversation.isGroup ? (
                      <Users className="h-6 w-6 text-gray-500" />
                    ) : (
                      <User className="h-6 w-6 text-gray-500" />
                    )}
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
                            {conversation.isGroup
                              ? (conversation.name || conversation.participants.map(p => p.name).join(', ') || String(t('messages.newGroupChat')))
                              : (conversation.participant?.name || String(t('mobile.fallbacks.unknownParticipant')))}
                          </span>
                          {conversation.isGroup ? (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 bg-gray-100 text-gray-700">
                              {String(t('messages.membersCount', { count: conversation.participants.length + 1 }))}
                            </span>
                          ) : (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                              getRoleColor(conversation.participant?.role || '')
                            )}>
                              {getRoleLabel(conversation.participant?.role || '')}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className={cn(
                            "text-sm mt-1 truncate",
                            conversation.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                          )}>
                            {conversation.lastMessage.isOwn && (
                              <span className="text-gray-400">{String(t('messages.you'))}: </span>
                            )}
                            {/* Group: prefix non-own messages with sender name so users
                                can scan who-said-what without opening the chat. */}
                            {conversation.isGroup && !conversation.lastMessage.isOwn && (() => {
                              const sender = conversation.participants.find(p => p.id === conversation.lastMessage?.senderId)
                              return sender ? <span className="text-gray-400">{sender.name}: </span> : null
                            })()}
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

  // Render chat view.
  //
  // Uses `h-[calc(100dvh-...)]` (definite height) instead of `flex-1` plus
  // `position: fixed` for the input. The previous fixed-position composer
  // got hidden by the iOS soft keyboard — `position: fixed` is anchored to
  // the layout viewport, NOT the visual viewport, so it sits BEHIND the
  // keyboard instead of being pushed up.
  //
  // Now: the chat view is a flex column anchored to dvh (dynamic viewport
  // height, which DOES respond to the keyboard). Messages take `flex-1`
  // and shrink when the keyboard appears; the input is the last flex child
  // and stays visible above the keyboard.
  const renderChatView = () => (
    <div className="flex flex-col h-[calc(100dvh-120px)] bg-gray-50">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <MobileBackButton onClick={handleBack} />
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
          {selectedConversation?.isGroup ? (
            <Users className="h-5 w-5 text-gray-500" />
          ) : (
            <User className="h-5 w-5 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">
            {selectedConversation?.isGroup
              ? (selectedConversation.name || selectedConversation.participants.map(p => p.name).join(', ') || String(t('messages.newGroupChat')))
              : (selectedConversation?.participant?.name || String(t('mobile.fallbacks.unknownParticipant')))}
          </h2>
          {selectedConversation?.isGroup ? (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium inline-block bg-gray-100 text-gray-700">
              {String(t('messages.membersCount', { count: selectedConversation.participants.length + 1 }))}
            </span>
          ) : (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full font-medium inline-block",
              getRoleColor(selectedConversation?.participant?.role || '')
            )}>
              {getRoleLabel(selectedConversation?.participant?.role || '')}
            </span>
          )}
        </div>
      </div>

      {/* Messages — flex-1 so it shrinks when the keyboard reduces dvh. */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
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
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    message.isOwn
                      ? "bg-primary text-white rounded-br-md shadow-[0_4px_12px_-4px_rgba(40,133,232,0.4)]"
                      : "bg-gray-50 text-gray-900 rounded-bl-md ring-1 ring-gray-100"
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
                <div className="bg-gray-50 text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 ring-1 ring-gray-100">
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

      {/* Message Input — last flex child of the dvh-anchored column above.
          No more position:fixed; the column shrinks naturally when the iOS
          keyboard reduces 100dvh, keeping the input visible. */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white safe-area-bottom">
        <div className="flex items-end gap-3">
          <Textarea
            ref={composerRef}
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
            rows={1}
            className="flex-1 min-h-[44px] py-2.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white px-4 text-sm leading-relaxed"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="h-11 w-11 rounded-full flex-shrink-0"
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
        <MobileBackButton onClick={handleBack} />
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
          <Card>
            <EmptyState
              icon={User}
              title={String(t('messages.noContacts'))}
              size="sm"
            />
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
    <div className="flex flex-col min-h-[calc(100dvh-120px)] bg-white">
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
