"use client"

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { isDevAuthEnabled } from '@/lib/dev-auth'
import { appInitTracker } from '@/utils/appInitializationTracker'

interface AuthWrapperProps {
  children: React.ReactNode
  onUserData?: (data: { userId: string; userName: string; academyId: string; isLoading: boolean }) => void
}

export function AuthWrapper({ children, onUserData }: AuthWrapperProps) {
  const { user, isLoading, isInitialized, error, updateUserData } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)

  // Navigation-aware academy loading - don't show loading if app was previously initialized
  const [isLoadingAcademy, setIsLoadingAcademy] = useState(() => {
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
      console.log('🚫 [AuthWrapper] Suppressing academy loading - app previously initialized')
      return false
    }
    return true // Show loading only on first visit
  })

  // Check dev auth status
  useEffect(() => {
    if (isDevAuthEnabled()) {
      console.error('DEV AUTH IS STILL ENABLED! This should be disabled.')
    }
  }, [])

  // Fetch additional user data when user is available
  useEffect(() => {
    let isMounted = true

    const fetchUserDetails = async () => {
      if (!user?.id) {
        // Clear user data when no user
        setIsLoadingAcademy(false)
        if (updateUserData) {
          updateUserData({
            userId: '',
            userName: '',
            academyId: '',
            isLoading: false
          })
        }
        if (onUserData) {
          onUserData({
            userId: '',
            userName: '',
            academyId: '',
            isLoading: false
          })
        }
        return
      }

      try {

        // Get additional user info from database
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('name, email, role')
          .eq('id', user.id)
          .single()

        if (!isMounted) return

        if (userError) {
          console.error('[AuthWrapper] Error fetching user details:', userError)
          setAuthError('Failed to load user profile')
          return
        }

        const userRole = userInfo.role
        let fetchedAcademyId = null

        // Handle role-based routing for non-academy roles first
        if (userRole === 'admin' || userRole === 'super_admin') {
          console.log('[AuthWrapper] Admin user detected')
          // Let the page component handle admin routing
          setIsLoadingAcademy(false)
          if (updateUserData) {
            updateUserData({
              userId: user.id,
              userName: userInfo.name || userInfo.email || user.email || '',
              academyId: '', // Admins don't need academy_id
              isLoading: false
            })
          }
          if (onUserData) {
            onUserData({
              userId: user.id,
              userName: userInfo.name || userInfo.email || user.email || '',
              academyId: '', // Admins don't need academy_id
              isLoading: false
            })
          }
          return
        }

        // For academy-based roles, fetch academy_id from appropriate table
        if (userRole === 'manager') {
          console.log('[AuthWrapper] Manager role detected, fetching from managers table')
          try {
            const { data: managerInfo } = await supabase
              .from('managers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (managerInfo?.academy_id) {
              fetchedAcademyId = managerInfo.academy_id
              console.log('[AuthWrapper] Found academy_id in managers table:', fetchedAcademyId)
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching manager data:', error)
          }
        } else if (userRole === 'teacher') {
          console.log('[AuthWrapper] Teacher role detected, fetching from teachers table')
          try {
            const { data: teacherInfo } = await supabase
              .from('teachers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (teacherInfo?.academy_id) {
              fetchedAcademyId = teacherInfo.academy_id
              console.log('[AuthWrapper] Found academy_id in teachers table:', fetchedAcademyId)
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching teacher data:', error)
          }
        } else if (userRole === 'student') {
          console.log('[AuthWrapper] Student role detected, fetching from students table')
          try {
            // Fetch ALL academies for multi-academy support
            const { data: studentAcademies } = await supabase
              .from('students')
              .select('academy_id')
              .eq('user_id', user.id)
              .eq('active', true)

            if (studentAcademies && studentAcademies.length > 0) {
              // Use first academy as the primary academyId for backward compatibility
              fetchedAcademyId = studentAcademies[0].academy_id
              // Store all academy IDs for multi-academy features
              const allAcademyIds = studentAcademies.map(s => s.academy_id)
              console.log('[AuthWrapper] Found academy_ids in students table:', allAcademyIds)

              // Pass all academy IDs to context
              if (updateUserData && isMounted) {
                updateUserData({
                  userId: user.id,
                  userName: userInfo.name || userInfo.email || user.email || '',
                  academyId: fetchedAcademyId,
                  academyIds: allAcademyIds,
                  isLoading: false
                })
              }
              if (onUserData && isMounted) {
                onUserData({
                  userId: user.id,
                  userName: userInfo.name || userInfo.email || user.email || '',
                  academyId: fetchedAcademyId,
                  isLoading: false
                })
              }
              setIsLoadingAcademy(false)
              appInitTracker.markUserDataInitialized()
              return // Early return since we've already set the user data
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching student data:', error)
          }
        } else if (userRole === 'parent') {
          console.log('[AuthWrapper] Parent role detected, fetching from parents table')
          try {
            const { data: parentInfo } = await supabase
              .from('parents')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (parentInfo?.academy_id) {
              fetchedAcademyId = parentInfo.academy_id
              console.log('[AuthWrapper] Found academy_id in parents table:', fetchedAcademyId)
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching parent data:', error)
          }
        } else {
          console.warn('[AuthWrapper] Unknown/invalid role detected:', userRole)
          setAuthError('Invalid user role')
          setIsLoadingAcademy(false)
          return
        }

        // Validate academy access
        if (!fetchedAcademyId || fetchedAcademyId === 'null' || fetchedAcademyId === '') {
          console.warn('[AuthWrapper] User has no academy access')
          // For admins, this is normal - they don't need academy access
          if (userRole !== 'admin' && userRole !== 'super_admin') {
            console.error('[AuthWrapper] Non-admin user missing academy_id')
            setAuthError('No academy access - please contact support')
          }
        } else {
          // Validate academy exists (optional check, don't fail if it doesn't)
          try {
            const { data: academyInfo, error: academyError } = await supabase
              .from('academies')
              .select('id, name')
              .eq('id', fetchedAcademyId)
              .single()

            if (academyError || !academyInfo) {
              console.warn('[AuthWrapper] Academy not found or error:', academyError)
            } else {
              console.log('[AuthWrapper] Academy validation passed:', academyInfo.name)
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error validating academy:', error)
          }
        }

        // Update state
        setIsLoadingAcademy(false)

        // Mark app initialization complete
        appInitTracker.markUserDataInitialized()

        console.log('[AuthWrapper] Setting user data:', {
          userId: user.id,
          userName: userInfo.name || userInfo.email || user.email || '',
          academyId: fetchedAcademyId || '',
          userRole: userRole
        })

        // Notify parent component and update context
        if (updateUserData && isMounted) {
          updateUserData({
            userId: user.id,
            userName: userInfo.name || userInfo.email || user.email || '',
            academyId: fetchedAcademyId || '', // Ensure it's never null/undefined
            isLoading: false
          })
        }
        if (onUserData && isMounted) {
          onUserData({
            userId: user.id,
            userName: userInfo.name || userInfo.email || user.email || '',
            academyId: fetchedAcademyId || '', // Ensure it's never null/undefined
            isLoading: false
          })
        }

      } catch (error) {
        console.error('[AuthWrapper] Error in fetchUserDetails:', error)
        if (isMounted) {
          setAuthError('Authentication error')
          setIsLoadingAcademy(false)
        }
      }
    }

    if (isInitialized && !isLoading) {
      fetchUserDetails()
    }

    return () => {
      isMounted = false
    }
  }, [user, isInitialized, isLoading]) // Only re-run when user or auth state changes

  // Don't show loading screen - let layout and page components handle loading states
  // This prevents flickering when content loads

  // Show error state but don't block rendering
  if (error || authError) {
    console.error('[AuthWrapper] Auth error:', error || authError)
    // Still render children but log the error - let RoleBasedAuthWrapper handle redirects
  }

  // Always render children - let RoleBasedAuthWrapper handle authentication checks
  return <>{children}</>
}