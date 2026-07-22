'use client'

import React, { useState, useEffect } from 'react';
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
  LogOut,
  Banknote,
  ScrollText,
  Bug,
  TrendingUp,
  Webhook,
  GraduationCap
} from 'lucide-react';
import { AdminUser, getAdminPermissions } from '@/lib/admin-auth-shared';
import { supabase } from '@/lib/supabase';
import { performLogout } from '@/lib/logout';
import { useTranslation } from '@/hooks/useTranslation';

interface AdminSidebarProps {
  adminUser: AdminUser;
}

interface NavigationItem {
  // Translation key suffixes under `admin.sidebar.*` — see locales/en.json.
  // We keep the keys instead of resolved strings so the arrays can live at
  // module scope without re-running on every language change.
  nameKey: string;
  descriptionKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: keyof ReturnType<typeof getAdminPermissions>;
}

const navigationItems: NavigationItem[] = [
  { nameKey: 'dashboard',      descriptionKey: 'dashboardDesc',      href: '/admin',                 icon: LayoutDashboard, permission: 'viewDashboard' },
  { nameKey: 'academies',      descriptionKey: 'academiesDesc',      href: '/admin/academies',       icon: Building2,       permission: 'manageAcademies' },
  { nameKey: 'subscriptions',  descriptionKey: 'subscriptionsDesc',  href: '/admin/subscriptions',   icon: CreditCard,      permission: 'viewSubscriptions' },
  { nameKey: 'settlements',    descriptionKey: 'settlementsDesc',    href: '/admin/settlements',     icon: Banknote,        permission: 'viewSettlements' },
  { nameKey: 'users',          descriptionKey: 'usersDesc',          href: '/admin/users',           icon: Users,           permission: 'manageUsers' },
  { nameKey: 'analytics',      descriptionKey: 'analyticsDesc',      href: '/admin/analytics',       icon: BarChart3,       permission: 'viewAnalytics' },
  { nameKey: 'study',          descriptionKey: 'studyDesc',          href: '/admin/study',           icon: GraduationCap,   permission: 'viewDashboard' },
  { nameKey: 'support',        descriptionKey: 'supportDesc',        href: '/admin/support',         icon: Headphones,      permission: 'viewSupport' },
  { nameKey: 'commentReports', descriptionKey: 'commentReportsDesc', href: '/admin/comment-reports', icon: MessageSquare,   permission: 'manageSupport' },
];

const superAdminItems: NavigationItem[] = [
  { nameKey: 'activityLogs',    descriptionKey: 'activityLogsDesc',    href: '/admin/activity-logs',      icon: ScrollText,   permission: undefined },
  { nameKey: 'errorLogs',       descriptionKey: 'errorLogsDesc',       href: '/admin/error-logs',         icon: Bug,          permission: undefined },
  { nameKey: 'usageMonitoring', descriptionKey: 'usageMonitoringDesc', href: '/admin/subscription-usage', icon: TrendingUp,   permission: undefined },
  { nameKey: 'webhookEvents',   descriptionKey: 'webhookEventsDesc',   href: '/admin/webhook-events',     icon: Webhook,      permission: undefined },
  { nameKey: 'system',          descriptionKey: 'systemDesc',          href: '/admin/system',             icon: ShieldCheck,  permission: undefined },
  { nameKey: 'settings',        descriptionKey: 'settingsDesc',        href: '/admin/settings',           icon: Settings,     permission: undefined },
];

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [supportTicketCount, setSupportTicketCount] = useState(0);
  const permissions = getAdminPermissions(adminUser.role);

  useEffect(() => {
    loadCounts();

    // Refresh counts every 60 seconds
    const interval = setInterval(loadCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadCounts = async () => {
    try {
      // Load alert count
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .eq('acknowledged', false);

      setAlertCount(alertsCount || 0);

      // Load open support ticket count
      const { count: ticketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);

      setSupportTicketCount(ticketsCount || 0);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

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
    try {
      await performLogout();
      router.replace('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  // Split nav into two visual sections:
  //   "core"  — operational pages every admin uses (top group)
  //   "system" — super-admin-only system/audit pages (separated header)
  const coreItems = filteredNavItems
  const systemItems = filteredSuperAdminItems

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200/70 flex flex-col">
      {/* Header — logo + admin label */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <Image
            src="/text_logo.png"
            alt="Classraum Logo"
            width={150}
            height={50}
            className="h-9 w-auto"
            priority
            quality={100}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-900 text-white text-[10px] font-semibold tracking-wider uppercase">
          <ShieldCheck className="w-3 h-3" />
          {String(t('admin.users.roles.admin'))}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Core section */}
        <SidebarSectionLabel>{String(t('admin.sidebar.main'))}</SidebarSectionLabel>
        <div className="space-y-0.5 mb-5">
          {coreItems.map(item => (
            <SidebarLink
              key={item.nameKey}
              item={item}
              isActive={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))}
              badgeCount={item.href === '/admin/support' ? supportTicketCount : 0}
            />
          ))}
        </div>

        {/* System section (super-admin only) */}
        {systemItems.length > 0 && (
          <>
            <SidebarSectionLabel>{String(t('admin.sidebar.superAdminTools'))}</SidebarSectionLabel>
            <div className="space-y-0.5">
              {systemItems.map(item => (
                <SidebarLink
                  key={item.nameKey}
                  item={item}
                  isActive={pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom: alerts + user */}
      <div className="px-3 pt-3 pb-3 border-t border-gray-100">
        <button className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Bell className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          <span className="flex-1 text-left">{String(t('admin.dashboard.alerts'))}</span>
          {alertCount > 0 && (
            <span className="inline-flex items-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
              {alertCount}
            </span>
          )}
        </button>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2885e8] to-[#1f6fc7] flex items-center justify-center text-white font-semibold text-sm shadow-sm shadow-[#2885e8]/20 flex-shrink-0">
              {adminUser.name?.charAt(0) || adminUser.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{adminUser.name || adminUser.email}</p>
              <p className="text-[11px] text-gray-500 truncate">
                {adminUser.role === 'super_admin'
                  ? String(t('admin.users.roles.superAdmin'))
                  : String(t('admin.users.roles.admin'))}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
              title={loading ? String(t('admin.sidebar.loading')) : String(t('admin.sidebar.signOut'))}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Section label rendered above nav groups. Small caps to set hierarchy
// without competing with the active item.
function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
      {children}
    </div>
  )
}

// Single nav row. Active state uses brand color via a subtle wash + left
// indicator bar for clear visual scan, matching the patterns used by Linear /
// Vercel sidebars.
function SidebarLink({
  item,
  isActive,
  badgeCount = 0,
}: {
  item: NavigationItem
  isActive: boolean
  badgeCount?: number
}) {
  const { t } = useTranslation();
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-[#2885e8]/8 text-[#1f6fc7]'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
      title={String(t(`admin.sidebar.${item.descriptionKey}`))}
    >
      {/* Left indicator bar on active */}
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-[#2885e8]" />
      )}
      <item.icon
        className={`w-4 h-4 transition-colors ${
          isActive ? 'text-[#2885e8]' : 'text-gray-400 group-hover:text-gray-600'
        }`}
      />
      <span className="flex-1 truncate">{String(t(`admin.sidebar.${item.nameKey}`))}</span>
      {badgeCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200/60">
          {badgeCount}
        </span>
      )}
    </Link>
  )
}