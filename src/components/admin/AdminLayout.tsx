'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminUser } from '@/lib/admin-auth-shared';
import { ConfirmProvider } from './useConfirm';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  // Default the sidebar open on desktop, closed on mobile. We use
  // matchMedia at first render so the initial paint matches the viewport
  // (avoids the drawer briefly covering the dashboard on phone reloads).
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR — default open
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  // Auto-close the sidebar when the user navigates on mobile so a tap on
  // a nav link doesn't leave the drawer covering the new page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAuth = async () => {
      try {

        const { data: { session } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (!session?.user) {
          setIsChecking(false);
          setAuthFailed(true);
          router.push('/auth?redirect=' + encodeURIComponent(pathname));
          return;
        }


        // Get user info directly from database
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!isMounted) return;

        if (userError || !userInfo) {
          console.error('AdminLayout: User fetch error:', userError);
          setIsChecking(false);
          setAuthFailed(true);
          router.push('/auth?redirect=' + encodeURIComponent(pathname));
          return;
        }


        // Check if user has admin role
        if (!userInfo.role || !['admin', 'super_admin'].includes(userInfo.role)) {
          setIsChecking(false);
          setAuthFailed(true);
          
          // Redirect based on their actual role
          if (userInfo.role === 'student' || userInfo.role === 'parent') {
            router.push('/mobile');
          } else if (userInfo.role === 'manager' || userInfo.role === 'teacher') {
            router.push('/dashboard');
          } else {
            router.push('/auth');
          }
          return;
        }

        // Set admin user data
        const adminUserData: AdminUser = {
          id: session.user.id,
          email: userInfo.email,
          name: userInfo.name,
          role: userInfo.role as 'admin' | 'super_admin',
          createdAt: new Date(userInfo.created_at)
        };

        setAdminUser(adminUserData);
        setIsChecking(false);

      } catch (error) {
        console.error('AdminLayout: Auth check error:', error);
        if (isMounted) {
          setIsChecking(false);
          setAuthFailed(true);
          router.push('/auth?redirect=' + encodeURIComponent(pathname));
        }
      }
    };

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  if (isChecking) {
    return <LoadingScreen />;
  }

  if (authFailed || !adminUser) {
    return null;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ConfirmProvider>
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar — pinned on the left at lg and up. */}
      {sidebarOpen && (
        <div className="hidden lg:flex lg:flex-shrink-0">
          <AdminSidebar adminUser={adminUser} />
        </div>
      )}

      {/* Mobile drawer — slides in from the left, with a tap-to-dismiss
          backdrop. Hidden at lg+ where the desktop rail above takes over. */}
      {sidebarOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200">
            <AdminSidebar adminUser={adminUser} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader adminUser={adminUser} onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
    </ConfirmProvider>
  );
}