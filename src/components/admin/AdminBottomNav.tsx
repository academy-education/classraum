'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FlaskConical, Users, Headphones, MoreHorizontal } from 'lucide-react';
import { AdminUser, getAdminPermissions } from '@/lib/admin-auth-shared';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

type Permission = keyof ReturnType<typeof getAdminPermissions>;

interface Tab {
  id: string;
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  permission: Permission;
}

/**
 * The four destinations that get a tab. Chosen from what the admin area is
 * used for day to day, not from page order:
 *   Dashboard — the alerts and the platform at a glance, the landing page.
 *   Bank QC   — the page the owner works in most now (review, drafts,
 *               supply), and the one with a live human-review queue.
 *   Users     — the most common lookup ("who is this account?").
 *   Support   — the only page with a live queue badge in the sidebar.
 * Everything else, including every super-admin page, is behind More, which
 * opens the full drawer. None of the four is super-admin-only; each is
 * still filtered by permission so a narrower role can never see a tab the
 * sidebar would hide.
 */
export const ADMIN_BOTTOM_TABS: Tab[] = [
  { id: 'dashboard', href: '/admin', labelKey: 'admin.bottomNav.dashboard', icon: LayoutDashboard, permission: 'viewDashboard' },
  { id: 'bankQc', href: '/admin/bank-qc', labelKey: 'admin.bottomNav.bankQc', icon: FlaskConical, permission: 'viewDashboard' },
  { id: 'users', href: '/admin/users', labelKey: 'admin.bottomNav.users', icon: Users, permission: 'manageUsers' },
  { id: 'support', href: '/admin/support', labelKey: 'admin.bottomNav.support', icon: Headphones, permission: 'viewSupport' },
];

export function isTabActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Phone bottom bar, modelled on the academy-mode DashboardBottomNavigation:
 * same h-14 row of icon-over-label buttons, primary colour for the active
 * tab, white with a top border, the home-indicator inset below, hidden at
 * lg where the pinned rail takes over.
 */
export function AdminBottomNav({
  adminUser,
  onMore,
  moreOpen,
}: {
  adminUser: AdminUser;
  onMore: () => void;
  moreOpen: boolean;
}) {
  const pathname = usePathname() ?? '';
  const { t } = useTranslation();
  const permissions = getAdminPermissions(adminUser.role);
  const tabs = ADMIN_BOTTOM_TABS.filter(tab => permissions[tab.permission]);
  const onATab = tabs.some(tab => isTabActive(tab.href, pathname));
  const moreActive = moreOpen || !onATab;

  const itemClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center flex-1 min-w-0 h-full px-1 py-2 transition-colors',
      'hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:bg-gray-100',
      active ? 'text-primary' : 'text-gray-500',
    );

  return (
    <nav
      className="lg:hidden flex-shrink-0 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      aria-label={String(t('admin.bottomNav.label'))}
      data-testid="admin-bottom-nav"
    >
      <div className="flex items-stretch justify-around h-14">
        {tabs.map(tab => {
          const active = isTabActive(tab.href, pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={itemClass(active && !moreOpen)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 mb-1" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-xs font-medium truncate max-w-full">{String(t(tab.labelKey))}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className={itemClass(moreActive)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          data-tap-exempt
        >
          <MoreHorizontal className="w-5 h-5 mb-1" strokeWidth={moreActive ? 2.25 : 1.75} />
          <span className="text-xs font-medium truncate max-w-full">{String(t('admin.bottomNav.more'))}</span>
        </button>
      </div>
    </nav>
  );
}
