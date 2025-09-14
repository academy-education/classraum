'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Headphones, 
  Settings,
  ShieldCheck,
  Bell,
  LogOut
} from 'lucide-react';
import { AdminUser, getAdminPermissions } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase';

interface AdminSidebarProps {
  adminUser: AdminUser;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof ReturnType<typeof getAdminPermissions>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'viewDashboard',
    description: 'Overview and key metrics'
  },
  {
    name: 'Academies',
    href: '/admin/academies',
    icon: Building2,
    permission: 'manageAcademies',
    description: 'Manage academy accounts'
  },
  {
    name: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCard,
    permission: 'viewSubscriptions',
    description: 'Subscription and billing management'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'manageUsers',
    description: 'User account management'
  },
  {
    name: 'Communications',
    href: '/admin/communications',
    icon: MessageSquare,
    permission: 'manageSupport',
    description: 'Messaging and announcements'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    permission: 'viewAnalytics',
    description: 'Revenue and usage analytics'
  },
  {
    name: 'Support',
    href: '/admin/support',
    icon: Headphones,
    permission: 'viewSupport',
    description: 'Customer support tickets'
  },
];

const superAdminItems: NavigationItem[] = [
  {
    name: 'System',
    href: '/admin/system',
    icon: ShieldCheck,
    permission: undefined,
    description: 'System settings and logs'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: undefined,
    description: 'Platform configuration'
  },
];

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const permissions = getAdminPermissions(adminUser.role);

  const filteredNavItems = navigationItems.filter(item => {
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  const filteredSuperAdminItems = adminUser.role === 'super_admin' 
    ? superAdminItems.filter(item => {
        if (!item.permission) return true;
        return permissions[item.permission];
      })
    : [];

  const allNavItems = [...filteredNavItems, ...filteredSuperAdminItems];

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Company Header - matching main app */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Image 
            src="/text_logo.png" 
            alt="Classraum Logo" 
            width={240} 
            height={80} 
            className="h-16 w-auto" 
            priority
            quality={100}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </div>
      </div>


      {/* Main Navigation - matching main app style */}
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/admin' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                  isActive 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.href === '/admin/support' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        3
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section - matching main app */}
      <div className="p-4 border-t border-gray-100">
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
            <Bell className="w-4 h-4" />
            <span>System Alerts</span>
            <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              2
            </span>
          </button>
        </div>

        {/* User Section - matching main app */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {adminUser.name?.charAt(0) || adminUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{adminUser.name || adminUser.email}</p>
              <p className="text-xs text-gray-500">{adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title={loading ? 'Loading...' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}