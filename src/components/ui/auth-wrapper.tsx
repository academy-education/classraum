"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/loading-screen'

interface AuthWrapperProps {
  children: React.ReactNode
  onUserData?: (data: { userId: string; userName: string; academyId: string }) => void
}

export function AuthWrapper({ children, onUserData }: AuthWrapperProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [authFailed, setAuthFailed] = useState(false)
  
  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        console.log('AuthWrapper: Starting auth check...')
        
        // Check if dev auth is still enabled (it shouldn't be)
        const { isDevAuthEnabled } = await import('@/lib/dev-auth')
        if (isDevAuthEnabled()) {
          console.error('DEV AUTH IS STILL ENABLED! This should be disabled.')
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        console.log('AuthWrapper: Session result:', session)
        
        if (!isMounted) return
        
        if (!session?.user) {
          console.log('AuthWrapper: No session found, redirecting to auth')
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth')
          return
        }
        
        console.log('AuthWrapper: Session found:', session.user.id)

        // Get user info directly from database
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!isMounted) return
        
        if (userError) {
          console.error('User fetch error:', userError)
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth')
          return
        }

        const role = userInfo.role

        if (!role || (role !== 'manager' && role !== 'teacher')) {
          setIsChecking(false)
          setAuthFailed(true)
          if (role === 'student' || role === 'parent') {
            router.push('/mobile')
          } else {
            router.push('/auth')
          }
          return
        }

        // Pass user data to parent component
        console.log('AuthWrapper: Real user data:', {
          userId: session.user.id,
          userName: userInfo.name || userInfo.email,
          academyId: userInfo.academy_id,
          userInfo: userInfo
        })
        console.log('AuthWrapper: Full userInfo object:', userInfo)
        console.log('AuthWrapper: Available keys in userInfo:', Object.keys(userInfo))
        console.log('AuthWrapper: userInfo.academy_id:', userInfo.academy_id)
        console.log('AuthWrapper: userInfo.academyId:', userInfo.academyId)
        console.log('AuthWrapper: userInfo.academy:', userInfo.academy)
        
        // Check if we need to query a different table for managers
        if (userInfo.role === 'manager' && !userInfo.academy_id) {
          console.log('AuthWrapper: Manager role detected, checking managers table')
          try {
            const { data: managerInfo } = await supabase
              .from('managers')
              .select('*')
              .eq('user_id', session.user.id)
              .single()
            
            console.log('AuthWrapper: Manager data:', managerInfo)
            if (managerInfo && managerInfo.academy_id) {
              userInfo.academy_id = managerInfo.academy_id
              console.log('AuthWrapper: Found academy_id in managers table:', managerInfo.academy_id)
            }
          } catch (error) {
            console.warn('AuthWrapper: Error fetching manager data:', error)
          }
        }
        
        const academyId = userInfo.academy_id
        
        if (onUserData && isMounted) {
          onUserData({
            userId: session.user.id,
            userName: userInfo.name || userInfo.email,
            academyId: academyId
          })
        }

        if (isMounted) {
          setIsChecking(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (isMounted) {
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth')
        }
      }
    }

    checkAuth()
    
    return () => {
      isMounted = false
    }
  }, [router, onUserData])

  if (isChecking) {
    return <LoadingScreen />
  }

  if (authFailed) {
    return <LoadingScreen />
  }

  return <>{children}</>
}