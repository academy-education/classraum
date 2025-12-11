'use client'

import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Calendar,
  Building2,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Unlock,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'manager' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  academyId?: string;
  academyName?: string;
}

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'permissions' | 'settings'>('overview');

  // Mock activity data
  const activityLogs = [
    {
      id: '1',
      action: 'Login',
      details: 'User logged in from Chrome on Windows',
      timestamp: new Date('2024-11-06T10:30:00'),
      ipAddress: '192.168.1.100',
      status: 'success'
    },
    {
      id: '2',
      action: 'Profile Update',
      details: 'Changed profile picture',
      timestamp: new Date('2024-11-05T15:45:00'),
      ipAddress: '192.168.1.100',
      status: 'success'
    },
    {
      id: '3',
      action: 'Failed Login',
      details: 'Invalid password attempt',
      timestamp: new Date('2024-11-04T09:15:00'),
      ipAddress: '192.168.1.105',
      status: 'failed'
    },
    {
      id: '4',
      action: 'Password Reset',
      details: 'Password reset request sent',
      timestamp: new Date('2024-11-03T14:20:00'),
      ipAddress: '192.168.1.100',
      status: 'success'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Suspended
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      student: 'bg-blue-100 text-blue-800',
      parent: 'bg-purple-100 text-purple-800',
      teacher: 'bg-green-100 text-green-800',
      manager: 'bg-orange-100 text-orange-800',
      admin: 'bg-red-100 text-red-800',
      super_admin: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed login':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'profile update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'password reset':
        return <Unlock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityStatus = (status: string) => {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
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
              {(['overview', 'activity', 'permissions', 'settings'] as const).map((tab) => (
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

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <User className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500">Full Name</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Mail className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          <p className="text-xs text-gray-500">Email Address</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-3 h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.createdAt.toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">Account Created</p>
                        </div>
                      </div>
                      {user.academyName && (
                        <div className="flex items-center">
                          <Building2 className="mr-3 h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.academyName}</p>
                            <p className="text-xs text-gray-500">Academy</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        {getStatusBadge(user.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Login</span>
                        <span className="text-sm text-gray-900">
                          {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Login Count</span>
                        <span className="text-sm text-gray-900">{user.loginCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Activity className="h-6 w-6 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm text-blue-600">Sessions</p>
                          <p className="text-xl font-semibold text-blue-900">24</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm text-green-600">Completed</p>
                          <p className="text-xl font-semibold text-green-900">18</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="h-6 w-6 text-purple-600 mr-2" />
                        <div>
                          <p className="text-sm text-purple-600">Hours</p>
                          <p className="text-xl font-semibold text-purple-900">142</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <div className="space-y-3">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getActivityIcon(log.action)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.action}</p>
                            <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{log.timestamp.toLocaleString()}</span>
                              <span>IP: {log.ipAddress}</span>
                              <span className={getActivityStatus(log.status)}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Permissions & Access</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Current Role: {getRoleBadge(user.role)}</h4>
                    <p className="text-sm text-gray-600">
                      This role grants access to specific features and functions within the platform.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Feature Access</h4>
                    {[
                      { feature: 'Dashboard Access', granted: true },
                      { feature: 'User Management', granted: user.role === 'admin' || user.role === 'super_admin' },
                      { feature: 'Academy Settings', granted: ['manager', 'admin', 'super_admin'].includes(user.role) },
                      { feature: 'Financial Reports', granted: ['manager', 'admin', 'super_admin'].includes(user.role) },
                      { feature: 'System Configuration', granted: user.role === 'super_admin' }
                    ].map((access, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm text-gray-700">{access.feature}</span>
                        {access.granted ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Account Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        Reset Password
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Send Verification Email
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        Update Profile Information
                      </Button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Role Management</h4>
                    <div className="space-y-2">
                      <Select defaultValue={user.role}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="default">
                        Update Role
                      </Button>
                    </div>
                  </div>

                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
                    <div className="space-y-2">
                      <Button variant="destructive" className="w-full justify-start">
                        {user.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
                      </Button>
                      <Button variant="destructive" className="w-full justify-start">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}