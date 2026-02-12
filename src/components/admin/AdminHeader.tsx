'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Search, 
  Settings, 
  LogOut, 
  User,
  ChevronDown,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminUser } from '@/lib/admin-auth';

interface AdminHeaderProps {
  adminUser: AdminUser;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}


export function AdminHeader({ adminUser, onToggleSidebar, sidebarOpen = true }: AdminHeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Trigger page refresh or data refetch
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left section with sidebar toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search academies, users..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {adminUser.name?.charAt(0) || adminUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {adminUser.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {adminUser.name || adminUser.email}
                    </p>
                    <p className="text-sm text-gray-500">{adminUser.email}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 mt-2">
                      {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/admin/profile');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="mr-3 h-4 w-4" />
                      Profile Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/admin/settings');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Admin Settings
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}