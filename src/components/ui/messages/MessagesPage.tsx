"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Plus,
  ArrowLeft,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useCreateShortcut } from '@/hooks/useCreateShortcut'
import { showErrorToast } from '@/stores'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { NewConversationModal } from './NewConversationModal'

export interface ConversationParticipant {
  id: string
  name: string
  email: string
  role: string
}

export interface Conversation {
  id: string
  // Group metadata
  isGroup: boolean
  name: string | null                                 // group name (1:1 chats use the other participant's name)
  avatarUrl: string | null                            // group avatar (null for 1:1 — they show the participant's icon)
  // Participant lists
  participants: ConversationParticipant[]            // everyone EXCEPT the current user
  allParticipants: ConversationParticipant[]         // everyone INCLUDING the current user (for member list)
  participant: ConversationParticipant | null        // legacy single-participant shape, only set for 1:1 DMs
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

// System message metadata. Each `systemType` uses different keys in `systemMeta`:
//   member_added    → { actorId, actorName, targetId, targetName }
//   member_removed  → { actorId, actorName, targetId, targetName }
//   left            → { actorId, actorName }
//   renamed         → { actorId, actorName, oldName, newName }
//   avatar_changed  → { actorId, actorName }
export type SystemMessageType =
  | 'member_added'
  | 'member_removed'
  | 'left'
  | 'renamed'
  | 'avatar_changed'

export interface Message {
  id: string
  senderId: string
  message: string | null              // null for system messages
  isRead: boolean
  createdAt: string
  isOwn: boolean
  systemType?: SystemMessageType | null
  systemMeta?: Record<string, unknown> | null
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

  // Wire 'n' shortcut + command-palette "Create new" → open new conversation modal.
  useCreateShortcut({
    onTrigger: () => setShowNewConversationModal(true),
    enabled: !showNewConversationModal,
  })

  const [isMobileView, setIsMobileView] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)

