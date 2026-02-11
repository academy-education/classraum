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

      console.log('[SupportManagement] Toggling conversation status:', {
        conversationId: conversation.id,
        currentStatus: conversation.status,
        newStatus
      });

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

      console.log('[SupportManagement] Status updated successfully');

      // Reload conversations to reflect changes
      await loadConversations();
      setShowActions(null);
    } catch (error) {
      console.error('[SupportManagement] Error toggling conversation status:', error);
    }
  };

  const handleDelete = async (conversation: ChatConversation) => {
    if (!confirm(`Are you sure you want to delete this conversation with ${conversation.userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('[SupportManagement] Deleting conversation:', conversation.id);

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

      console.log('[SupportManagement] Conversation deleted successfully');

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

      console.log('[SupportManagement] Loading chat conversations...');

      // Fetch all chat conversations with related data
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

      console.log('[SupportManagement] Fetched conversations:', conversationsData?.length || 0);

      // Fetch message counts and last messages for each conversation
      const conversationsWithMessages = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('id, message, created_at, sender_type, is_read')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) {
            console.error('[SupportManagement] Error fetching messages for conversation:', conv.id, messagesError);
          }

          const { count: messageCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          const { count: unreadCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .eq('sender_type', 'user');

          const lastMessage = messages?.[0];

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
            messageCount: messageCount || 0,
            lastMessage: lastMessage?.message?.substring(0, 100),
            lastMessageAt: lastMessage ? new Date(lastMessage.created_at) : undefined,
            unreadCount: unreadCount || 0
          };
        })
      );

      console.log('[SupportManagement] Processed conversations:', conversationsWithMessages.length);
      setConversations(conversationsWithMessages);
    } catch (error) {
      console.error('[SupportManagement] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = status?.toLowerCase() || 'active';

    if (statusLower === 'closed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          <XCircle className="mr-1 h-3 w-3" />
          Closed
        </span>
      );
    }

    // Active or any other status
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </span>
    );
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Conversations</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-semibold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Closed</p>
                <p className="text-2xl font-semibold text-gray-600">{stats.closed}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread Messages</p>
                <p className="text-2xl font-semibold text-red-600">{stats.unread}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
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
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {conversation.unreadCount} unread
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
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {showActions === conversation.id && menuPosition && (
                          <div
                            className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 overflow-hidden"
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
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
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
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
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