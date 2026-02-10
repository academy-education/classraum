"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
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
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { NewConversationModal } from './NewConversationModal'

export interface Conversation {
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

export interface Message {
  id: string
  senderId: string
  message: string
  isRead: boolean
  createdAt: string
  isOwn: boolean
}

export interface Contact {
  id: string
  name: string
  email: string
  role: string
  category: string
}

export interface GroupedContacts {
  teachers: Contact[]
  students: Contact[]
  parents: Contact[]
  family: Contact[]
}

export function MessagesPage() {
  const { t } = useTranslation()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])

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

      // Dispatch event to update sidebar unread count (API marks messages as read)
      window.dispatchEvent(new CustomEvent('messageRead'))
    } catch (error) {
      console.error('Error fetching messages:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load messages'))
    } finally {
      setMessagesLoading(false)
    }
  }, [t])

  // Select conversation
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
    if (isMobileView) {
      setShowChatOnMobile(true)
    }
  }, [fetchMessages, isMobileView])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await supabase
        .from('user_messages')
        .update({ is_read: true })
        .eq('id', messageId)

      // Dispatch event to update sidebar unread count
      window.dispatchEvent(new CustomEvent('messageRead'))
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }, [])

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel('user_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages'
        },
        async (payload) => {
          const newMsg = payload.new as any

          // If message is in current conversation, add it and mark as read
          if (selectedConversation && newMsg.conversation_id === selectedConversation.id) {
            // Only add if not our own message (already added optimistically)
            if (newMsg.sender_id !== currentUserId) {
              setMessages(prev => {
                // Check if message already exists
                if (prev.some(m => m.id === newMsg.id)) return prev
                return [...prev, {
                  id: newMsg.id,
                  senderId: newMsg.sender_id,
                  message: newMsg.message,
                  isRead: true, // Mark as read since we're viewing it
                  createdAt: newMsg.created_at,
                  isOwn: false
                }]
              })
              // Mark the message as read in the database
              markMessageAsRead(newMsg.id)

              // Update conversation list but keep unread count at 0 for current conversation
              setConversations(prev => prev.map(conv => {
                if (conv.id === selectedConversation.id) {
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
                    unreadCount: 0 // Keep at 0 since we're viewing the conversation
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, selectedConversation, fetchConversations, markMessageAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new conversation created
  const handleConversationCreated = (conversationId: string) => {
    fetchConversations().then(() => {
      // Find and select the new conversation
      const newConv = conversations.find(c => c.id === conversationId)
      if (newConv) {
        handleSelectConversation(newConv)
      }
    })
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Mobile back button
  const handleMobileBack = () => {
    setShowChatOnMobile(false)
    setSelectedConversation(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            {isMobileView && showChatOnMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMobileBack}
                className="-ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {isMobileView && showChatOnMobile && selectedConversation
                ? selectedConversation.participant?.name
                : String(t('messages.title'))}
            </h1>
          </div>
          {(!isMobileView || !showChatOnMobile) && (
            <p className="text-gray-500">{String(t('messages.description') || 'Send and receive messages with your academy contacts')}</p>
          )}
        </div>
        {(!isMobileView || !showChatOnMobile) && (
          <Button onClick={() => setShowNewConversationModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {String(t('messages.newMessage'))}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Card className="flex flex-row overflow-hidden !p-0 !gap-0" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        {/* Conversation List - hidden on mobile when chat is shown */}
        {(!isMobileView || !showChatOnMobile) && (
          <ConversationList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />
        )}

        {/* Chat Panel - full width on mobile when shown */}
        {(!isMobileView || showChatOnMobile) && (
          <ChatPanel
            conversation={selectedConversation}
            messages={messages}
            loading={messagesLoading}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            sendingMessage={sendingMessage}
            messagesEndRef={messagesEndRef}
            currentUserId={currentUserId}
          />
        )}
      </Card>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  )
}
