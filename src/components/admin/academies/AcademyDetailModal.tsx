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
  totalUsers: number;
  monthlyRevenue: number;
  lastActive: Date;
}

interface AcademyDetailModalProps {
  academy: Academy;
  onClose: () => void;
}

export function AcademyDetailModal({ academy, onClose }: AcademyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing'>('overview');

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-primary600" />
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
            {(['overview', 'users', 'billing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-primary500 text-primary600'
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

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-primary600" />
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-gray-900">{academy.totalUsers}</p>
                      <p className="text-xs text-gray-600">Total Users</p>
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
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold">{academy.totalUsers}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">User Information</p>
                    <p className="text-yellow-700 mt-1">
                      This academy has {academy.totalUsers} total users across all roles.
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

              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Invoice history will appear here once payments are made
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}