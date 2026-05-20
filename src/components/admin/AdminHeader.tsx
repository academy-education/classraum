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
import { AdminUser } from '@/lib/admin-auth';
import { performLogout } from '@/lib/logout';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';

interface AdminHeaderProps {
  adminUser: AdminUser;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}


export function AdminHeader({ adminUser, onToggleSidebar, sidebarOpen = true }: AdminHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    try {
      await performLogout();
      router.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      router.replace('/auth');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Trigger page refresh or data refetch
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={sidebarOpen ? String(t('admin.header.hideSidebar')) : String(t('admin.header.showSidebar'))}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>

        {/* Right: actions cluster */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none transition-colors group-focus-within:text-[#2885e8]" />
              <input
                type="text"
                placeholder={String(t('admin.header.search'))}
                className="w-72 pl-10 pr-3 h-9 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#2885e8] focus:ring-4 focus:ring-[#2885e8]/15 transition-all"
              />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={String(t('admin.header.refresh'))}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title={String(t('admin.header.notifications'))}
          >
            <Bell className="h-4 w-4" />
            {/* Unread dot with subtle ring */}
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </span>
          </button>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2 h-9 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2885e8] to-[#1f6fc7] flex items-center justify-center text-white font-semibold text-xs shadow-sm shadow-[#2885e8]/20">
                {adminUser.name?.charAt(0) || adminUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">
                  {adminUser.name || String(t('admin.header.adminUserFallback'))}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {adminUser.role === 'super_admin'
                    ? String(t('admin.users.roles.superAdmin'))
                    : String(t('admin.users.roles.admin'))}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl shadow-gray-900/10 ring-1 ring-gray-200/70 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {adminUser.name || adminUser.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{adminUser.email}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#2885e8]/10 text-[#1f6fc7] mt-2">
                    {adminUser.role === 'super_admin'
                      ? String(t('admin.users.roles.superAdmin'))
                      : String(t('admin.users.roles.admin'))}
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
                    <User className="mr-3 h-4 w-4 text-gray-400" />
                    {String(t('admin.header.profileSettings'))}
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/admin/settings');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="mr-3 h-4 w-4 text-gray-400" />
                    {String(t('admin.header.adminSettings'))}
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-rose-700 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    {String(t('admin.header.signOut'))}
                  </button>
                </div>
              </div>
            )}
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