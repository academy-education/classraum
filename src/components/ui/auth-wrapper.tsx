"use client"

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/supabase'
import { isDevAuthEnabled } from '@/lib/dev-auth'
import { appInitTracker } from '@/utils/appInitializationTracker'
import { NamePrompt, type NamePromptUser } from '@/components/ui/name-prompt'
import { SocialOnboardingModal } from '@/components/ui/social-onboarding-modal'
import { needsSocialOnboarding } from '@/lib/auth/social-onboarding'

interface AuthWrapperProps {
  children: React.ReactNode
  onUserData?: (data: { userId: string; userName: string; academyId: string; isLoading: boolean }) => void
}

export function AuthWrapper({ children, onUserData }: AuthWrapperProps) {
  const { user, isLoading, isInitialized, error, updateUserData } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)
  // The row the 성/이름 re-prompt reads. Null until the users row is fetched;
  // NamePrompt decides for itself whether anything is shown.
  const [namePromptUser, setNamePromptUser] = useState<NamePromptUser | null>(null)
  /* The blocking first-run step for social signups. Held separately from
     namePromptUser because it needs the PHONE and the identity providers,
     neither of which the name re-prompt cares about. */
  const [socialOnboarding, setSocialOnboarding] = useState<{
    needed: boolean
    metadata: Record<string, unknown> | null
  }>({ needed: false, metadata: null })
  const [profileReloadKey, setProfileReloadKey] = useState(0)

  // Navigation-aware academy loading - don't show loading if app was previously initialized
  const [isLoadingAcademy, setIsLoadingAcademy] = useState(() => {
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
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
        setNamePromptUser(null)
        setSocialOnboarding({ needed: false, metadata: null })
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
        // family_name/given_name/name_confirmed_at/name_prompt_snoozed_until
        // drive the re-prompt (191 of 444 rows have NULL split columns).
        const { data: userInfo, error: userError } = await db
          .from('users')
          .select('id, name, email, role, phone, family_name, given_name, name_confirmed_at, name_prompt_snoozed_until')
          .eq('id', user.id)
          .single()

        if (!isMounted) return

        if (userError) {
          console.error('[AuthWrapper] Error fetching user details:', userError)
          setAuthError('Failed to load user profile')
          return
        }

        setNamePromptUser({
          id: userInfo.id,
          name: userInfo.name,
          family_name: userInfo.family_name,
          given_name: userInfo.given_name,
          name_confirmed_at: userInfo.name_confirmed_at,
          name_prompt_snoozed_until: userInfo.name_prompt_snoozed_until,
        })

        /* Social signups arrive with no phone and often a provider
           nickname for a name. The gate is the IDENTITY, never the
           missing field: 392 of 448 existing accounts have a NULL phone
           and every one of them is email-only, so this can never wall
           them. See src/lib/auth/social-onboarding.ts. */
        const providers = (user.app_metadata?.providers as string[] | undefined)
          ?? (user.app_metadata?.provider ? [user.app_metadata.provider as string] : [])
        setSocialOnboarding({
          needed: needsSocialOnboarding({
            providers,
            phone: userInfo.phone,
            family_name: userInfo.family_name,
            given_name: userInfo.given_name,
            name_confirmed_at: userInfo.name_confirmed_at,
          }),
          metadata: (user.user_metadata ?? null) as Record<string, unknown> | null,
        })

        const userRole = userInfo.role
        let fetchedAcademyId = null

        // Handle role-based routing for non-academy roles first
        if (userRole === 'admin' || userRole === 'super_admin') {
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
          try {
            const { data: managerInfo } = await db
              .from('managers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (managerInfo?.academy_id) {
              fetchedAcademyId = managerInfo.academy_id
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching manager data:', error)
          }
        } else if (userRole === 'teacher') {
          try {
            const { data: teacherInfo } = await db
              .from('teachers')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (teacherInfo?.academy_id) {
              fetchedAcademyId = teacherInfo.academy_id
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching teacher data:', error)
          }
        } else if (userRole === 'student') {
          try {
            // Fetch ALL academies for multi-academy support
            const { data: studentAcademies } = await db
              .from('students')
              .select('academy_id')
              .eq('user_id', user.id)
              .eq('active', true)

            if (studentAcademies && studentAcademies.length > 0) {
              // Use first academy as the primary academyId for backward compatibility
              fetchedAcademyId = studentAcademies[0].academy_id
              // Store all academy IDs for multi-academy features
              const allAcademyIds = studentAcademies.map(s => s.academy_id)

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
            // No active academy membership → a study-only student
            // (self-serve signup). Valid account state: they get the
            // Study surface with no academy data instead of an error.
            if (updateUserData && isMounted) {
              updateUserData({
                userId: user.id,
                userName: userInfo.name || userInfo.email || user.email || '',
                academyId: '',
                academyIds: [],
                isLoading: false
              })
            }
            if (onUserData && isMounted) {
              onUserData({
                userId: user.id,
                userName: userInfo.name || userInfo.email || user.email || '',
                academyId: '',
                isLoading: false
              })
            }
            setIsLoadingAcademy(false)
            appInitTracker.markUserDataInitialized()
            return
          } catch (error) {
            console.warn('[AuthWrapper] Error fetching student data:', error)
          }
        } else if (userRole === 'parent') {
          try {
            const { data: parentInfo } = await db
              .from('parents')
              .select('academy_id')
              .eq('user_id', user.id)
              .single()

            if (parentInfo?.academy_id) {
              fetchedAcademyId = parentInfo.academy_id
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
          // admin/super_admin already returned above (see the early return on
          // userRole), and the else branch rejects unknown roles, so anything
          // reaching here is a manager/teacher/parent that genuinely has no academy.
          console.error('[AuthWrapper] Non-admin user missing academy_id')
          setAuthError('No academy access - please contact support')
        } else {
          // Validate academy exists (optional check, don't fail if it doesn't)
          try {
            const { data: academyInfo, error: academyError } = await db
              .from('academies')
              .select('id, name')
              .eq('id', fetchedAcademyId)
              .single()

            if (academyError || !academyInfo) {
              console.warn('[AuthWrapper] Academy not found or error:', academyError)
            }
          } catch (error) {
            console.warn('[AuthWrapper] Error validating academy:', error)
          }
        }

        // Update state
        setIsLoadingAcademy(false)

        // Mark app initialization complete
        appInitTracker.markUserDataInitialized()


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
  }, [user, isInitialized, isLoading, profileReloadKey]) // Re-runs after onboarding writes, so `needed` flips false

  // Don't show loading screen - let layout and page components handle loading states
  // This prevents flickering when content loads

  // Show error state but don't block rendering
  if (error || authError) {
    console.error('[AuthWrapper] Auth error:', error || authError)
    // Still render children but log the error - let RoleBasedAuthWrapper handle redirects
  }

  // Always render children - let RoleBasedAuthWrapper handle authentication
  // checks. The name prompt renders alongside them and never gates them: it
  // is a banner (or, on /settings, a dismissible modal), never a wall.
  return (
    <>
      {children}
      {/* The social-signup step is a WALL and the name re-prompt is not,
          so when both would apply the wall wins and the banner is
          suppressed — otherwise a dismissible banner would render behind
          a modal that cannot be dismissed, offering a link nobody can
          reach. Completing the wall settles the name too, so the banner
          has nothing left to ask. */}
      {socialOnboarding.needed ? (
        <SocialOnboardingModal
          isOpen
          userMetadata={socialOnboarding.metadata}
          onCompleted={() => {
            setSocialOnboarding(s => ({ ...s, needed: false }))
            // Re-read the row rather than trusting the local flip: the
            // server is authoritative about what was actually written.
            setProfileReloadKey(k => k + 1)
          }}
        />
      ) : (
        <NamePrompt user={namePromptUser} />
      )}
    </>
  )
}