  // Check for mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobileView()
    window.addEventListener('resize', checkMobileView)
    return () => window.removeEventListener('resize', checkMobileView)
  }, [])

  // Get current user (id + name — name is needed for the typing indicator
  // presence payload so other clients can show "Alice is typing…").
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()
        setCurrentUserName(data?.name || null)
      }
    }
    getUser()
  }, [])

  // Fetch conversations
  // Returns the fresh conversation list so callers can look up a just-created
  // conversation without depending on the stale `conversations` closure.
  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return []

      const response = await fetch('/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        // Surface the API's detail so the next failure tells us exactly what
        // went wrong (NOT NULL, missing column, RLS, etc.) instead of a
        // generic 500.
        const errBody = await response.json().catch(() => ({}))
        throw new Error(errBody.detail || errBody.error || `Failed (${response.status})`)
      }

      const data = await response.json()
      const fresh: Conversation[] = data.conversations || []
      setConversations(fresh)
      // Also keep `selectedConversation` in sync — when a metadata change
      // (rename / avatar / member added/removed) refreshes the list, the
      // open chat's name / participants / etc. need to update too. Without
      // this the chat header would still show stale data until the user
      // re-selected the conversation.
      setSelectedConversation(prev => {
        if (!prev) return prev
        return fresh.find(c => c.id === prev.id) || null
      })
      return fresh
    } catch (error) {
      console.error('Error fetching conversations:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load conversations'))
      return []
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ---- Realtime: page-level subscription ----
  // Covers everything the per-conversation ChatPanel subscription doesn't:
  //   * `user_conversations` UPDATE — rename, avatar change, updated_at bump
  //   * `conversation_participants` INSERT — someone added (could be us being
  //     added to a brand-new group we don't even have in our list yet)
  //   * `conversation_participants` DELETE — someone removed / left
  //   * `user_messages` INSERT in NON-open conversations — bumps the list
  //     so the unread count + last-message preview update without reload
  //
  // Strategy: any event triggers a refetch of the whole list. Refetch is
  // cheap (single round-trip with two helper queries) and refetching
  // guarantees the conversations array, the selectedConversation reference,
  // unread counts, last-message previews — all stay in sync.
  //
  // Special cases:
  //   - If the DELETE removes the current user from the OPEN conversation,
  //     clear the chat panel immediately instead of waiting for the refetch
  //   - For user_messages INSERT events, skip if it's for the OPEN chat
  //     (ChatPanel's own subscription handles that case to avoid double work)
  //     and skip if it's for a conversation we're not even in
  //
  // We track `conversationIdsRef` so the user_messages handler can filter
  // without putting `conversations` into the dep array (which would tear
  // down + rebuild the channel on every refetch).
  const conversationIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map(c => c.id))
  }, [conversations])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`messages-page:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_conversations' },
        () => { fetchConversations() }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants' },
        () => { fetchConversations() }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversation_participants' },
        (payload) => {
          const removed = payload.old as { conversation_id?: string; user_id?: string }
          if (
            removed?.user_id === currentUserId &&
            selectedConversation?.id === removed?.conversation_id
          ) {
            // We just lost access to the open chat — drop it from view now.
            setSelectedConversation(null)
            setMessages([])
            setShowChatOnMobile(false)
          }
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_messages' },
        (payload) => {
          const msg = payload.new as {
            conversation_id?: string
            sender_id?: string
            message?: string
            created_at?: string
            id?: string
          }
          if (!msg?.conversation_id) return
          // Skip if it's for a conversation we're not in (someone else's chat).
          if (!conversationIdsRef.current.has(msg.conversation_id)) return
          // Skip if it's for the open chat — ChatPanel's own subscription
          // already updates that conversation's preview via onConversationsChanged.
          if (msg.conversation_id === selectedConversation?.id) return
          // Skip our own messages — local state was already updated optimistically
          // in handleSendMessage, so no list bump needed.
          if (msg.sender_id === currentUserId) return

          // Optimistic local bump: move the conversation to the top of the
          // sidebar AND increment its unread badge immediately, before the
          // round-trip to /api/messages/conversations comes back. The
          // fetchConversations() call below is the source of truth and will
          // overwrite this — but the optimistic update means the user sees
          // the bump within a frame, not after the network latency.
          setConversations(prev => {
            const idx = prev.findIndex(c => c.id === msg.conversation_id)
            if (idx < 0) return prev
            const target = prev[idx]
            const bumped: Conversation = {
              ...target,
              updatedAt: msg.created_at || new Date().toISOString(),
              unreadCount: (target.unreadCount || 0) + 1,
              lastMessage: msg.id && msg.sender_id ? {
                id: msg.id,
                message: msg.message || '',
                senderId: msg.sender_id,
                createdAt: msg.created_at || new Date().toISOString(),
                isRead: false,
                isOwn: false,
              } : target.lastMessage,
            }
            return [bumped, ...prev.slice(0, idx), ...prev.slice(idx + 1)]
          })

          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, fetchConversations, selectedConversation?.id])

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

  // (markMessageAsRead removed alongside the duplicate realtime
  // subscription — see comment block below. The same logic now lives in
  // ChatPanel's INSERT handler, which is the only place that needed it.)

  // Realtime is split between two single-purpose subscribers:
  //   - The page-level channel above (~line 222) handles messages for
  //     conversations *other than* the open one — optimistic list bump,
  //     unread badge, fetchConversations.
  //   - ChatPanel's own subscription (~line 104 there) handles messages for
  //     the *open* conversation — appends to messages, calls
  //     onConversationsChanged, and marks the new arrival read since the
  //     user is actively viewing it.
  // A previous third subscription here duplicated both paths and caused
  // every INSERT to be processed three times (mass mark-as-read churn,
  // double list bumps). Deleted; behavior is fully covered above.

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle new conversation created.
  // Read from the fresh list returned by fetchConversations() — using the
  // closure'd `conversations` here would be stale (state hasn't re-rendered yet).
  const handleConversationCreated = async (conversationId: string) => {
    const fresh = await fetchConversations()
    const newConv = fresh.find(c => c.id === conversationId)
    if (newConv) {
      handleSelectConversation(newConv)
    }
  }

  // Filter conversations by search. Handles both 1:1 (participant.name/email)
  // and group chats (group name OR any participant's name).
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    if (conv.isGroup) {
      // Match the group name, or any member's name.
      if (conv.name?.toLowerCase().includes(q)) return true
      return conv.participants.some(p =>
        p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
      )
    }
    return (
      conv.participant?.name?.toLowerCase().includes(q) ||
      conv.participant?.email?.toLowerCase().includes(q) ||
      false
    )
  })

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
            <div>
              {!(isMobileView && showChatOnMobile && selectedConversation) && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{String(t('eyebrows.messages'))}</p>
              )}
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
                {isMobileView && showChatOnMobile && selectedConversation
                  ? (selectedConversation.isGroup
                      ? (selectedConversation.name || selectedConversation.participants.map(p => p.name).join(', '))
                      : selectedConversation.participant?.name)
                  : String(t('messages.title'))}
              </h1>
            </div>
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

      {/* Main Content
          - On mobile (`isMobileView`) we render exactly one of the two panels at
            a time, so flex direction doesn't matter — the panel just fills.
          - On desktop both panels render side-by-side.
          - Use `h-[calc(100dvh-...)]` (dynamic viewport height) so iOS Safari's
            URL bar doesn't push content under the nav. Different reserved offsets
            per breakpoint (header is taller on desktop). */}
      <Card className="flex flex-col md:flex-row overflow-hidden !p-0 !gap-0 h-[calc(100dvh-200px)] sm:h-[calc(100dvh-220px)] min-h-[400px]">
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
            currentUserName={currentUserName}
            onConversationsChanged={() => fetchConversations()}
            onMessagesAppend={(newMsgs) => {
              setMessages(prev => {
                // Dedupe by id — realtime can fire after a manual refetch, etc.
                const existing = new Set(prev.map(m => m.id))
                const additions = newMsgs.filter(m => !existing.has(m.id))
                if (additions.length === 0) return prev
                return [...prev, ...additions]
              })
            }}
            onLeftConversation={() => {
              // Drop the conversation we just left from the list + clear selection.
              setSelectedConversation(null)
              setMessages([])
              setShowChatOnMobile(false)
              fetchConversations()
            }}
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
