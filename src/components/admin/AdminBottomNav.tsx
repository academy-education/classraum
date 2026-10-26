'use client'

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, GraduationCap, Users, MoreHorizontal, X } from 'lucide-react';
import { AdminUser, getAdminPermissions } from '@/lib/admin-auth-shared';
import { db } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { navigationItems, superAdminItems, NavigationItem } from './AdminSidebar';

interface Group {
  id: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Sidebar hrefs, in shelf order. Every sidebar page belongs to exactly one group. */
  hrefs: string[];
}

/**
 * Below lg the bar is the whole admin navigation; there is no drawer. It
 * follows the academy-mode DashboardBottomNavigation: a row of groups, and a
 * group with several pages opens a shelf of them above the bar, while a
 * group with one page navigates straight there.
 *
 * The pages themselves come from AdminSidebar's lists, so the rail and the
 * bar cannot disagree about labels, icons or permissions. A group only says
 * which hrefs it holds; a page the role cannot see drops out, and a group left
 * with none disappears (a regular admin has no More, since all of it is
 * super-admin).
 */
export const ADMIN_BOTTOM_GROUPS: Group[] = [
  { id: 'home', labelKey: 'admin.bottomNav.dashboard', icon: LayoutDashboard, hrefs: ['/admin'] },
  { id: 'business', labelKey: 'admin.bottomNav.business', icon: Building2, hrefs: ['/admin/academies', '/admin/subscriptions', '/admin/settlements', '/admin/subscription-usage'] },
  { id: 'study', labelKey: 'admin.bottomNav.study', icon: GraduationCap, hrefs: ['/admin/study', '/admin/bank-qc', '/admin/analytics'] },
  { id: 'people', labelKey: 'admin.bottomNav.people', icon: Users, hrefs: ['/admin/users', '/admin/support', '/admin/comment-reports', '/admin/nickname-reports'] },
  { id: 'more', labelKey: 'admin.bottomNav.more', icon: MoreHorizontal, hrefs: ['/admin/activity-logs', '/admin/error-logs', '/admin/webhook-events', '/admin/system', '/admin/settings'] },
];

export function isTabActive(href: string, pathname: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(href + '/');
}

/** The pages this role may open, from the same lists and filter as the rail. */
export function visibleAdminPages(adminUser: AdminUser): NavigationItem[] {
  const permissions = getAdminPermissions(adminUser.role);
  const allowed = (item: NavigationItem) => !item.permission || permissions[item.permission];
  return [
    ...navigationItems.filter(allowed),
    ...(adminUser.role === 'super_admin' ? superAdminItems.filter(allowed) : []),
  ];
}

const SUPPORT_HREF = '/admin/support';

export function AdminBottomNav({ adminUser }: { adminUser: AdminUser }) {
  const pathname = usePathname() ?? '';
  const { t } = useTranslation();
  const [openShelf, setOpenShelf] = useState<string | null>(null);
  const [supportCount, setSupportCount] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  const pages = visibleAdminPages(adminUser);
  const byHref = new Map(pages.map(p => [p.href, p]));
  const groups = ADMIN_BOTTOM_GROUPS
    .map(g => ({ ...g, pages: g.hrefs.map(h => byHref.get(h)).filter((p): p is NavigationItem => !!p) }))
    .filter(g => g.pages.length > 0);
  const canSeeSupport = byHref.has(SUPPORT_HREF);

  // The rail's support badge is not visible below lg, so the bar carries it.
  // Same table and predicate as the Support page and the rail.
  useEffect(() => {
    if (!canSeeSupport) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await db.from('chat_conversations').select('*', { count: 'exact', head: true }).neq('status', 'closed');
      if (!cancelled) setSupportCount(count || 0);
    };
    load().catch(() => {});
    const id = setInterval(() => { load().catch(() => {}); }, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [canSeeSupport]);

  useEffect(() => { setOpenShelf(null); }, [pathname]);

  useEffect(() => {
    if (!openShelf) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenShelf(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenShelf(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openShelf]);

  const shelf = groups.find(g => g.id === openShelf);
  const badgeFor = (href: string) => (href === SUPPORT_HREF ? supportCount : 0);
  const gridCols = (n: number) => (n <= 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-4');

  return (
    <div ref={barRef} className="lg:hidden relative flex-shrink-0 bg-white">
      {shelf && (
        <div
          className="absolute left-0 right-0 bottom-full z-50 bg-white rounded-t-2xl shadow-2xl border-t border-gray-100"
          role="dialog"
          aria-label={String(t(shelf.labelKey))}
          data-testid="admin-shelf"
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{String(t(shelf.labelKey))}</h3>
              <button
                type="button"
                onClick={() => setOpenShelf(null)}
                className="inline-flex items-center justify-center w-9 h-9 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={String(t('admin.bottomNav.closeShelf'))}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className={cn('grid gap-2', gridCols(shelf.pages.length))}>
              {shelf.pages.map(page => {
                const active = isTabActive(page.href, pathname);
                const Icon = page.icon;
                const badge = badgeFor(page.href);
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={() => setOpenShelf(null)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl text-center transition-colors active:scale-95',
                      active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    <span className="relative">
                      <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-gray-500')} />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium leading-tight break-keep">{String(t(`admin.sidebar.${page.nameKey}`))}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="bg-white border-t border-gray-200"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
        aria-label={String(t('admin.bottomNav.label'))}
        data-testid="admin-bottom-nav"
      >
        <div className="flex items-stretch justify-around h-14">
          {groups.map(group => {
            const Icon = group.icon;
            const active = group.pages.some(p => isTabActive(p.href, pathname));
            const open = openShelf === group.id;
            const lit = open || (active && !openShelf);
            const badge = group.pages.reduce((n, p) => n + badgeFor(p.href), 0);
            const cls = cn(
              'flex flex-col items-center justify-center flex-1 min-w-0 h-full px-1 py-2 transition-colors',
              'hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:bg-gray-100',
              open && 'bg-gray-50',
              lit ? 'text-primary' : 'text-gray-500',
            );
            const inner = (
              <>
                <span className="relative">
                  <Icon className="w-5 h-5 mb-1" strokeWidth={lit ? 2.25 : 1.75} />
                  {badge > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : group.pages.length > 1 ? (
                    <span className={cn('absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full', open ? 'bg-primary' : 'bg-gray-300')} />
                  ) : null}
                </span>
                <span className="text-xs font-medium truncate max-w-full">{String(t(group.labelKey))}</span>
              </>
            );
            if (group.pages.length === 1) {
              return (
                <Link key={group.id} href={group.pages[0].href} className={cls} aria-current={active ? 'page' : undefined}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setOpenShelf(open ? null : group.id)}
                className={cls}
                aria-haspopup="dialog"
                aria-expanded={open}
                data-tap-exempt
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
