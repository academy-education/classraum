'use client'

import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageSquare,
  User,
  Tag,
  MoreVertical,
  Reply,
  Archive,
  Trash2,
  Building2,
  Mail
} from 'lucide-react';
import { TicketDetailModal } from './TicketDetailModal';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { AdminPageHeader } from '../AdminPageHeader';
import { useLiveAnnounce } from '../useLiveAnnounce';
import { useConfirm } from '../useConfirm';
import { DashboardCard } from '../DashboardCard';
import { StatusBadge, type StatusTone } from '../StatusBadge';
import { AdminSkeleton } from '../AdminSkeleton';
import { AdminEmptyState } from '../AdminEmptyState';

interface ChatConversation {
  id: string;
  userId: string;
  academyId?: string;
  title?: string;
  status?: string;
  closedAt?: Date;
  closedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  userName?: string;
  userEmail?: string;
  academyName?: string;
  messageCount: number;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: number;
}

export function SupportManagement() {
  const { t } = useTranslation();
  const { announce, LiveRegion } = useLiveAnnounce();
  const confirm = useConfirm();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const handleReply = (conversation: ChatConversation) => {
    // Open the detail modal for replying
    setSelectedConversation(conversation);
    setShowDetailModal(true);
    setShowActions(null);
  };

  const handleToggleStatus = async (conversation: ChatConversation) => {
    try {
      const newStatus = conversation.status === 'closed' ? 'active' : 'closed';


      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: newStatus,
          closed_at: newStatus === 'closed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      if (error) {
        console.error('[SupportManagement] Error updating status:', error);
        throw error;
      }


      // Reload conversations to reflect changes
      await loadConversations();
      setShowActions(null);
    } catch (error) {
      console.error('[SupportManagement] Error toggling conversation status:', error);
    }
  };

  const handleDelete = async (conversation: ChatConversation) => {
    const ok = await confirm({
      title: `Delete conversation with ${conversation.userName}?`,
      description: String(t('admin.confirmDeleteConversation', { name: conversation.userName })),
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;

    try {

      // First delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversation.id);

      if (messagesError) {
        console.error('[SupportManagement] Error deleting messages:', messagesError);
        throw messagesError;
      }

      // Then delete the conversation
      const { error: conversationError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversation.id);

      if (conversationError) {
        console.error('[SupportManagement] Error deleting conversation:', conversationError);
        throw conversationError;
      }


      // Reload conversations to reflect changes
      await loadConversations();
      setShowActions(null);
    } catch (error) {
      console.error('[SupportManagement] Error deleting conversation:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);

      // Fetch all chat conversations with related data.
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          users!chat_conversations_user_id_fkey(name, email),
          academies(name)
        `)
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        console.error('[SupportManagement] Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      // ─── Batched message fetch ─────────────────────────────────────────
      // Previously we did 3 queries per conversation (last message + count +
      // unread count) inside a Promise.all. For 50 conversations that's 150
      // round-trips. Now we do ONE query for every message across every
      // conversation we care about, then aggregate per-conversation in JS.
      // 50 conversations → 2 queries total instead of 151.
      const conversationIds = (conversationsData || []).map(c => c.id);

      type AggMessage = {
        id: string;
        conversation_id: string;
        message: string | null;
        created_at: string;
        sender_type: string | null;
        is_read: boolean | null;
      };

      let allMessages: AggMessage[] = [];
      if (conversationIds.length > 0) {
        const { data, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, conversation_id, message, created_at, sender_type, is_read')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false });
        if (messagesError) {
          console.error('[SupportManagement] Error fetching messages:', messagesError);
        }
        allMessages = (data as AggMessage[]) || [];
      }

      // Aggregate per conversation. Because `allMessages` is sorted desc by
      // created_at, the FIRST message we see for a given conversation_id is
      // also that conversation's most recent message.
      type ConvAgg = {
        lastMessage: AggMessage | null;
        messageCount: number;
        unreadCount: number;
      };
      const byConv = new Map<string, ConvAgg>();
      for (const msg of allMessages) {
        let entry = byConv.get(msg.conversation_id);
        if (!entry) {
          entry = { lastMessage: msg, messageCount: 0, unreadCount: 0 };
          byConv.set(msg.conversation_id, entry);
        }
        entry.messageCount += 1;
        if (msg.is_read === false && msg.sender_type === 'user') {
          entry.unreadCount += 1;
        }
      }

      const conversationsWithMessages = (conversationsData || []).map((conv) => {
        const agg = byConv.get(conv.id);
        const lastMessage = agg?.lastMessage;
        return {
          id: conv.id,
          userId: conv.user_id,
          academyId: conv.academy_id,
          title: conv.title,
          status: conv.status || 'active',
          closedAt: conv.closed_at ? new Date(conv.closed_at) : undefined,
          closedBy: conv.closed_by,
          createdAt: new Date(conv.created_at),
          updatedAt: new Date(conv.updated_at),
          userName: conv.users?.name || 'Unknown User',
          userEmail: conv.users?.email || 'No email',
          academyName: conv.academies?.name,
          messageCount: agg?.messageCount || 0,
          lastMessage: lastMessage?.message ? lastMessage.message.substring(0, 100) : undefined,
          lastMessageAt: lastMessage ? new Date(lastMessage.created_at) : undefined,
          unreadCount: agg?.unreadCount || 0,
        };
      });

      setConversations(conversationsWithMessages)
        announce(`Loaded ${conversationsWithMessages.length} conversations.`);
    } catch (error) {
      console.error('[SupportManagement] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const isClosed = (status?.toLowerCase() || 'active') === 'closed';
    const tone: StatusTone = isClosed ? 'muted' : 'active';
    const Icon = isClosed ? XCircle : CheckCircle;
    return <StatusBadge tone={tone} icon={Icon}>{isClosed ? 'Closed' : 'Active'}</StatusBadge>;
  };

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch =
      (conversation.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      conversation.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (conversation.academyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && conversation.status !== 'closed') ||
      (filterStatus === 'closed' && conversation.status === 'closed');

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status !== 'closed').length,
    closed: conversations.filter(c => c.status === 'closed').length,
    unread: conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header always visible — body switches to skeleton during load */}
        <AdminPageHeader
          kicker="Customers"
          title="Support"
          description="Open conversations from academies and end users."
        />
        <LiveRegion />

        {loading ? (
          <AdminSkeleton.Body stats={4} cols={6} rows={6} />
        ) : (<>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Total Conversations"
            value={stats.total.toLocaleString()}
            icon={<MessageSquare className="h-5 w-5" />}
            accent="blue"
          />
          <DashboardCard
            title="Active"
            value={stats.active.toLocaleString()}
            icon={<CheckCircle className="h-5 w-5" />}
            accent="emerald"
          />
          <DashboardCard
            title="Closed"
            value={stats.closed.toLocaleString()}
            icon={<XCircle className="h-5 w-5" />}
            accent="slate"
          />
          <DashboardCard
            title="Unread Messages"
            value={stats.unread.toLocaleString()}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="rose"
          />
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl ring-1 ring-gray-200/70">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-xl ring-1 ring-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/60 border-b border-gray-200/70">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Conversation
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Last Message
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <tr key={conversation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {conversation.title || 'Support Conversation'}
                          </div>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            {conversation.messageCount} messages
                            {conversation.unreadCount ? (
                              <span className="ml-2">
                                <StatusBadge tone="danger" size="sm">{conversation.unreadCount} unread</StatusBadge>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(conversation.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{conversation.userName}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Mail className="mr-1 h-3 w-3" />
                          {conversation.userEmail}
                        </div>
                        {conversation.academyName && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Building2 className="mr-1 h-3 w-3" />
                            {conversation.academyName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {conversation.lastMessage || 'No messages yet'}
                      </div>
                      {conversation.lastMessageAt && (
                        <div className="text-xs text-gray-500">
                          {conversation.lastMessageAt.toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {conversation.updatedAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {conversation.updatedAt.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPosition({
                              top: rect.bottom + 8,
                              right: window.innerWidth - rect.right
                            });
                            setShowActions(showActions === conversation.id ? null : conversation.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Row actions"
                          aria-haspopup="menu"
                          aria-expanded={showActions === conversation.id}
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {showActions === conversation.id && menuPosition && (
                          <div
                            className="fixed min-w-[180px] w-max bg-white rounded-xl shadow-xl shadow-gray-900/10 ring-1 ring-gray-200/70 py-1 z-50 overflow-hidden"
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`
                            }}
                          >
                            <button
                              onClick={() => {
                                setSelectedConversation(conversation);
                                setShowDetailModal(true);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <MessageSquare className="mr-3 h-4 w-4" />
                              View Conversation
                            </button>
                            <button
                              onClick={() => handleReply(conversation)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Reply className="mr-3 h-4 w-4" />
                              Reply
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => handleToggleStatus(conversation)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Archive className="mr-3 h-4 w-4" />
                              {conversation.status === 'closed' ? 'Reopen' : 'Close'}
                            </button>
                            <button
                              onClick={() => handleDelete(conversation)}
                              className="flex items-center w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredConversations.length === 0 && (
            <AdminEmptyState
              icon={MessageSquare}
              title="No conversations found"
              description="Try adjusting your search or filters"
            />
          )}
        </div>
        </>)}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedConversation && (
        <TicketDetailModal
          ticket={selectedConversation}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedConversation(null);
          }}
          onSuccess={loadConversations}
        />
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowActions(null);
            setMenuPosition(null);
          }}
        />
      )}
    </>
  );
}