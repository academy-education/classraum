"use client"

import { Input } from '@/components/ui/input'
import { Search, MessageSquare, Loader2, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
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
        return 'bg-blue-100 text-blue-700'
      case 'student':
        return 'bg-green-100 text-green-700'
      case 'parent':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
      {/* Search */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={String(t('messages.searchConversations'))}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 pl-10 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{String(t('messages.noConversations'))}</p>
            <p className="text-gray-400 text-sm mt-1">{String(t('messages.noConversationsDescription'))}</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation)}
              className={cn(
                "w-full p-4 flex items-start gap-3 hover:bg-white transition-colors text-left border-b border-gray-100",
                selectedConversation?.id === conversation.id && "bg-white border-l-2 border-l-primary"
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 text-gray-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 truncate">
                    {conversation.participant?.name || 'Unknown'}
                  </span>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    getRoleColor(conversation.participant?.role)
                  )}>
                    {getRoleLabel(conversation.participant?.role)}
                  </span>
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
          ))
        )}
      </div>
    </div>
  )
}
