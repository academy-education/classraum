"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Squares } from "@/components/ui/squares-background"
import { Mail, Lock, User, Building, Phone, Eye, EyeOff } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

export default function AuthPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, isLoading: authLoading, isInitialized } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("")
  const [academyId, setAcademyId] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [familyId, setFamilyId] = useState("")
  const [familyMemberId, setFamilyMemberId] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [isRoleFromUrl, setIsRoleFromUrl] = useState(false)
  const [isAcademyIdFromUrl, setIsAcademyIdFromUrl] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("")
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)

  // Handle URL parameters immediately on component mount
  useEffect(() => {
    try {
      // Process URL parameters immediately
      const urlParams = new URLSearchParams(window.location.search)
      const typeParam = urlParams.get('type')
      const accessToken = urlParams.get('access_token')
      const refreshToken = urlParams.get('refresh_token')

      // Handle password reset with tokens IMMEDIATELY
      if (typeParam === 'reset' && accessToken && refreshToken) {
        // Set session synchronously to prevent redirects
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).then(({ data, error }) => {
          if (error) {
            alert('Password reset link is invalid or has expired. Please request a new password reset.')
            return
          }

          if (data.session) {
            // Show password reset form
            setActiveTab("resetPassword")
            setIsPasswordReset(true)

            // Clean up URL parameters
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('access_token')
            newUrl.searchParams.delete('refresh_token')
            newUrl.searchParams.delete('type')
            window.history.replaceState({}, '', newUrl.toString())
          }
        }).catch(() => {
          alert('Failed to process password reset link. Please try again.')
        })

        return // Exit early for password reset
      }

      const handlePasswordResetToken = async () => {
      const roleParam = urlParams.get('role')
      const academyIdParam = urlParams.get('academy_id')
      const familyIdParam = urlParams.get('family_id')
      const familyMemberIdParam = urlParams.get('family_member_id')
      const langParam = urlParams.get('lang')
      const errorParam = urlParams.get('error')

      // Other URL parameter handling for non-password-reset flows

        // Check if this is a password reset flow
        if (typeParam === 'reset') {
          setActiveTab("resetPassword")
          setIsPasswordReset(true)
        }

      // Handle error states
      if (errorParam === 'invalid_reset_link') {
        alert('Password reset link is invalid or has expired. Please request a new password reset.')
        // Clear the error parameter from URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.toString())
      }

      // Handle family_member_id parameter (personalized registration link)
      if (familyMemberIdParam && academyIdParam) {
        // Always show signup form for family member invites
        setActiveTab("signup")
        setAcademyId(academyIdParam)
        setIsAcademyIdFromUrl(true)

        try {
          // Fetch family member data to pre-fill form
          const { data: memberData, error: memberError } = await supabase
            .from('family_members')
            .select(`
              id,
              user_name,
              email,
              phone,
              role,
              family_id,
              families!inner(academy_id)
            `)
            .eq('id', familyMemberIdParam)
            .eq('families.academy_id', academyIdParam)
            .is('user_id', null)
            .single()

          if (!memberError && memberData) {
            console.log('[Auth] Family member data loaded:', memberData)
            setFamilyMemberId(familyMemberIdParam)
            setFamilyId(memberData.family_id)
            setRole(memberData.role)
            setIsRoleFromUrl(true)
            if (memberData.user_name) setFullName(memberData.user_name)
            if (memberData.email) setEmail(memberData.email)
            if (memberData.phone) setPhone(memberData.phone)
          } else {
            console.error('[Auth] Failed to load family member data:', memberError)
          }
        } catch (error) {
          console.error('[Auth] Error fetching family member data:', error)
        }
      }
      // Pre-fill registration form if parameters present (standard flow)
      else if (roleParam || academyIdParam || familyIdParam) {
        setActiveTab("signup")
        if (roleParam) {
          setRole(roleParam)
          setIsRoleFromUrl(true)
        }
        if (academyIdParam) {
          setAcademyId(academyIdParam)
          setIsAcademyIdFromUrl(true)
        }
        if (familyIdParam) setFamilyId(familyIdParam)
      }

        // Handle language parameter - no logging needed in production
        if (langParam && (langParam === 'english' || langParam === 'korean')) {
          // Language handling if needed
        }
      }

      handlePasswordResetToken()
    } catch {
      // Silently handle URL parsing errors
    }
  }, [])

  // Handle redirect when user becomes authenticated
  useEffect(() => {
    // Wait for complete initialization including user data
    if (!isInitialized || authLoading) return

    // Don't redirect if no user
    if (!user) return

    // Don't redirect if user is actively in password reset form (but DO redirect after completion)
    if (activeTab === "resetPassword" && isPasswordReset) {
      return
    }

    // User is authenticated - redirect based on role
    // Add a small delay to ensure auth state is fully synchronized
    const handleRoleBasedRedirect = async () => {
      if (!user?.id) return

      try {
        // Fetch user role from database
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          console.error('[Auth] Error fetching user role:', error)
          // Fallback to dashboard if role fetch fails
          router.replace('/dashboard')
          return
        }

        const userRole = userInfo.role
        console.log('[Auth] User role detected:', userRole)

        // Redirect based on role
        if (userRole === 'student' || userRole === 'parent') {
          console.log('[Auth] Redirecting student/parent to mobile')
          router.replace('/mobile')
        } else if (userRole === 'teacher') {
          console.log('[Auth] Redirecting teacher to classrooms')
          router.replace('/classrooms')
        } else if (userRole === 'manager') {
          console.log('[Auth] Redirecting manager to dashboard')
          router.replace('/dashboard')
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          console.log('[Auth] Redirecting admin to admin dashboard')
          router.replace('/admin')
        } else {
          console.warn('[Auth] Unknown role, defaulting to dashboard:', userRole)
          router.replace('/dashboard')
        }
      } catch (error) {
        console.error('[Auth] Error in role-based redirect:', error)
        // Fallback to dashboard on error
        router.replace('/dashboard')
      }
    }

    setTimeout(() => {
      handleRoleBasedRedirect()
    }, 100)
  }, [isInitialized, authLoading, user, isPasswordReset, activeTab, router])

  // Check if all required signup fields are filled
  const isSignupFormValid = useMemo(() => {
    if (activeTab !== 'signup') return true
    return fullName.trim() !== '' &&
           email.trim() !== '' &&
           password.trim() !== '' &&
           signupConfirmPassword.trim() !== '' &&
           role.trim() !== '' &&
           academyId.trim() !== ''
  }, [activeTab, fullName, email, password, signupConfirmPassword, role, academyId])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("") // Clear any existing errors

    // Validate passwords match
    if (password !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please try again.')
      setLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      // Step 1: Sign up the user with Supabase Auth with metadata
      // Note: If using family_member_id (personalized link), don't pass family_id
      // because we'll update the existing family_member record instead of creating a new one
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            role: role,
            academy_id: academyId,
            phone: phone || null,
            school_name: role === 'student' ? schoolName || null : null,
            family_id: familyMemberId ? null : (familyId || null) // Don't pass family_id if using family_member_id
          }
        }
      })

      if (authError) {
        alert(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        alert("Failed to create user account")
        setLoading(false)
        return
      }

      // User profile will be created automatically by the handle_new_user trigger
      // Wait briefly for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Fallback: Check if user was created by trigger, create manually if not
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (checkError || !existingUser) {
        console.log('[Auth] Trigger did not create user, creating manually...')

        // Create user record manually
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            name: fullName,
            role: role
          })

        if (userInsertError) {
          console.error('[Auth] Failed to create user record:', userInsertError)
        } else {
          console.log('[Auth] User record created, creating role-specific records...')

          // Create role-specific record based on role and academy_id
          if (academyId) {
            if (role === 'parent') {
              await supabase.from('parents').insert({
                user_id: authData.user.id,
                academy_id: academyId,
                phone: phone || null
              })
            } else if (role === 'student') {
              await supabase.from('students').insert({
                user_id: authData.user.id,
                academy_id: academyId,
                phone: phone || null,
                school_name: schoolName || null
              })
            } else if (role === 'teacher') {
              await supabase.from('teachers').insert({
                user_id: authData.user.id,
                academy_id: academyId,
                phone: phone || null
              })
            } else if (role === 'manager') {
              await supabase.from('managers').insert({
                user_id: authData.user.id,
                academy_id: academyId,
                phone: phone || null
              })
            }
          }

          // Create user preferences
          await supabase.from('user_preferences').insert({
            user_id: authData.user.id
          })

          // If using standard family_id link (not family_member_id), create family_member record
          if (familyId && !familyMemberId && (role === 'student' || role === 'parent')) {
            await supabase.from('family_members').insert({
              user_id: authData.user.id,
              family_id: familyId,
              role: role
            })
          }

          console.log('[Auth] User setup completed')
        }
      }

      // ============================================
      // VERIFICATION & REPAIR STEP
      // ============================================
      // Always verify and create missing records, even if trigger ran
      console.log('[Auth] Verifying all required records were created...')

      // Step 2.5a: Verify role table record exists, create if missing
      if (academyId && role !== 'admin' && role !== 'super_admin') {
        const roleTable = role === 'parent' ? 'parents' :
                         role === 'student' ? 'students' :
                         role === 'teacher' ? 'teachers' :
                         role === 'manager' ? 'managers' : null

        if (roleTable) {
          // Check if role record exists
          const { data: roleRecord, error: roleCheckError } = await supabase
            .from(roleTable)
            .select('user_id')
            .eq('user_id', authData.user.id)
            .single()

          if (roleCheckError || !roleRecord) {
            console.log(`[Auth] ${roleTable} record missing, creating...`)

            // Create the missing role record
            const roleData: any = {
              user_id: authData.user.id,
              academy_id: academyId,
              phone: phone || null
            }

            // Add student-specific fields
            if (role === 'student') {
              roleData.school_name = schoolName || null
            }

            const { error: roleInsertError } = await supabase
              .from(roleTable)
              .insert(roleData)

            if (roleInsertError) {
              console.error(`[Auth] Failed to create ${roleTable} record:`, roleInsertError)
              alert(`Warning: Your ${role} profile could not be created. Please contact support.`)
            } else {
              console.log(`[Auth] ${roleTable} record created successfully`)
            }
          } else {
            console.log(`[Auth] ${roleTable} record already exists ✓`)
          }
        }
      }

      // Step 2.5b: Create family_member record if needed (standard family_id flow)
      if (familyId && !familyMemberId && (role === 'student' || role === 'parent')) {
        // Check if family_member record exists
        const { data: familyMemberRecord, error: familyMemberCheckError } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', authData.user.id)
          .eq('family_id', familyId)
          .single()

        if (familyMemberCheckError || !familyMemberRecord) {
          console.log('[Auth] family_members record missing, creating...', {
            userId: authData.user.id,
            familyId,
            role
          })

          const { error: familyMemberError } = await supabase
            .from('family_members')
            .insert({
              user_id: authData.user.id,
              family_id: familyId,
              role: role
            })

          if (familyMemberError) {
            console.error('[Auth] Failed to create family_member:', familyMemberError)
            alert('Warning: Family association could not be created. Please contact support.')
          } else {
            console.log('[Auth] family_members record created successfully')
          }
        } else {
          console.log('[Auth] family_members record already exists ✓')
        }
      }

      // Step 2.5c: Ensure user_preferences exists
      const { data: prefsRecord, error: prefsCheckError } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .single()

      if (prefsCheckError || !prefsRecord) {
        console.log('[Auth] user_preferences record missing, creating...')

        const { error: prefsInsertError } = await supabase
          .from('user_preferences')
          .insert({ user_id: authData.user.id })

        if (prefsInsertError) {
          console.error('[Auth] Failed to create user_preferences:', prefsInsertError)
          // Non-critical, don't alert user
        } else {
          console.log('[Auth] user_preferences record created successfully')
        }
      } else {
        console.log('[Auth] user_preferences record already exists ✓')
      }

      console.log('[Auth] Verification complete - all required records exist')

      // Step 2: Attempt to sign in immediately (works if email confirmation is disabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If sign in fails, user needs to confirm email
        alert("Account created! Please check your email for the confirmation link.")
      } else {
        // Success! User is signed in and profile created

        // If this signup is from a personalized family member link, update the family_member record
        // This happens AFTER sign-in to ensure we're authenticated
        if (familyMemberId && authData.user) {
          console.log('[Auth] Attempting to update family_member record:', {
            familyMemberId,
            userId: authData.user.id
          })

          const { data: updateData, error: updateError } = await supabase
            .from('family_members')
            .update({ user_id: authData.user.id })
            .eq('id', familyMemberId)
            .is('user_id', null) // Safety check: only update if not already assigned
            .select()

          if (updateError) {
            console.error('[Auth] Error updating family member:', updateError)
            // Don't fail the signup, but log the error
          } else {
            console.log('[Auth] Successfully updated family_member:', updateData)
          }
        }

        // AuthContext will handle redirection on successful sign-in
      }
      
    } catch (error) {
      alert("An unexpected error occurred: " + (error as Error).message)
    }
    
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    // Don't proceed if already loading
    if (loading) {
      return
    }

    setLoading(true)

    try {
      // Check for contaminated session state before attempting login
      const { data: preLoginSession } = await supabase.auth.getSession()
      if (preLoginSession.session) {
        await supabase.auth.signOut({ scope: 'global' })
        // Wait briefly for cleanup
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Clear all cached data to ensure fresh data for the new login session
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        let errorMessage = signInError.message || 'Sign in failed'

        // Provide more user-friendly error messages
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        }

        alert('Sign in failed: ' + errorMessage)
        setLoading(false)
      } else {
        // Clear password reset state if this is a normal login
        if (isPasswordReset) {
          setIsPasswordReset(false)
          setActiveTab("signin")
        }

        // Set loading to false and let the useEffect handle redirect after auth state updates
        setLoading(false)
      }
    } catch (error) {
      alert("An unexpected error occurred: " + (error as Error).message)
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Construct the correct redirect URL for the app subdomain
      const hostname = window.location.hostname
      const protocol = window.location.protocol

      // Handle different environments
      let redirectUrl: string
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Local development
        redirectUrl = `${protocol}//${hostname}:${window.location.port}/auth/callback`
      } else if (hostname.startsWith('app.')) {
        // Already on app subdomain - check if it's app.www.classraum.com (malformed)
        if (hostname === 'app.www.classraum.com') {
          // Fix malformed subdomain
          redirectUrl = `${protocol}//app.classraum.com/auth/callback`
        } else {
          // Normal app subdomain (app.classraum.com)
          redirectUrl = `${protocol}//${hostname}/auth/callback`
        }
      } else if (hostname === 'classraum.com' || hostname === 'www.classraum.com') {
        // Production: always use app.classraum.com
        redirectUrl = `${protocol}//app.classraum.com/auth/callback`
      } else {
        // Other domains (staging, etc) - replace www if present and add app
        const baseDomain = hostname.replace('www.', '')
        redirectUrl = `${protocol}//app.${baseDomain}/auth/callback`
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      })

      if (error) {
        alert('Error sending reset email: ' + error.message)
        setLoading(false)
        return
      }

      setResetSent(true)
      setLoading(false)
    } catch (error) {
      alert("An unexpected error occurred: " + (error as Error).message)
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate user session exists
    const { data: currentSession } = await supabase.auth.getSession()
    if (!currentSession.session) {
      alert('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match. Please try again.')
      setLoading(false)
      return
    }

    // Validate password strength
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        alert('Error updating password: ' + error.message)
        setLoading(false)
        return
      }

      // Immediately reset all form state to prevent contamination
      setNewPassword("")
      setConfirmPassword("")
      setIsPasswordReset(false)
      setActiveTab("signin") // Switch back to login form
      setLoading(false)

      // Sign out with global scope to clear ALL sessions and cached state
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' })

      if (signOutError) {
        // Log only critical errors, not in console
        alert('Session cleanup failed. Please refresh the page.')
        return
      }

      // Reset email and password fields for clean login
      setEmail("")
      setPassword("")

      // Show success message
      alert('Password updated successfully! Please sign in with your new password.')
    } catch (error) {
      alert("An unexpected error occurred: " + (error as Error).message)
      setLoading(false)
    }
  }

  // Show loading screen while checking authentication
  if (!isInitialized || authLoading) {
    return <LoadingScreen />
  }

  // Render with error boundary for hydration safety
  try {
    return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background sm:px-4">
      <Squares 
        direction="diagonal"
        speed={0.2}
        squareSize={40}
        borderColor="rgba(0, 0, 0, 0.01)" 
        hoverFillColor="rgba(0, 0, 0, 0.02)"
        className="z-0"
      />
      <div className="relative z-10 w-full space-y-8 px-4 sm:max-w-md sm:px-0 pointer-events-none">
        <div className="text-center pointer-events-none">
          <Image src="/logo.png" alt="Classraum Logo" width={256} height={256} className="mx-auto w-16 h-16" />
          
          <div className="mt-5 space-y-2">
            <h3 className="text-3xl font-bold">
              {activeTab === "signin" ? t('auth.signin.title') :
               activeTab === "signup" ? t('auth.signup.title') :
               activeTab === "resetPassword" ? t('auth.resetPassword.title') :
               t('auth.forgotPassword.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? t('auth.signin.subtitle') :
               activeTab === "signup" ? t('auth.signup.subtitle') :
               activeTab === "resetPassword" ? t('auth.resetPassword.subtitle') :
               t('auth.forgotPassword.subtitle')
              }
            </p>
          </div>
        </div>
        
        <div className="space-y-6 p-4 py-6 shadow sm:rounded-lg sm:p-6 bg-white dark:bg-gray-900/95 backdrop-blur-sm pointer-events-none">
          <form onSubmit={activeTab === "signin" ? handleSignIn : activeTab === "signup" ? handleSignUp : activeTab === "resetPassword" ? handlePasswordReset : handleForgotPassword} className="space-y-5 pointer-events-auto">
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.fullName')} <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.fullName'))}
                    className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.email')}{activeTab === "signup" && <span className="text-red-500"> *</span>}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="email"
                  required
                  value={activeTab === "forgotPassword" ? resetEmail : email}
                  onChange={(e) => activeTab === "forgotPassword" ? setResetEmail(e.target.value) : setEmail(e.target.value)}
                  placeholder={String(t('auth.form.placeholders.email'))}
                  className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            {activeTab !== "forgotPassword" && activeTab !== "resetPassword" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.password')}{activeTab === "signup" && <span className="text-red-500"> *</span>}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.password'))}
                    className="h-10 pl-10 pr-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.confirmPassword')} <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.confirmPassword'))}
                    className="h-10 pl-10 pr-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "resetPassword" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.resetPassword.newPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={String(t('auth.resetPassword.newPasswordPlaceholder'))}
                      className="h-10 pl-10 pr-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.resetPassword.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type={showResetConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={String(t('auth.resetPassword.confirmPasswordPlaceholder'))}
                      className="h-10 pl-10 pr-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
            {activeTab === "signup" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.role')} <span className="text-red-500">*</span></Label>
                  <Select value={role} onValueChange={setRole} required disabled={isRoleFromUrl}>
                    <SelectTrigger className={`!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3 ${isRoleFromUrl ? 'opacity-60 cursor-not-allowed' : ''}`} size="default">
                      <SelectValue placeholder={String(t('auth.form.placeholders.role'))} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{t('auth.form.roles.manager')}</SelectItem>
                      <SelectItem value="teacher">{t('auth.form.roles.teacher')}</SelectItem>
                      <SelectItem value="student">{t('auth.form.roles.student')}</SelectItem>
                      <SelectItem value="parent">{t('auth.form.roles.parent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.academyId')} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      required
                      value={academyId}
                      onChange={(e) => setAcademyId(e.target.value)}
                      placeholder={String(t('auth.form.placeholders.academyId'))}
                      disabled={isAcademyIdFromUrl}
                      className={`h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary ${isAcademyIdFromUrl ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
                {role === 'student' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t('auth.form.labels.schoolName')}
                    </Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder={String(t('auth.form.placeholders.schoolName'))}
                        className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('auth.form.labels.phone')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={String(t('auth.form.placeholders.phone'))}
                      className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Error message display */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm text-center">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Success message for forgot password */}
            {activeTab === "forgotPassword" && resetSent && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm text-center">
                  {t('auth.forgotPassword.emailSent')}
                </p>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={loading || (activeTab === "forgotPassword" && resetSent) || (activeTab === "signup" && !isSignupFormValid)}
              className="w-full h-10"
            >
              {loading ? (
                activeTab === "signin" ? t('auth.buttons.signingIn') :
                activeTab === "signup" ? t('auth.buttons.creatingAccount') :
                activeTab === "resetPassword" ? t('auth.resetPassword.updatingPassword') :
                t('auth.buttons.sendingReset')
              ) : (
                activeTab === "signin" ? t('auth.buttons.login') :
                activeTab === "signup" ? t('auth.buttons.signup') :
                activeTab === "resetPassword" ? t('auth.resetPassword.updatePassword') :
                t('auth.buttons.sendResetLink')
              )}
            </Button>
          </form>
          
          <div className="text-center space-y-1 pointer-events-auto">
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? (
                <>
                  {t('auth.links.noAccount')}{' '}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {t('auth.links.signupLink')}
                  </button>
                </>
              ) : activeTab === "signup" ? (
                <>
                  {t('auth.links.hasAccount')}{' '}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {t('auth.links.loginLink')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setActiveTab("signin")
                      setResetSent(false)
                    }}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    {t('auth.forgotPassword.backToLogin')}
                  </button>
                </>
              )}
            </p>
            {activeTab === "signin" && (
              <div>
                <button 
                  onClick={() => setActiveTab("forgotPassword")}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {t('auth.links.forgotPassword')}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
    )
  } catch {
    // Fallback rendering in case of hydration issues
    return (
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background sm:px-4">
        <div className="relative z-10 w-full space-y-8 sm:max-w-md">
          <div className="text-center">
            <h3 className="text-3xl font-bold">Loading...</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we load the authentication page.
            </p>
          </div>
          <div className="space-y-6 p-4 py-6 shadow sm:rounded-lg sm:p-6 bg-white dark:bg-gray-900/95">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                If this page doesn&apos;t load properly, please refresh your browser.
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }
}