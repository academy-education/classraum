'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminUser } from '@/lib/admin-auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAuth = async () => {
      try {
        console.log('AdminLayout: Starting admin auth check...');

        const { data: { session } } = await supabase.auth.getSession();
        console.log('AdminLayout: Session result:', session);

        if (!isMounted) return;

        if (!session?.user) {
          console.log('AdminLayout: No session found, redirecting to auth');
          setIsChecking(false);
          setAuthFailed(true);
          router.push('/auth?redirect=' + encodeURIComponent(pathname));
          return;
        }

        console.log('AdminLayout: Session found:', session.user.id);

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

        console.log('AdminLayout: User role:', userInfo.role);

        // Check if user has admin role
        if (!userInfo.role || !['admin', 'super_admin'].includes(userInfo.role)) {
          console.log('AdminLayout: User is not admin, redirecting');
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

        console.log('AdminLayout: Admin user authenticated:', adminUserData);
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarOpen && (
        <AdminSidebar adminUser={adminUser} />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader adminUser={adminUser} onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}