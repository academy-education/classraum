"use client"

import { RefObject, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2, MessageSquare, User, Users, Settings } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Conversation, Message, SystemMessageType } from './MessagesPage'
import { GroupSettingsModal } from './GroupSettingsModal'

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
  currentUserName: string | null
  // Called when something happens that should refresh the conversations list:
  //   - Group renamed / avatar changed / member added or removed
  //   - New message arrived in this conversation (so list re-sorts and last-message updates)
  onConversationsChanged: () => void
  // New messages arrived via realtime — parent merges them into its `messages` state.
  onMessagesAppend: (msgs: Message[]) => void
  // Current user left the group — parent should deselect this conversation.
  onLeftConversation: () => void
}

type SupabaseChannel = ReturnType<typeof supabase.channel>

interface TypingUser {
  userId: string
  userName: string
}

interface PresenceState {
  [key: string]: { isTyping: boolean; userId: string; userName: string }[]
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
  currentUserId,
  currentUserName,
  onConversationsChanged,
  onMessagesAppend,
  onLeftConversation,
}: ChatPanelProps) {
  const { t, language } = useTranslation()

  const locale = language === 'korean' ? 'ko-KR' : 'en-US'
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Hold the SUBSCRIBED presence channel so handleInputChange can reuse it
  // for `track()` calls. Previously the input handler called
  // `supabase.channel(...)` per keystroke, which (a) created an unsubscribed
  // channel object per character and (b) silently dropped every track()
  // because the channel was never .subscribe()'d — so the typing indicator
  // didn't actually fire AND we leaked channel objects.
  const typingChannelRef = useRef<SupabaseChannel | null>(null)
  // Composer textarea — resized imperatively on each value change so the
  // input grows from one line up to ~6 lines as the user types, then scrolls.
  // Pure CSS can't auto-grow a <textarea>; the conventional pattern is
  // `style.height = 'auto'` then `style.height = scrollHeight + 'px'`.
  const composerRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 144)}px` // 144px ≈ 6 lines
  }, [newMessage])
  const [showGroupSettings, setShowGroupSettings] = useState(false)

  // ---- Presence channel (typing indicator with names) ----
  // We track {isTyping, userId, userName} per presence key. Computing the
  // "who is typing" list at render time means we can show "Alice and Bob are
  // typing…" naturally for groups.
  useEffect(() => {
    if (!conversation || !currentUserId) return

    const channelName = `typing:conversation:${conversation.id}`
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUserId } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        const typers: TypingUser[] = []
        const seen = new Set<string>()
        for (const list of Object.values(state)) {
          for (const p of list) {
            if (p.userId !== currentUserId && p.isTyping && !seen.has(p.userId)) {
              typers.push({ userId: p.userId, userName: p.userName || '' })
              seen.add(p.userId)
            }
          }
        }
        setTypingUsers(typers)
      })
      .subscribe()

    // Stash the subscribed channel so handleInputChange can reuse it.
    typingChannelRef.current = channel

    return () => {
      typingChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [conversation, currentUserId])

  // ---- Realtime: subscribe to new messages in the open conversation ----
  // Appends messages to local state as they're inserted by other users.
  // Self-sent messages are added optimistically by MessagesPage so we filter them
  // out here to avoid duplicates.
  useEffect(() => {
    if (!conversation || !currentUserId) return

    const channelName = `messages:conversation:${conversation.id}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string
            sender_id: string
            message: string | null
            is_read: boolean
            created_at: string
            system_type: SystemMessageType | null
            system_meta: Record<string, unknown> | null
          }
          // Skip messages we already have (e.g. our own optimistic insert).
          if (row.sender_id === currentUserId && !row.system_type) return
          onMessagesAppend([{
            id: row.id,
            senderId: row.sender_id,
            message: row.message,
            isRead: row.is_read,
            createdAt: row.created_at,
            isOwn: row.sender_id === currentUserId,
            systemType: row.system_type,
            systemMeta: row.system_meta,
          }])
          // Bump conversation list so this conversation re-sorts to top + last
          // message preview updates.
          onConversationsChanged()

          // Mark the just-arrived message as read since we're actively viewing
          // the conversation. Without this, the message renders inline but
          // stays unread in the DB until the conversation is closed/reopened —
          // causing the bell badge to count it as unread while the manager is
          // literally reading it. Skip system messages (no read state) and
          // self messages (already read).
          if (row.sender_id !== currentUserId && !row.system_type && !row.is_read) {
            await supabase
              .from('user_messages')
              .update({ is_read: true })
              .eq('id', row.id)
            window.dispatchEvent(new CustomEvent('messageRead'))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation, currentUserId, onMessagesAppend, onConversationsChanged])

  // ---- Typing indicator outbound — track on input ----
  // Reuses the SUBSCRIBED channel from the presence effect above (held in
  // typingChannelRef). Calling supabase.channel(name) here would create a
  // brand-new unsubscribed channel object per keystroke — every track()
  // would silently no-op AND we'd leak channels.
  const handleInputChange = (value: string) => {
    onNewMessageChange(value)

    const channel = typingChannelRef.current
    if (!channel || !currentUserId) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (value.length > 0) {
      channel.track({
        isTyping: true,
        userId: currentUserId,
        userName: currentUserName || '',
      })
      typingTimeoutRef.current = setTimeout(() => {
        channel.track({ isTyping: false, userId: currentUserId, userName: currentUserName || '' })
      }, 2000)
    } else {
      channel.track({ isTyping: false, userId: currentUserId, userName: currentUserName || '' })
    }
  }

  const handleSend = () => {
    if (!conversation || !currentUserId) return
    // Reuse the SUBSCRIBED presence channel rather than minting a new one —
    // same fix as handleInputChange. A fresh channel here would silently
    // no-op the track() AND leak the channel object.
    const channel = typingChannelRef.current
    if (channel) {
      channel.track({ isTyping: false, userId: currentUserId, userName: currentUserName || '' })
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    onSendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessageTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return String(t('messages.today'))
    if (diffDays === 1) return String(t('messages.yesterday'))
    return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const shouldShowDateDivider = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true
    const currentDate = new Date(currentMsg.createdAt).toDateString()
    const prevDate = new Date(prevMsg.createdAt).toDateString()
    return currentDate !== prevDate
  }

  // Render a system message as plain centered italic text (no bubble), so
  // they read as inline timeline events rather than chat messages.
  // Picks the right i18n key based on systemType + whether the actor/target
  // is the current user (so the wording feels personal: "You added Bob"
  // instead of "Alice added Bob" when it was you).
  const renderSystemMessage = (message: Message): string => {
    const meta = (message.systemMeta || {}) as Record<string, string>
    const actorName = meta.actorName || ''
    const targetName = meta.targetName || ''
    const isActorMe = meta.actorId === currentUserId
    const isTargetMe = meta.targetId === currentUserId
    const newName = meta.newName || ''

    const stringT = (key: string, params?: Record<string, string>) => {
      const result = t(key, params as Record<string, string | number>)
      return typeof result === 'string' ? result : key
    }

    switch (message.systemType) {
      case 'member_added':
        if (isActorMe) return stringT('messages.systemMessages.memberAddedSelf', { target: targetName })
        if (isTargetMe) return stringT('messages.systemMessages.memberAddedYou', { actor: actorName })
        return stringT('messages.systemMessages.memberAdded', { actor: actorName, target: targetName })
      case 'member_removed':
        if (isActorMe) return stringT('messages.systemMessages.memberRemovedSelf', { target: targetName })
        if (isTargetMe) return stringT('messages.systemMessages.memberRemovedYou', { actor: actorName })
        return stringT('messages.systemMessages.memberRemoved', { actor: actorName, target: targetName })
      case 'left':
        if (isActorMe) return stringT('messages.systemMessages.leftSelf')
        return stringT('messages.systemMessages.left', { actor: actorName })
      case 'renamed':
        if (newName) {
          return isActorMe
            ? stringT('messages.systemMessages.renamedSelf', { newName })
            : stringT('messages.systemMessages.renamed', { actor: actorName, newName })
        }
        return isActorMe
          ? stringT('messages.systemMessages.renamedClearedSelf')
          : stringT('messages.systemMessages.renamedCleared', { actor: actorName })
      case 'avatar_changed':
        return isActorMe
          ? stringT('messages.systemMessages.avatarChangedSelf')
          : stringT('messages.systemMessages.avatarChanged', { actor: actorName })
      default:
        return ''
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-700'
      case 'teacher': return 'bg-sky-50 text-sky-700'
      case 'student': return 'bg-emerald-50 text-emerald-700'
      case 'parent': return 'bg-amber-50 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getRoleLabel = (role: string) => {
    const result = t(`common.roles.${role}`)
    return typeof result === 'string' ? result : role
  }

  // Build the typing indicator label — "Alice is typing…",
  // "Alice and Bob are typing…", "Alice, Bob, and 2 others are typing…"
  const typingLabel = (() => {
    if (typingUsers.length === 0) return null
    if (typingUsers.length === 1) {
      return String(t('messages.singleTyping', { name: typingUsers[0].userName }))
    }
    if (typingUsers.length === 2) {
      return String(t('messages.twoTyping', {
        name1: typingUsers[0].userName,
        name2: typingUsers[1].userName,
      }))
    }
    return String(t('messages.manyTyping', {
      name: typingUsers[0].userName,
      count: typingUsers.length - 1,
    }))
  })()

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 min-w-0">
        <EmptyState
          icon={MessageSquare}
          title={String(t('messages.selectConversation'))}
          description={String(t('messages.noConversationsDescription'))}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header — clickable for groups (opens settings modal) */}
      <div className="hidden md:flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        {conversation.isGroup ? (
          <button
            type="button"
            onClick={() => setShowGroupSettings(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
            aria-label={String(t('messages.groupSettings'))}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
              {conversation.avatarUrl ? (
                 
                <img src={conversation.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {conversation.name || conversation.participants.map(p => p.name).join(', ')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                  {String(t('messages.membersCount', { count: conversation.allParticipants?.length || conversation.participants.length + 1 }))}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {String(t('messages.you'))}{conversation.participants.length > 0 ? ', ' : ''}
                {conversation.participants.map(p => p.name).join(', ')}
              </p>
            </div>
            <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        ) : (
          <>
            <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {conversation.participant?.name || 'Unknown'}
                </h3>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  getRoleColor(conversation.participant?.role || '')
                )}>
                  {getRoleLabel(conversation.participant?.role || '')}
                </span>
              </div>
              <p className="text-sm text-gray-500">{conversation.participant?.email}</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-gray-500">{String(t('messages.noMessagesYet'))}</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null
              const showDateDivider = shouldShowDateDivider(message, prevMessage)

              // System message — centered italic, no bubble, no sender name
              if (message.systemType) {
                return (
                  <div key={message.id}>
                    {showDateDivider && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-white text-gray-500 text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
                          {formatDateDivider(message.createdAt)}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-center my-2">
                      <p className="text-xs text-gray-500 italic text-center px-4">
                        {renderSystemMessage(message)}
                      </p>
                    </div>
                  </div>
                )
              }

              // Regular message
              const isConsecutiveFromSameSender =
                prevMessage && prevMessage.senderId === message.senderId && !showDateDivider && !prevMessage.systemType
              const sender = conversation.isGroup && !message.isOwn && !isConsecutiveFromSameSender
                ? conversation.participants.find(p => p.id === message.senderId)
                : null

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-white text-gray-500 text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-100">
                        {formatDateDivider(message.createdAt)}
                      </div>
                    </div>
                  )}
                  <div className={cn("flex", message.isOwn ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%]", message.isOwn ? "items-end" : "items-start")}>
                      {sender && (
                        <p className="text-xs font-medium text-gray-500 ml-3 mb-0.5">
                          {sender.name}
                        </p>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 shadow-sm",
                          message.isOwn
                            ? "bg-primary text-white rounded-br-md"
                            : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                        <p className={cn("text-xs mt-1.5", message.isOwn ? "text-white/70" : "text-gray-400")}>
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {typingLabel && (
              <div className="flex justify-start items-end gap-2">
                <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 mb-1">{typingLabel}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input — Textarea so multi-line messages display naturally
          and Shift+Enter inserts a newline (handleKeyDown sends only on
          plain Enter). Auto-grows from 1 line up to ~6 lines via the
          effect above, then scrolls. */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          <Textarea
            ref={composerRef}
            placeholder={String(t('messages.typeMessage'))}
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendingMessage}
            rows={1}
            className="flex-1 min-h-[44px] py-2.5 rounded-lg border border-border bg-white focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm leading-relaxed"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sendingMessage}
            size="icon"
            className="h-11 w-11 rounded-lg flex-shrink-0"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Group settings modal */}
      {conversation.isGroup && currentUserId && (
        <GroupSettingsModal
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversation={conversation}
          currentUserId={currentUserId}
          onChanged={onConversationsChanged}
          onLeft={onLeftConversation}
        />
      )}
    </div>
  )
}
