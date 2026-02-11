'use client'

import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Megaphone,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  Pause
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'maintenance' | 'feature' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'paused';
  targetAudience: 'all' | 'managers' | 'teachers' | 'parents' | 'students';
  createdAt: Date;
  publishedAt?: Date;
  scheduledAt?: Date;
  viewCount: number;
  author: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'push' | 'in_app';
  category: 'welcome' | 'reminder' | 'alert' | 'marketing';
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
}

export function CommunicationsDashboard() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'templates' | 'campaigns' | 'analytics'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'System Maintenance Scheduled',
          content: 'We will be performing system maintenance on Sunday, November 10th from 2:00 AM to 6:00 AM KST. During this time, the platform may be temporarily unavailable.',
          type: 'maintenance',
          priority: 'high',
          status: 'published',
          targetAudience: 'all',
          createdAt: new Date('2024-11-05'),
          publishedAt: new Date('2024-11-05'),
          viewCount: 1247,
          author: 'System Admin'
        },
        {
          id: '2',
          title: 'New AI Report Cards Feature',
          content: 'Introducing our new AI-powered report card generation feature! Teachers can now create comprehensive student reports automatically.',
          type: 'feature',
          priority: 'medium',
          status: 'scheduled',
          targetAudience: 'teachers',
          createdAt: new Date('2024-11-04'),
          scheduledAt: new Date('2024-11-08'),
          viewCount: 0,
          author: 'Product Team'
        },
        {
          id: '3',
          title: 'Holiday Schedule Update',
          content: 'Please note the updated holiday schedule for December 2024. Classes will resume on January 2nd, 2025.',
          type: 'general',
          priority: 'medium',
          status: 'draft',
          targetAudience: 'all',
          createdAt: new Date('2024-11-06'),
          viewCount: 0,
          author: 'Admin Team'
        }
      ];

      const mockTemplates: NotificationTemplate[] = [
        {
          id: '1',
          name: 'Welcome New User',
          subject: 'Welcome to Classraum!',
          content: 'Welcome {{userName}} to Classraum! We\'re excited to have you on board.',
          type: 'email',
          category: 'welcome',
          isActive: true,
          usageCount: 245,
          createdAt: new Date('2024-01-15')
        },
        {
          id: '2',
          name: 'Class Reminder',
          subject: 'Your class starts in 1 hour',
          content: 'Hi {{userName}}, your {{className}} class starts at {{startTime}}. Don\'t forget to join!',
          type: 'push',
          category: 'reminder',
          isActive: true,
          usageCount: 1834,
          createdAt: new Date('2024-02-10')
        },
        {
          id: '3',
          name: 'Payment Due Alert',
          subject: 'Payment Due Reminder',
          content: 'Your monthly subscription payment of {{amount}} is due on {{dueDate}}.',
          type: 'email',
          category: 'alert',
          isActive: true,
          usageCount: 456,
          createdAt: new Date('2024-03-05')
        }
      ];

      setAnnouncements(mockAnnouncements);
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading communications data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      system: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      feature: 'bg-green-100 text-green-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Published</span>;
      case 'scheduled':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"><Clock className="mr-1 h-3 w-3" />Scheduled</span>;
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"><Edit className="mr-1 h-3 w-3" />Draft</span>;
      case 'paused':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"><Pause className="mr-1 h-3 w-3" />Paused</span>;
      default:
        return null;
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || announcement.type === filterType;
    const matchesStatus = filterStatus === 'all' || announcement.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const stats = {
    totalAnnouncements: announcements.length,
    published: announcements.filter(a => a.status === 'published').length,
    scheduled: announcements.filter(a => a.status === 'scheduled').length,
    totalViews: announcements.reduce((sum, a) => sum + a.viewCount, 0),
    activeTemplates: templates.filter(t => t.isActive).length,
    templateUsage: templates.reduce((sum, t) => sum + t.usageCount, 0)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
        <p className="text-gray-600">Manage system announcements, notifications, and messaging</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Announcements</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalAnnouncements}
          </div>
          <div className="flex items-center text-sm text-blue-600">
            <MessageSquare className="w-4 h-4 mr-1" />
            <span>{stats.published} published</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Scheduled</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.scheduled}
          </div>
          <div className="flex items-center text-sm text-orange-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>Pending publication</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Views</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.totalViews.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-green-600">
            <Eye className="w-4 h-4 mr-1" />
            <span>All announcements</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Template Usage</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {stats.templateUsage.toLocaleString()}
          </div>
          <div className="flex items-center text-sm text-purple-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>{stats.activeTemplates} active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6">
            {(['announcements', 'templates', 'campaigns', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="system">System</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="feature">Feature</option>
                    <option value="general">General</option>
                  </select>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published</option>
                    <option value="paused">Paused</option>
                  </select>
                  
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    New Announcement
                  </button>
                </div>
              </div>

              {/* Announcements List */}
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          <Megaphone className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{announcement.title}</h4>
                            <p className="text-gray-600 mt-1">{announcement.content}</p>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(announcement.type)}`}>
                                {announcement.type}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                                {announcement.priority}
                              </span>
                              {getStatusBadge(announcement.status)}
                              <span className="text-xs text-gray-500">
                                Target: {announcement.targetAudience}
                              </span>
                              <span className="text-xs text-gray-500">
                                Views: {announcement.viewCount}
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Created by {announcement.author} on {announcement.createdAt.toLocaleDateString()}
                              {announcement.publishedAt && (
                                <span> • Published {announcement.publishedAt.toLocaleDateString()}</span>
                              )}
                              {announcement.scheduledAt && (
                                <span> • Scheduled for {announcement.scheduledAt.toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Notification Templates</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {template.content}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            template.type === 'email' ? 'bg-blue-100 text-blue-800' :
                            template.type === 'push' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {template.type}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {template.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Used {template.usageCount} times • Created {template.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="text-center py-12">
              <Send className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create your first email campaign to reach your users.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Create Campaign
              </button>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Communication Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Announcement Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Views per Announcement</span>
                      <span className="font-medium">{Math.round(stats.totalViews / Math.max(stats.published, 1))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Most Popular Type</span>
                      <span className="font-medium">System</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Engagement Rate</span>
                      <span className="font-medium">73.2%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Template Analytics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Most Used Template</span>
                      <span className="font-medium">Class Reminder</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email Open Rate</span>
                      <span className="font-medium">68.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Push Notification CTR</span>
                      <span className="font-medium">12.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}