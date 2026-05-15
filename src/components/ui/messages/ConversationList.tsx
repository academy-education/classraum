"use client"

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, Loader2, User, Users } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { cn } from '@/lib/utils'
import { Conversation } from './MessagesPage'

interface ConversationListProps {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  loading
}: ConversationListProps) {
  // Local-only "Unread only" filter. Pure client-side, no DB hit. Most-asked
  // affordance for managers juggling 30+ parent threads — saves them from
  // scrolling the whole list to find what's new since last open.
  const [unreadOnly, setUnreadOnly] = useState(false)
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount > 0 ? 1 : 0), 0),
    [conversations]
  )
  const visibleConversations = useMemo(
    () => unreadOnly ? conversations.filter(c => c.unreadCount > 0) : conversations,
    [conversations, unreadOnly]
  )
  const { t, language } = useTranslation()

  // Map language to locale
  const locale = language === 'korean' ? 'ko-KR' : 'en-US'

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

  const getRoleLabel = (role: string) => {
    const roleKey = `common.roles.${role}`
    return String(t(roleKey) || role)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-700'
      case 'teacher':
        return 'bg-sky-50 text-sky-700'
      case 'student':
        return 'bg-emerald-50 text-emerald-700'
      case 'parent':
        return 'bg-amber-50 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
      {/* Search + Unread-only filter */}
      <div className="p-4 border-b border-gray-200 bg-white space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            type="text"
            placeholder={String(t('messages.searchConversations'))}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
        {/* Unread filter — show only when there's something to filter, so
            we don't add chrome for managers who are caught up. */}
        {totalUnread > 0 && (
          <div className="flex items-center gap-2">
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
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={String(t('messages.noConversations'))}
            description={String(t('messages.noConversationsDescription'))}
            size="sm"
            variant="subtle"
          />
        ) : visibleConversations.length === 0 ? (
          // The base list isn't empty but the unread filter has hidden everything
          // — give a more affirming message ("all caught up") rather than the
          // generic "no conversations" copy that implies nothing exists.
          <EmptyState
            icon={MessageSquare}
            title={String(t('messages.allCaughtUp'))}
            description={String(t('messages.allCaughtUpDescription'))}
            size="sm"
            variant="subtle"
          />
        ) : (
          visibleConversations.map((conversation) => {
            // Display name + secondary metadata adapt based on chat type:
            //   - 1:1 DM: show the other user's name + their role pill
            //   - Group: show the group name (or fallback) + member count pill
            const displayName = conversation.isGroup
              ? (conversation.name || conversation.participants.map(p => p.name).join(', ') || String(t('messages.newGroupChat')))
              : (conversation.participant?.name || 'Unknown')

            const memberCount = conversation.allParticipants?.length || conversation.participants.length + 1

            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-white transition-colors text-left border-b border-gray-100",
                  selectedConversation?.id === conversation.id && "bg-white border-l-2 border-l-primary"
                )}
              >
                {/* Avatar — group icon for group chats, person icon for 1:1 */}
                <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
                  {conversation.isGroup ? (
                    <Users className="h-5 w-5 text-gray-500" />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {conversation.isGroup ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                        {String(t('messages.membersCount', { count: memberCount }))}
                      </span>
                    ) : (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        getRoleColor(conversation.participant?.role || '')
                      )}>
                        {getRoleLabel(conversation.participant?.role || '')}
                      </span>
                    )}
                  </div>

                  {conversation.lastMessage && (
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <p className={cn(
                        "text-sm truncate",
                        conversation.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"
                      )}>
                        {conversation.lastMessage.isOwn && (
                          <span className="text-gray-400">{String(t('messages.you'))}: </span>
                        )}
                        {/* For group chats, prefix the message with the sender's name
                            (other than ourselves) so users can scan who-said-what without opening the chat. */}
                        {conversation.isGroup && !conversation.lastMessage.isOwn && (() => {
                          const sender = conversation.participants.find(p => p.id === conversation.lastMessage?.senderId)
                          return sender ? <span className="text-gray-400">{sender.name}: </span> : null
                        })()}
                        {conversation.lastMessage.message}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-semibold rounded-full flex items-center justify-center">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
