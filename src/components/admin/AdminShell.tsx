'use client'

import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminBottomNav } from './AdminBottomNav';
import { AdminUser } from '@/lib/admin-auth-shared';
import { ConfirmProvider } from './useConfirm';
import { useNativeApp } from '@/hooks/useNativeApp';

/**
 * The admin chrome — pinned rail at lg+, header, scrolling main, and below lg
 * the bottom bar — with no auth. AdminLayout renders this once its admin
 * check passes, so the markup the app ships IS the markup the tests exercise.
 *
 * NO DRAWER. Below lg the whole navigation is the bottom bar and its shelves
 * (AdminBottomNav), the same pattern as the academy-mode bar. There used to be
 * an off-canvas drawer opened from a header button or the bar's More; it was
 * a second way to reach the same pages, and its open state was the source of
 * the "uninvited drawer when a tablet is turned upright" bug. The rail is
 * independent: shown by default, hidden purely by CSS below lg, and toggled
 * at lg+ from the header. Its initial value does not depend on the window, so
 * SSR and the first client render agree.
 */
export function AdminShell({ adminUser, children }: { adminUser: AdminUser; children: React.ReactNode }) {
  // Same native wiring as (app)/layout.tsx: status bar icon style and colour,
  // splash hide, deep links and the Android back button. The admin surface
  // never called it, so in the app the back button exited instead of going
  // back and the status bar kept whatever the previous screen left it.
  useNativeApp({ statusBarStyle: 'dark', statusBarColor: '#FFFFFF' });
  const [railOpen, setRailOpen] = useState(true);

  return (
    <ConfirmProvider>
    {/* h-dvh, not h-screen: on a phone 100vh includes the area behind the
        browser toolbar. `data-surface` scopes the phone touch-target floor
        in globals.css to the admin shell. The side padding keeps content
        out from under the notch / Dynamic Island in landscape (the root
        viewport is viewport-fit=cover, so nothing else does). The top
        padding does the same for the status bar: in the Capacitor shell the
        StatusBar plugin overlays the WebView, so without it the header sat
        under the clock and battery icons. The white strip fills that gap the
        way (app)/layout.tsx does, so it reads as part of the header. */}
    <div
      className="fixed top-0 left-0 right-0 bg-white z-[100]"
      style={{ height: 'var(--safe-area-top)' }}
      aria-hidden="true"
    />
    <div
      className="flex h-dvh bg-gray-50"
      data-surface="admin"
      style={{
        paddingTop: 'var(--safe-area-top)',
        paddingLeft: 'var(--safe-area-left)',
        paddingRight: 'var(--safe-area-right)',
      }}
    >
      {/* Desktop rail — pinned on the left at lg and up. */}
      {railOpen && (
        <div className="hidden lg:flex lg:flex-shrink-0" data-testid="admin-rail">
          <AdminSidebar adminUser={adminUser} />
        </div>
      )}

      {/* Main column. min-w-0: a flex child defaults to min-width:auto, so
          one wide table could stretch this column past the viewport. */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <AdminHeader
          adminUser={adminUser}
          railOpen={railOpen}
          onToggleRail={() => setRailOpen(o => !o)}
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
        <AdminBottomNav adminUser={adminUser} />
      </div>
    </div>
    </ConfirmProvider>
  );
}
