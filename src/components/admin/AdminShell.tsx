'use client'

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminBottomNav } from './AdminBottomNav';
import { AdminUser } from '@/lib/admin-auth-shared';
import { ConfirmProvider } from './useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

/** The pinned rail takes over from the drawer at Tailwind's `lg`. */
export const ADMIN_RAIL_QUERY = '(min-width: 1024px)';

/**
 * The admin chrome — rail/drawer, header, scrolling main and phone bottom
 * bar — with no auth. AdminLayout renders this once its admin check passes,
 * so the markup the app ships IS the markup the tests exercise.
 *
 * TWO STATES, NOT ONE. This used to be a single `sidebarOpen` boolean that
 * meant "the pinned rail is showing" at lg+ and "the modal drawer is open"
 * below it, initialised from matchMedia on first render. Any device whose
 * first render was >= 1024px wide (a tablet in landscape, a desktop window
 * later narrowed) therefore started with it TRUE, and the moment the
 * viewport went under 1024px — turning the tablet upright — that same true
 * became an open modal drawer and a blurred backdrop over the whole page
 * that nobody had asked for. Nothing closed it: the auto-close only ran on
 * navigation. It also made the server render (always "open") disagree with
 * the client on phones, which only the LoadingScreen in front of it hid.
 *
 * Now the rail and the drawer are independent: the rail defaults to shown
 * and is hidden purely by CSS below lg; the drawer defaults to closed, is
 * only ever opened by a tap, and is closed on navigation, on Escape and
 * whenever the viewport crosses into rail territory. Neither initial value
 * depends on the window, so SSR and the first client render agree.
 */
export function AdminShell({ adminUser, children }: { adminUser: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [railOpen, setRailOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // A tap on a nav link must not leave the drawer covering the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Growing into rail territory (rotating a tablet to landscape) retires the
  // drawer, so shrinking back never resurrects a stale open one.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(ADMIN_RAIL_QUERY);
    const onChange = () => { if (mq.matches) setDrawerOpen(false); };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  // Escape closes the drawer; focus moves into it on open and back to the
  // control that opened it on close.
  useEffect(() => {
    if (!drawerOpen) return;
    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    drawerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      openerRef.current?.focus?.();
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);
  const openDrawer = () => setDrawerOpen(true);

  return (
    <ConfirmProvider>
    {/* h-dvh, not h-screen: on a phone 100vh includes the area behind the
        browser toolbar. `data-surface` scopes the phone touch-target floor
        in globals.css to the admin shell. The side padding keeps content
        out from under the notch / Dynamic Island in landscape (the root
        viewport is viewport-fit=cover, so nothing else does). */}
    <div
      className="flex h-dvh bg-gray-50"
      data-surface="admin"
      style={{ paddingLeft: 'var(--safe-area-left)', paddingRight: 'var(--safe-area-right)' }}
    >
      {/* Desktop rail — pinned on the left at lg and up. */}
      {railOpen && (
        <div className="hidden lg:flex lg:flex-shrink-0" data-testid="admin-rail">
          <AdminSidebar adminUser={adminUser} />
        </div>
      )}

      {/* Phone/tablet drawer, below lg only. */}
      {drawerOpen && (
        <div className="lg:hidden">
          {/* No backdrop-filter: a full-screen blur is the most expensive
              thing iOS Safari can be asked to composite. */}
          <button
            type="button"
            aria-label={String(t('admin.dashboard.closeSidebar'))}
            onClick={closeDrawer}
            data-testid="admin-drawer-backdrop"
            className="fixed inset-0 w-full h-full z-40 bg-gray-900/50 cursor-default"
          />
          <div
            ref={drawerRef}
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 bg-white shadow-xl outline-none"
            style={{ paddingLeft: 'var(--safe-area-left)' }}
            role="dialog"
            aria-modal="true"
            aria-label={String(t('admin.header.menu'))}
          >
            <AdminSidebar adminUser={adminUser} onClose={closeDrawer} />
          </div>
        </div>
      )}

      {/* Main column. min-w-0: a flex child defaults to min-width:auto, so
          one wide table could stretch this column past the viewport. */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <AdminHeader
          adminUser={adminUser}
          railOpen={railOpen}
          onToggleRail={() => setRailOpen(o => !o)}
          drawerOpen={drawerOpen}
          onOpenDrawer={openDrawer}
        />
        {/* `relative` is load-bearing: it confines every absolutely
            positioned descendant (e.g. an sr-only <caption> far down a
            long table) to this scroller, instead of the initial containing
            block where it stretched <html> and added a second scrollbar. */}
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {children}
        </main>
        {/* In flow, not fixed: <main> ends where the bar starts, so the bar
            can never sit on top of a page's last row or button. */}
        <AdminBottomNav adminUser={adminUser} onMore={openDrawer} moreOpen={drawerOpen} />
      </div>
    </div>
    </ConfirmProvider>
  );
}
