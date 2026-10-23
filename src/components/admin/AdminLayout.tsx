'use client'

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/supabase';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AdminShell } from './AdminShell';
import { AdminUser } from '@/lib/admin-auth-shared';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  useEffect(() => {
    let isMounted = true;

    const checkAdminAuth = async () => {
      try {

        const { data: { session } } = await db.auth.getSession();

        if (!isMounted) return;

        if (!session?.user) {
          setIsChecking(false);
          setAuthFailed(true);
          router.push('/auth?redirect=' + encodeURIComponent(pathname));
          return;
        }


        // Get user info directly from database
        // No email here: not selectable on users since migration 120. The
        // admin's own address is on the session.
        const { data: userInfo, error: userError } = await db
          .from('users')
          .select('id, name, role, created_at')
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
          email: session.user.email ?? '',
          name: userInfo.name,
          role: userInfo.role as 'admin' | 'super_admin',
          // users.created_at is nullable in the schema (it only has a now()
          // default); fall back to the auth record's created_at, which is
          // always present, rather than inventing a date.
          createdAt: new Date(userInfo.created_at ?? session.user.created_at)
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

  return <AdminShell adminUser={adminUser}>{children}</AdminShell>;
}
