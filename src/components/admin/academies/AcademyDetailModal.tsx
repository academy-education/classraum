'use client'

import React, { useState } from 'react';
import {
  X,
  Building2,
  Users,
  Activity,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { formatPrice } from '@/lib/subscription';

interface Academy {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isSuspended: boolean;
  subscriptionTier: string;
  createdAt: Date;
  studentCount: number;
  teacherCount: number;
  monthlyRevenue: number;
  lastActive: Date;
}

interface AcademyDetailModalProps {
  academy: Academy;
  onClose: () => void;
}

export function AcademyDetailModal({ academy, onClose }: AcademyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'activity'>('overview');

  // Mock additional data
  const usageData = {
    storageUsed: 3.2,
    storageLimit: 10,
    apiCalls: 12543,
    apiLimit: 100000,
    emailsSent: 342,
    emailLimit: 2000,
  };

  const recentActivity = [
    { type: 'login', user: 'Manager Kim', time: '2 hours ago' },
    { type: 'payment', amount: 150000, time: '3 days ago' },
    { type: 'user_added', count: 5, time: '1 week ago' },
    { type: 'session_created', count: 12, time: '2 weeks ago' },
  ];

  const billingHistory = [
    { date: new Date('2024-11-01'), amount: 150000, status: 'paid', invoice: 'INV-2024-011' },
    { date: new Date('2024-10-01'), amount: 150000, status: 'paid', invoice: 'INV-2024-010' },
    { date: new Date('2024-09-01'), amount: 150000, status: 'paid', invoice: 'INV-2024-009' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{academy.name}</h2>
              <p className="text-sm text-gray-500">ID: {academy.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex space-x-8 px-6">
            {(['overview', 'users', 'billing', 'activity'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
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

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{academy.email}</span>
                    </div>
                    {academy.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="mr-2 h-4 w-4 text-gray-400" />
                        <span>{academy.phone}</span>
                      </div>
                    )}
                    {academy.address && (
                      <div className="flex items-center text-sm">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        <span>{academy.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Account Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      {academy.isSuspended ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Subscription</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {academy.subscriptionTier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Created</span>
                      <span className="text-sm">{academy.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Usage Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Storage</span>
                      <span className="text-sm font-medium">{usageData.storageUsed}GB / {usageData.storageLimit}GB</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(usageData.storageUsed / usageData.storageLimit) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">API Calls</span>
                      <span className="text-sm font-medium">{usageData.apiCalls.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(usageData.apiCalls / usageData.apiLimit) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Emails</span>
                      <span className="text-sm font-medium">{usageData.emailsSent} / {usageData.emailLimit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(usageData.emailsSent / usageData.emailLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-gray-900">{academy.studentCount}</p>
                      <p className="text-xs text-gray-600">Students</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-green-600" />
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-gray-900">{academy.teacherCount}</p>
                      <p className="text-xs text-gray-600">Teachers</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{formatPrice(academy.monthlyRevenue)}</p>
                      <p className="text-xs text-gray-600">Monthly</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {Math.floor((Date.now() - academy.lastActive.getTime()) / (1000 * 60 * 60))}h ago
                      </p>
                      <p className="text-xs text-gray-600">Last Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">User Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-semibold">{academy.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Teachers</p>
                    <p className="text-2xl font-semibold">{academy.teacherCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">Approaching User Limit</p>
                    <p className="text-yellow-700 mt-1">
                      This academy has {academy.studentCount} students out of their 200 student limit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Billing Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="text-lg font-semibold capitalize">{academy.subscriptionTier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-lg font-semibold">{formatPrice(academy.monthlyRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Billing</p>
                    <p className="text-lg font-semibold">Dec 1, 2024</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Recent Invoices</h3>
                <div className="space-y-2">
                  {billingHistory.map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{invoice.invoice}</p>
                          <p className="text-xs text-gray-500">{invoice.date.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{formatPrice(invoice.amount)}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        {activity.type === 'login' && `${activity.user} logged in`}
                        {activity.type === 'payment' && `Payment of ${formatPrice(activity.amount || 0)} received`}
                        {activity.type === 'user_added' && `${activity.count} new users added`}
                        {activity.type === 'session_created' && `${activity.count} sessions created`}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Edit Academy
          </button>
        </div>
      </div>
    </div>
  );
}