'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AppRootPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check authentication status
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          // Not authenticated, redirect to auth page
          router.replace('/auth')
          return
        }

        // Get user role from database
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (error || !userInfo) {
          console.error('Error fetching user info:', error)
          router.replace('/auth')
          return
        }

        // Redirect based on role
        const userRole = userInfo.role
        if (userRole === 'student' || userRole === 'parent') {
          router.replace('/mobile')
        } else if (userRole === 'manager' || userRole === 'teacher') {
          router.replace('/dashboard')
        } else {
          // Unknown role, redirect to auth
          router.replace('/auth')
        }
      } catch (error) {
        console.error('Auth check error:', error)
        router.replace('/auth')
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Simple loading state
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}