'use client'

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  UserPlus,
  Mail,
  Shield,
  Activity
} from 'lucide-react';
import { UserDetailModal } from './UserDetailModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent' | 'teacher' | 'manager' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'pending';
  academyId?: string;
  academyName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Mock data for now - in real implementation, this would fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'john.manager@seoullang.com',
          name: 'John Kim',
          role: 'manager',
          status: 'active',
          academyId: '1',
          academyName: 'Seoul Language Academy',
          createdAt: new Date('2024-01-15'),
          lastLoginAt: new Date('2024-11-06'),
          loginCount: 156
        },
        {
          id: '2',
          email: 'sarah.teacher@busanmath.com',
          name: 'Sarah Park',
          role: 'teacher',
          status: 'active',
          academyId: '2',
          academyName: 'Busan Math Center',
          createdAt: new Date('2024-02-20'),
          lastLoginAt: new Date('2024-11-05'),
          loginCount: 89
        },
        {
          id: '3',
          email: 'mike.parent@gmail.com',
          name: 'Mike Johnson',
          role: 'parent',
          status: 'active',
          academyId: '1',
          academyName: 'Seoul Language Academy',
          createdAt: new Date('2024-03-10'),
          lastLoginAt: new Date('2024-11-04'),
          loginCount: 45
        },
        {
          id: '4',
          email: 'admin@classraum.com',
          name: 'Admin User',
          role: 'admin',
          status: 'active',
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date('2024-11-06'),
          loginCount: 234
        },
        {
          id: '5',
          email: 'suspended.user@test.com',
          name: 'Suspended User',
          role: 'teacher',
          status: 'suspended',
          academyId: '3',
          academyName: 'Test Academy',
          createdAt: new Date('2024-05-15'),
          lastLoginAt: new Date('2024-10-20'),
          loginCount: 12
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: User['status']) => {
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

  const getRoleBadge = (role: User['role']) => {
    const colors = {
      student: 'bg-blue-100 text-blue-800',
      parent: 'bg-purple-100 text-purple-800',
      teacher: 'bg-green-100 text-green-800',
      manager: 'bg-orange-100 text-orange-800',
      admin: 'bg-red-100 text-red-800',
      super_admin: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}>
        {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.academyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    admins: users.filter(u => ['admin', 'super_admin'].includes(u.role)).length
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
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">User account management</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {stats.total}
            </div>
            <div className="flex items-center text-sm text-blue-600">
              <Users className="w-4 h-4 mr-1" />
              <span>All registered users</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {stats.active}
            </div>
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>Currently active</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Suspended</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {stats.suspended}
            </div>
            <div className="flex items-center text-sm text-red-600">
              <XCircle className="w-4 h-4 mr-1" />
              <span>Suspended accounts</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Admin Users</h3>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {stats.admins}
            </div>
            <div className="flex items-center text-sm text-purple-600">
              <Shield className="w-4 h-4 mr-1" />
              <span>Admin privileges</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by name, email, or academy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="parent">Parents</option>
                <option value="teacher">Teachers</option>
                <option value="manager">Managers</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
              
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </button>
              
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Academy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.academyName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.lastLoginAt ? user.lastLoginAt.toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Activity className="mr-1 h-4 w-4" />
                        {user.loginCount} logins
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {showActions === user.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDetailModal(true);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="mr-3 h-4 w-4" />
                              View Details
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Edit className="mr-3 h-4 w-4" />
                              Edit User
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Mail className="mr-3 h-4 w-4" />
                              Send Email
                            </button>
                            <button className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                              <Ban className="mr-3 h-4 w-4" />
                              {user.status === 'suspended' ? 'Reactivate' : 'Suspend'} User
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
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
}