'use client'

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  User,
  CheckCircle,
  Send,
  Paperclip,
  Building2,
  Mail,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface TicketDetailModalProps {
  ticket: ChatConversation;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  message: string;
  timestamp: Date;
  isInternal?: boolean;
}

// Convert to KST timezone
const toKST = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
};

const formatKSTTime = (date: Date) => {
  const kstDate = toKST(date);
  return kstDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatKSTDateTime = (date: Date) => {
  const kstDate = toKST(date);
  return kstDate.toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export function TicketDetailModal({ ticket, onClose, onSuccess }: TicketDetailModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status || 'active');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

  // Sync newStatus with ticket.status when ticket changes
  useEffect(() => {
    setNewStatus(ticket.status || 'active');
  }, [ticket.status]);

  const loadMessages = async () => {
    try {
      setLoading(true);

      console.log('[TicketDetailModal] Loading messages for conversation:', ticket.id);

      // Fetch all messages for this conversation
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select(`
          *,
          users:sender_id(name, email)
        `)
        .eq('conversation_id', ticket.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('[TicketDetailModal] Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('[TicketDetailModal] Fetched messages:', messagesData?.length || 0);

      // Transform messages to our Message interface
      const transformedMessages: Message[] = (messagesData || []).map(msg => {
        const isSupport = msg.sender_type === 'support' || msg.sender_type === 'admin';
        return {
          id: msg.id,
          senderId: msg.sender_id,
          senderName: isSupport ? 'Classraum Support' : (msg.users?.name || 'Unknown User'),
          senderType: isSupport ? 'admin' : 'user',
          message: msg.message,
          timestamp: new Date(msg.created_at),
          isInternal: false
        };
      });

      setMessages(transformedMessages);
    } catch (error) {
      console.error('[TicketDetailModal] Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };


  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    try {
      console.log('[TicketDetailModal] Sending message:', {
        conversationId: ticket.id,
        message: messageText,
        isInternal
      });

      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('[TicketDetailModal] No authenticated user found');
        return;
      }

      // Optimistically add message to UI
      const optimisticMessage: Message = {
        id: tempId,
        senderId: user.id,
        senderName: 'Classraum Support',
        senderType: 'admin',
        message: messageText,
        timestamp: new Date(),
        isInternal: false
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      setIsInternal(false);

      // Insert the new message - try 'support' as sender_type
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: ticket.id,
          sender_id: user.id,
          sender_type: 'support',
          message: messageText,
          is_read: true,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[TicketDetailModal] Error sending message:', error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        // Restore message text
        setNewMessage(messageText);
        throw error;
      }

      console.log('[TicketDetailModal] Message sent successfully');

      // Update conversation's updated_at timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      // Reload messages to get the real ID from database
      await loadMessages();

      // Call onSuccess callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[TicketDetailModal] Error sending message:', error);
    }
  };

  const handleStatusChange = async () => {
    try {
      console.log('[TicketDetailModal] Updating conversation status:', {
        conversationId: ticket.id,
        status: newStatus
      });

      const { error } = await supabase
        .from('chat_conversations')
        .update({
          status: newStatus,
          closed_at: newStatus === 'closed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);

      if (error) {
        console.error('[TicketDetailModal] Error updating status:', error);
        throw error;
      }

      console.log('[TicketDetailModal] Status updated successfully');

      // Reload messages to reflect changes
      await loadMessages();

      // Call onSuccess callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[TicketDetailModal] Error updating conversation status:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log('[TicketDetailModal] Marking all messages as read for conversation:', ticket.id);

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_id', ticket.id)
        .eq('sender_type', 'user')
        .eq('is_read', false);

      if (error) {
        console.error('[TicketDetailModal] Error marking messages as read:', error);
        throw error;
      }

      console.log('[TicketDetailModal] Messages marked as read successfully');

      // Reload messages to reflect changes
      await loadMessages();

      // Call onSuccess callback to refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('[TicketDetailModal] Error marking messages as read:', error);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{ticket.title || 'Support Conversation'}</h2>
                <p className="text-sm text-gray-500">ID: {ticket.id.substring(0, 8)}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">No messages yet</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderType === 'admin'
                        ? message.isInternal
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-3">
                      <span className={`text-xs font-medium ${
                        message.senderType === 'admin' && !message.isInternal ? 'text-primary-foreground/80' : 'text-gray-500'
                      }`}>
                        {message.senderName}
                        {message.isInternal && ' (Internal)'}
                      </span>
                      <span className={`text-xs whitespace-nowrap ${
                        message.senderType === 'admin' && !message.isInternal ? 'text-primary-foreground/80' : 'text-gray-400'
                      }`}>
                        {formatKSTTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply Box */}
          <div className="border-t border-gray-100 p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-gray-700">Internal note</span>
                </label>
              </div>
              <div className="flex space-x-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="flex flex-col space-y-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-100 bg-gray-50">
          <div className="p-6 space-y-6">
            {/* Close Button */}
            <div className="flex justify-end -mt-2 -mr-2">
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">{ticket.userName || 'Unknown User'}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{ticket.userEmail || 'No email'}</span>
                </div>
                {ticket.academyName && (
                  <div className="flex items-center text-sm">
                    <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{ticket.academyName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Conversation Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <Select
                    value={newStatus}
                    onValueChange={setNewStatus}
                  >
                    <SelectTrigger className="!h-9 w-full rounded-lg border border-gray-300 bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3 text-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Messages</label>
                  <div className="text-sm text-gray-600">
                    {ticket.messageCount} total
                    {ticket.unreadCount ? ` (${ticket.unreadCount} unread)` : ''}
                  </div>
                </div>
              </div>

              {newStatus !== ticket.status && (
                <button
                  onClick={handleStatusChange}
                  className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Update Status
                </button>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium">Conversation Created</p>
                    <p className="text-gray-500">{formatKSTDateTime(ticket.createdAt)}</p>
                  </div>
                </div>
                {ticket.lastMessageAt && (
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Last Message</p>
                      <p className="text-gray-500">{formatKSTDateTime(ticket.lastMessageAt)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium">Last Updated</p>
                    <p className="text-gray-500">{formatKSTDateTime(ticket.updatedAt)}</p>
                  </div>
                </div>
                {ticket.closedAt && (
                  <div className="flex items-start space-x-2">
                    <XCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Closed</p>
                      <p className="text-gray-500">{formatKSTDateTime(ticket.closedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <button
                onClick={handleMarkAllAsRead}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Mark All as Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}