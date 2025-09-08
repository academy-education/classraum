'use client'

import React, { useEffect, useState } from 'react';
import { 
  Headphones, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageSquare,
  User,
  Calendar,
  Tag,
  MoreVertical,
  Reply,
  Archive,
  Trash2,
  Building2,
  Mail,
  Phone
} from 'lucide-react';
import { TicketDetailModal } from './TicketDetailModal';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'billing' | 'technical' | 'feature_request' | 'bug_report' | 'account' | 'other';
  academyId?: string;
  academyName?: string;
  userEmail: string;
  userName: string;
  assignedAdmin?: string;
  createdAt: Date;
  updatedAt: Date;
  lastResponseAt?: Date;
  responseTime?: number; // in hours
  messageCount: number;
}

export function SupportManagement() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          ticketNumber: 'TK20241106-0001',
          subject: 'Login issues after password reset',
          description: 'Unable to login after resetting password. Getting "Invalid credentials" error.',
          status: 'open',
          priority: 'high',
          category: 'technical',
          academyId: '1',
          academyName: 'Seoul Language Academy',
          userEmail: 'manager@seoullang.com',
          userName: 'Kim Manager',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          messageCount: 3
        },
        {
          id: '2',
          ticketNumber: 'TK20241106-0002',
          subject: 'Billing question about pro plan features',
          description: 'Need clarification on what features are included in the pro plan vs basic plan.',
          status: 'in_progress',
          priority: 'medium',
          category: 'billing',
          academyId: '2',
          academyName: 'Busan Math Center',
          userEmail: 'admin@busanmath.com',
          userName: 'Park Admin',
          assignedAdmin: 'Admin Lee',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          lastResponseAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          responseTime: 8,
          messageCount: 5
        },
        {
          id: '3',
          ticketNumber: 'TK20241105-0003',
          subject: 'Feature request: Bulk student import',
          description: 'Would like to request a feature to import multiple students at once via CSV file.',
          status: 'waiting_user',
          priority: 'low',
          category: 'feature_request',
          academyId: '3',
          academyName: 'Incheon Science Academy',
          userEmail: 'contact@incheonscience.ac.kr',
          userName: 'Choi Teacher',
          assignedAdmin: 'Admin Kim',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          lastResponseAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          responseTime: 12,
          messageCount: 4
        },
        {
          id: '4',
          ticketNumber: 'TK20241105-0004',
          subject: 'Payment failed - need assistance',
          description: 'Monthly subscription payment failed. Card is valid and has sufficient funds.',
          status: 'resolved',
          priority: 'urgent',
          category: 'billing',
          academyId: '4',
          academyName: 'Daegu Art Academy',
          userEmail: 'billing@daeguart.com',
          userName: 'Lee Manager',
          assignedAdmin: 'Admin Park',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          lastResponseAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          responseTime: 2,
          messageCount: 7
        },
        {
          id: '5',
          ticketNumber: 'TK20241104-0005',
          subject: 'Bug: Attendance report showing wrong data',
          description: 'The attendance report is showing incorrect student counts for last week.',
          status: 'closed',
          priority: 'medium',
          category: 'bug_report',
          userEmail: 'teacher@example.com',
          userName: 'Anonymous User',
          assignedAdmin: 'Admin Yoon',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          lastResponseAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          responseTime: 6,
          messageCount: 6
        }
      ];

      setTickets(mockTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="mr-1 h-3 w-3" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            In Progress
          </span>
        );
      case 'waiting_user':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            <Clock className="mr-1 h-3 w-3" />
            Waiting User
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="mr-1 h-3 w-3" />
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getCategoryIcon = (category: SupportTicket['category']) => {
    switch (category) {
      case 'billing':
        return <XCircle className="h-4 w-4 text-green-600" />;
      case 'technical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'feature_request':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'bug_report':
        return <XCircle className="h-4 w-4 text-orange-600" />;
      case 'account':
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <Tag className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.academyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Calculate stats
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
    avgResponseTime: tickets.filter(t => t.responseTime).reduce((acc, t) => acc + (t.responseTime || 0), 0) / 
                     Math.max(tickets.filter(t => t.responseTime).length, 1)
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
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <Headphones className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.open}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.inProgress}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-semibold text-red-600">{stats.urgent}</p>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_user">Waiting User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="account">Account</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned
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
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        {getCategoryIcon(ticket.category)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                          <div className="text-xs text-gray-500">{ticket.ticketNumber}</div>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            {ticket.messageCount} messages
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.userName}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Mail className="mr-1 h-3 w-3" />
                          {ticket.userEmail}
                        </div>
                        {ticket.academyName && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <Building2 className="mr-1 h-3 w-3" />
                            {ticket.academyName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.assignedAdmin || 'Unassigned'}
                      </div>
                      {ticket.responseTime && (
                        <div className="text-xs text-gray-500">
                          {ticket.responseTime}h response
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.updatedAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.updatedAt.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right relative">
                      <button
                        onClick={() => setShowActions(showActions === ticket.id ? null : ticket.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActions === ticket.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowDetailModal(true);
                              setShowActions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <MessageSquare className="mr-3 h-4 w-4" />
                            View Conversation
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Reply className="mr-3 h-4 w-4" />
                            Reply
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <User className="mr-3 h-4 w-4" />
                            Assign to Me
                          </button>
                          <hr className="my-1" />
                          <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            <Archive className="mr-3 h-4 w-4" />
                            Archive
                          </button>
                          <button className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                            <Trash2 className="mr-3 h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredTickets.length === 0 && (
            <div className="text-center py-12">
              <Headphones className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Click outside to close actions menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActions(null)}
        />
      )}
    </>
  );
}