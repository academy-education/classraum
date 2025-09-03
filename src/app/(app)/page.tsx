"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/loading-screen'

export default function AppRootPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Add a small delay to avoid conflicts with auth page
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          // Not authenticated, redirect to auth
          router.replace('/auth')
          return
        }

        // Get user role for routing
        const { data: userInfo } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        const userRole = userInfo?.role

        // Redirect based on role
        if (userRole === 'student' || userRole === 'parent') {
          router.replace('/mobile')
        } else {
          router.replace('/dashboard')
        }
      } catch (error) {
        console.error('Root redirect error:', error)
        router.replace('/auth')
      }
    }

    // Call the redirect function
    checkAuthAndRedirect()
    
    // Add a fallback redirect after 8 seconds if nothing happens
    // This is shorter than the LoadingScreen's 10 second safety timeout
    const fallbackTimer = setTimeout(() => {
      console.warn('Redirect timeout - forcing redirect to auth')
      router.replace('/auth')
    }, 8000)
    
    return () => clearTimeout(fallbackTimer)
  }, [router])

  return <LoadingScreen />
}