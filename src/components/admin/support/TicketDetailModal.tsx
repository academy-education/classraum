'use client'

import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Send,
  Paperclip,
  Building2,
  Mail,
  Calendar,
  Tag
} from 'lucide-react';

interface TicketDetailModalProps {
  ticket: any;
  onClose: () => void;
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

export function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);

  // Mock conversation messages
  const messages: Message[] = [
    {
      id: '1',
      senderId: ticket.userId || 'user1',
      senderName: ticket.userName,
      senderType: 'user',
      message: ticket.description,
      timestamp: ticket.createdAt
    },
    {
      id: '2',
      senderId: 'admin1',
      senderName: 'Admin Support',
      senderType: 'admin',
      message: "Thank you for contacting us. I'll look into this issue right away. Can you please provide more details about when this issue started?",
      timestamp: new Date(ticket.createdAt.getTime() + 30 * 60 * 1000)
    },
    {
      id: '3',
      senderId: ticket.userId || 'user1',
      senderName: ticket.userName,
      senderType: 'user',
      message: "It started yesterday around 3 PM after I tried to reset my password. I've tried clearing my browser cache and using different browsers but the issue persists.",
      timestamp: new Date(ticket.createdAt.getTime() + 2 * 60 * 60 * 1000)
    },
    {
      id: '4',
      senderId: 'admin1',
      senderName: 'Admin Support',
      senderType: 'admin',
      message: "I can see the issue in our system. There was a temporary problem with our password reset service yesterday. Let me reset your password manually and send you a new temporary password.",
      timestamp: new Date(ticket.createdAt.getTime() + 3 * 60 * 60 * 1000),
      isInternal: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'waiting_user': return 'text-purple-600 bg-purple-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Here you would send the message to your API
    console.log('Sending message:', {
      ticketId: ticket.id,
      message: newMessage,
      isInternal
    });
    
    setNewMessage('');
    setIsInternal(false);
  };

  const handleStatusChange = () => {
    // Here you would update the ticket status via API
    console.log('Updating ticket status:', {
      ticketId: ticket.id,
      status: newStatus,
      priority: newPriority
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{ticket.subject}</h2>
                <p className="text-sm text-gray-500">{ticket.ticketNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.senderType === 'admin'
                      ? message.isInternal
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${
                      message.senderType === 'admin' && !message.isInternal ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {message.senderName}
                      {message.isInternal && ' (Internal)'}
                    </span>
                    <span className={`text-xs ${
                      message.senderType === 'admin' && !message.isInternal ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            ))}
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex flex-col space-y-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {/* Customer Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <User className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="font-medium">{ticket.userName}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Mail className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{ticket.userEmail}</span>
                </div>
                {ticket.academyName && (
                  <div className="flex items-center text-sm">
                    <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{ticket.academyName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Ticket Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_user">Waiting User</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 capitalize">{ticket.category.replace('_', ' ')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
                  <div className="text-sm text-gray-600">
                    {ticket.assignedAdmin || 'Unassigned'}
                  </div>
                </div>
              </div>

              {(newStatus !== ticket.status || newPriority !== ticket.priority) && (
                <button
                  onClick={handleStatusChange}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Update Ticket
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
                    <p className="font-medium">Ticket Created</p>
                    <p className="text-gray-500">{ticket.createdAt.toLocaleString()}</p>
                  </div>
                </div>
                {ticket.assignedAdmin && (
                  <div className="flex items-start space-x-2">
                    <User className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium">Assigned to {ticket.assignedAdmin}</p>
                      <p className="text-gray-500">{ticket.updatedAt.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium">Last Updated</p>
                    <p className="text-gray-500">{ticket.updatedAt.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Assign to Me
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                Escalate Ticket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}