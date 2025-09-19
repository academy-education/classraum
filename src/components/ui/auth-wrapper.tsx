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
        const userStatus = userInfo.status || 'active' // Default to active if not specified

        // Enhanced role validation with comprehensive edge cases
        console.log('AuthWrapper: User validation:', { role, userStatus, userId: session.user.id })

        // Check for missing or invalid role
        if (!role) {
          console.warn('AuthWrapper: User has no role assigned, redirecting to auth')
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth?error=no_role')
          return
        }

        // Handle suspended or inactive users
        if (userStatus === 'suspended' || userStatus === 'inactive' || userStatus === 'banned') {
          console.warn('AuthWrapper: User account is suspended/inactive/banned:', userStatus)
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth?error=account_suspended')
          return
        }

        // Handle pending role assignments or account approval
        if (userStatus === 'pending' || userStatus === 'pending_approval') {
          console.warn('AuthWrapper: User account is pending approval')
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth?error=account_pending')
          return
        }

        // Validate role-based routing with comprehensive checks
        if (role !== 'manager' && role !== 'teacher') {
          setIsChecking(false)
          setAuthFailed(true)

          if (role === 'student' || role === 'parent') {
            console.log('AuthWrapper: Student/parent redirected to mobile')
            router.push('/mobile')
          } else if (role === 'admin' || role === 'super_admin') {
            console.log('AuthWrapper: Admin user detected, redirecting to admin dashboard')
            router.push('/admin')
          } else if (role === 'guest' || role === 'visitor') {
            console.log('AuthWrapper: Guest user needs to complete registration')
            router.push('/auth?error=guest_access')
          } else {
            console.warn('AuthWrapper: Unknown/invalid role detected:', role)
            router.push('/auth?error=invalid_role')
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

        // Validate academy access for managers and teachers
        if (!academyId || academyId === 'null' || academyId === '') {
          console.warn('AuthWrapper: User has no academy access')
          setIsChecking(false)
          setAuthFailed(true)
          router.push('/auth?error=no_academy_access')
          return
        }

        // Additional validation: Check if academy exists
        try {
          const { data: academyInfo, error: academyError } = await supabase
            .from('academies')
            .select('id, name')
            .eq('id', academyId)
            .single()

          if (academyError || !academyInfo) {
            console.warn('AuthWrapper: Academy not found or error:', academyError)
            setIsChecking(false)
            setAuthFailed(true)
            router.push('/auth?error=academy_not_found')
            return
          }

          console.log('AuthWrapper: Academy validation passed:', academyInfo.name)
        } catch (error) {
          console.warn('AuthWrapper: Error validating academy:', error)
          // Don't block access for validation errors, just log them
        }

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
    return null
  }

  return <>{children}</>
}