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
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Squares } from "@/components/ui/squares-background"
import { Mail, Lock, User, Building, Phone, Eye, EyeOff, CheckCircle2, BookOpen, Ticket } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { useToast } from "@/hooks/use-toast"
import { readStoredMode } from "@/lib/study/currentMode"
import { authHeaders } from "@/lib/auth-headers"
import { savePendingReferral, clearPendingReferral } from "@/lib/study/pending-referral"

/**
 * POST the referral code to the redeem endpoint using the current session.
 * Terminal outcomes (success, already redeemed, self-referral, unknown
 * code) clear the stashed pending code; transient/network failures keep it
 * so the study home's claim banner can retry. Never throws — referral
 * redemption must not break the signup flow.
 */
async function redeemReferralCode(code: string): Promise<void> {
  try {
    const headers = await authHeaders()
    const res = await fetch('/api/study/referral/redeem', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code }),
    })
    const json: { code?: string } = await res.json().catch(() => ({}))
    const terminal = res.ok ||
      ['already_redeemed', 'self_referral', 'unknown_code', 'missing_code'].includes(json?.code ?? '')
    if (terminal) clearPendingReferral()
  } catch {
    // Network hiccup — keep the pending code for the home banner.
  }
}

export default function AuthPage() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { toast } = useToast()
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
  // Signup door: 'study' = self-serve study account (role=student, no
  // academy), 'academy' = the classic invite/manual flow. Invite links
  // force 'academy' and hide the choice.
  const [signupIntent, setSignupIntent] = useState<'study' | 'academy'>('study')
  const [isInviteSignup, setIsInviteSignup] = useState(false)
  // Study-door referral code (optional). Prefilled + locked when the
  // student arrives via a friend's invite link (/auth?intent=study&ref=CODE),
  // mirroring the academy_id-from-URL pattern above.
  const [referralCode, setReferralCode] = useState("")
  const [isReferralCodeFromUrl, setIsReferralCodeFromUrl] = useState(false)
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
            toast({ title: t('auth.resetPassword.invalidLink') as string || 'Password reset link is invalid or has expired. Please request a new password reset.', variant: 'destructive' })
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
          toast({ title: t('auth.resetPassword.processFailed') as string || 'Failed to process password reset link. Please try again.', variant: 'destructive' })
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
        toast({ title: t('auth.resetPassword.invalidLink') as string || 'Password reset link is invalid or has expired. Please request a new password reset.', variant: 'destructive' })
        // Clear the error parameter from URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        window.history.replaceState({}, '', newUrl.toString())
      }

      // Explicit door pre-selection from marketing links (?intent=study|academy).
      const intentParam = urlParams.get('intent')
      if (intentParam === 'study' || intentParam === 'academy') {
        setActiveTab("signup")
        setSignupIntent(intentParam)
      }

      // Friend-invite link (?ref=CODE) — study signups only. Prefill and
      // lock the referral input, same pattern as role/academy_id above.
      // Also stash the code (localStorage) right away so it survives an
      // email-confirmation round-trip; the study home's claim banner is
      // the fallback redeemer if the immediate post-signup redeem never
      // runs. Ignored for academy invite links, which never carry ?ref.
      const refParam = urlParams.get('ref')
      if (refParam && refParam.trim() && !academyIdParam && !familyIdParam && !familyMemberIdParam) {
        const normalizedRef = refParam.trim().toUpperCase()
        setActiveTab("signup")
        setSignupIntent('study')
        setReferralCode(normalizedRef)
        setIsReferralCodeFromUrl(true)
        savePendingReferral(normalizedRef)
      }

      // Handle family_member_id parameter (personalized registration link)
      if (familyMemberIdParam && academyIdParam) {
        // Always show signup form for family member invites
        setActiveTab("signup")
        setSignupIntent('academy')
        setIsInviteSignup(true)
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
        setSignupIntent('academy')
        setIsInviteSignup(true)
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

    // Check for invite parameters and redirect to mobile with those params
    const checkInviteParams = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const roleParam = urlParams.get('role')
      const academyIdParam = urlParams.get('academy_id')
      const familyIdParam = urlParams.get('family_id')
      const familyMemberIdParam = urlParams.get('family_member_id')

      // Check if this is an invite link for student/parent
      if ((roleParam === 'student' || roleParam === 'parent') && academyIdParam) {
        // Redirect to mobile page with invite params
        const inviteParams = new URLSearchParams()
        inviteParams.set('invite', 'true')
        if (roleParam) inviteParams.set('role', roleParam)
        if (academyIdParam) inviteParams.set('academy_id', academyIdParam)
        if (familyIdParam) inviteParams.set('family_id', familyIdParam)
        if (familyMemberIdParam) inviteParams.set('family_member_id', familyMemberIdParam)

        router.replace(`/mobile?${inviteParams.toString()}`)
        return true
      }

      return false
    }

    // User is authenticated - check for invite params first, then redirect based on role
    const handleAuthenticatedUser = async () => {
      if (!user?.id) return

      // Check if this is an invite link - redirect to mobile with params
      const hasInvite = checkInviteParams()
      if (hasInvite) return // Already redirecting to mobile

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

        // Redirect based on role. Study-only students (no academy
        // membership) go straight to Study — the hub's Grades tile
        // would be an empty dead end for them. Academy students land
        // in their LAST-USED mode (persisted in localStorage); the
        // /mobile/start hub only shows on a true first visit. Parents
        // skip the hub since Study is a student-only experience.
        if (userRole === 'student') {
          const { count } = await supabase
            .from('students')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('active', true)
          const hasAcademy = (count ?? 0) > 0
          const storedMode = readStoredMode()
          const target = !hasAcademy
            ? '/mobile/study'
            : storedMode === 'study'
              ? '/mobile/study'
              : storedMode === 'grades'
                ? '/mobile'
                : '/mobile/start'
          console.log('[Auth] Redirecting student to', target)
          router.replace(target)
        } else if (userRole === 'parent') {
          // Parents default to Grades but keep their last-used mode —
          // study is open to them too (ModeChip offers the switch).
          const parentTarget = readStoredMode() === 'study' ? '/mobile/study' : '/mobile'
          console.log('[Auth] Redirecting parent to', parentTarget)
          router.replace(parentTarget)
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
      handleAuthenticatedUser()
    }, 100)
  }, [isInitialized, authLoading, user, isPasswordReset, activeTab, router])

  // Check if all required signup fields are filled. The study door
  // needs no role/academy — those only apply to the academy flow.
  const isSignupFormValid = useMemo(() => {
    if (activeTab !== 'signup') return true
    const baseValid = fullName.trim() !== '' &&
           email.trim() !== '' &&
           password.trim() !== '' &&
           signupConfirmPassword.trim() !== ''
    // Study door collects a phone number (there's no academy to reach
    // these students through, so it's the only contact channel).
    if (signupIntent === 'study') return baseValid && phone.trim() !== ''
    return baseValid && role.trim() !== '' && academyId.trim() !== ''
  }, [activeTab, fullName, email, password, signupConfirmPassword, role, academyId, signupIntent, phone])

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

    // The study door always creates a student with no academy —
    // whatever is left in the academy-flow fields is ignored.
    const signupRole = signupIntent === 'study' ? 'student' : role
    const signupAcademyId = signupIntent === 'study' ? '' : academyId

    try {
      // Check subscription user limit before signup (for invite links with academy_id)
      if (signupAcademyId && (signupRole === 'student' || signupRole === 'teacher' || signupRole === 'parent')) {
        try {
          const checkType = signupRole === 'teacher' ? 'teacher_add' : 'student_add'
          const limitCheckResponse = await fetch('/api/subscription/check-limits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-academy-id': signupAcademyId
            },
            body: JSON.stringify({ checkType })
          })

          const limitCheck = await limitCheckResponse.json()

          if (limitCheck.success && !limitCheck.allowed) {
            setErrorMessage(limitCheck.message || t('subscription.userLimitReachedSignup') as string)
            setLoading(false)
            return
          }
        } catch (limitError) {
          // Don't block signup if limit check fails
          console.warn('User limit check failed during signup, continuing:', limitError)
        }
      }

      // Step 1: Sign up the user with Supabase Auth with metadata
      // Note: If using family_member_id (personalized link), don't pass family_id
      // because we'll update the existing family_member record instead of creating a new one
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            role: signupRole,
            academy_id: signupAcademyId,
            phone: phone || null,
            school_name: signupRole === 'student' ? schoolName || null : null,
            family_id: familyMemberId ? null : (familyId || null) // Don't pass family_id if using family_member_id
          }
        }
      })

      if (authError) {
        toast({ title: authError.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      if (!authData.user) {
        toast({ title: t('auth.signup.accountCreationFailed') as string || 'Failed to create user account', variant: 'destructive' })
        setLoading(false)
        return
      }

      // Study signups with a referral code: persist the code NOW (account
      // exists but may still need email confirmation, i.e. no session yet).
      // If the immediate sign-in below succeeds we redeem right away;
      // otherwise the study home's ReferralClaimBanner picks the stashed
      // code up on the first authenticated load after confirmation.
      const pendingReferral = signupIntent === 'study' ? referralCode.trim().toUpperCase() : ''
      if (pendingReferral) savePendingReferral(pendingReferral)

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
            role: signupRole,
            phone: phone || null
          })

        if (userInsertError) {
          console.error('[Auth] Failed to create user record:', userInsertError)
        } else {
          console.log('[Auth] User record created, creating signupRole-specific records...')

          // Create signupRole-specific record based on signupRole and academy_id
          if (signupAcademyId) {
            if (signupRole === 'parent') {
              await supabase.from('parents').insert({
                user_id: authData.user.id,
                academy_id: signupAcademyId,
                phone: phone || null
              })
            } else if (signupRole === 'student') {
              await supabase.from('students').insert({
                user_id: authData.user.id,
                academy_id: signupAcademyId,
                phone: phone || null,
                school_name: schoolName || null
              })
            } else if (signupRole === 'teacher') {
              await supabase.from('teachers').insert({
                user_id: authData.user.id,
                academy_id: signupAcademyId,
                phone: phone || null
              })
            } else if (signupRole === 'manager') {
              await supabase.from('managers').insert({
                user_id: authData.user.id,
                academy_id: signupAcademyId,
                phone: phone || null
              })
            }
          }

          // Create user preferences
          await supabase.from('user_preferences').insert({
            user_id: authData.user.id
          })

          // If using standard family_id link (not family_member_id), create family_member record
          if (familyId && !familyMemberId && (signupRole === 'student' || signupRole === 'parent')) {
            await supabase.from('family_members').insert({
              user_id: authData.user.id,
              family_id: familyId,
              role: signupRole
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

      // Step 2.5a: Verify signupRole table record exists, create if missing
      if (signupAcademyId && signupRole !== 'admin' && signupRole !== 'super_admin') {
        const roleTable = signupRole === 'parent' ? 'parents' :
                         signupRole === 'student' ? 'students' :
                         signupRole === 'teacher' ? 'teachers' :
                         signupRole === 'manager' ? 'managers' : null

        if (roleTable) {
          // Check if signupRole record exists
          const { data: roleRecord, error: roleCheckError } = await supabase
            .from(roleTable)
            .select('user_id')
            .eq('user_id', authData.user.id)
            .single()

          if (roleCheckError || !roleRecord) {
            console.log(`[Auth] ${roleTable} record missing, creating...`)

            // Create the missing signupRole record
            const roleData: any = {
              user_id: authData.user.id,
              academy_id: signupAcademyId,
              phone: phone || null
            }

            // Add student-specific fields
            if (signupRole === 'student') {
              roleData.school_name = schoolName || null
            }

            const { error: roleInsertError } = await supabase
              .from(roleTable)
              .insert(roleData)

            if (roleInsertError) {
              console.error(`[Auth] Failed to create ${roleTable} record:`, roleInsertError)
              toast({ title: t('auth.signup.profileCreationFailed') as string || `Warning: Your ${signupRole} profile could not be created. Please contact support.`, variant: 'warning' })
            } else {
              console.log(`[Auth] ${roleTable} record created successfully`)
            }
          } else {
            console.log(`[Auth] ${roleTable} record already exists ✓`)
          }
        }
      }

      // Step 2.5b: Create family_member record if needed (standard family_id flow)
      if (familyId && !familyMemberId && (signupRole === 'student' || signupRole === 'parent')) {
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
            signupRole
          })

          const { error: familyMemberError } = await supabase
            .from('family_members')
            .insert({
              user_id: authData.user.id,
              family_id: familyId,
              role: signupRole
            })

          if (familyMemberError) {
            console.error('[Auth] Failed to create family_member:', familyMemberError)
            toast({ title: t('auth.signup.familyAssociationFailed') as string || 'Warning: Family association could not be created. Please contact support.', variant: 'warning' })
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
        toast({ title: t('auth.signup.checkEmail') as string || 'Account created! Please check your email for the confirmation link.', variant: 'success' })
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

        // Redeem the referral code now that a session exists (the redeem
        // API needs a Bearer token). Awaited so the credits are granted
        // before the role-based redirect lands the student on the study
        // home; failures are non-fatal — a transient error leaves the
        // stashed code for the home claim banner to retry, while terminal
        // outcomes clear it so the banner never nags.
        if (pendingReferral) {
          await redeemReferralCode(pendingReferral)
        }

        // Send welcome email (don't await - fire and forget)
        fetch('/api/emails/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: fullName,
            role: signupRole,
            language
          })
        }).catch((err) => {
          console.error('[Auth] Failed to send welcome email:', err)
        })

        // AuthContext will handle redirection on successful sign-in
      }
      
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' })
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
      // Check for contaminated session state before attempting login.
      // scope: 'local' on purpose — we only need to clear THIS browser's
      // stale session before a fresh sign-in. A global revoke here (a) logs
      // the user out of their other devices just for logging in again, and
      // (b) throws "Invalid Refresh Token: Refresh Token Not Found" when the
      // stored refresh token was already revoked elsewhere, surfacing a raw
      // AuthApiError on the auth page.
      try {
        const { data: preLoginSession } = await supabase.auth.getSession()
        if (preLoginSession.session) {
          await supabase.auth.signOut({ scope: 'local' })
          // Wait briefly for cleanup
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      } catch {
        // Stale/revoked session — signInWithPassword below replaces the
        // local session anyway, so cleanup failure is not fatal.
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

        // Detect a banned account — this is how Supabase reports the
        // ban set by /api/account/delete. Route the user to the reactivation
        // page instead of showing a generic failure.
        const lowerMsg = errorMessage.toLowerCase()
        const isBanned =
          lowerMsg.includes('banned') ||
          lowerMsg.includes('user_banned') ||
          lowerMsg.includes('not_allowed')

        if (isBanned) {
          setLoading(false)
          // Pass email so the reactivation form can pre-fill it.
          router.push(`/account/reactivate?email=${encodeURIComponent(email)}`)
          return
        }

        // Provide more user-friendly error messages
        if (errorMessage.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        }

        toast({ title: t('auth.signin.failed') as string || 'Sign in failed', description: errorMessage, variant: 'destructive' })
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
      // Never surface raw auth-internal errors (e.g. "Invalid Refresh
      // Token: Refresh Token Not Found") — they describe stale token
      // state, not anything the user did wrong.
      const raw = (error as Error).message || ''
      const friendly = /refresh token/i.test(raw)
        ? (language === 'korean'
            ? '이전 세션이 만료되었어요. 다시 로그인해 주세요.'
            : 'Your previous session expired. Please try signing in again.')
        : raw || (t('auth.signin.failed') as string || 'Sign in failed')
      toast({ title: t('auth.signin.failed') as string || 'Sign in failed', description: friendly, variant: 'destructive' })
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
        toast({ title: t('auth.forgotPassword.sendError') as string || 'Error sending reset email', description: error.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      setResetSent(true)
      setLoading(false)
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' })
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate user session exists
    const { data: currentSession } = await supabase.auth.getSession()
    if (!currentSession.session) {
      toast({ title: t('auth.resetPassword.sessionExpired') as string || 'Session expired. Please sign in again.', variant: 'destructive' })
      setLoading(false)
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({ title: t('auth.resetPassword.mismatch') as string || 'Passwords do not match. Please try again.', variant: 'destructive' })
      setLoading(false)
      return
    }

    // Validate password strength
    if (newPassword.length < 6) {
      toast({ title: t('auth.resetPassword.tooShort') as string || 'Password must be at least 6 characters long.', variant: 'destructive' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast({ title: t('auth.resetPassword.updateError') as string || 'Error updating password', description: error.message, variant: 'destructive' })
        setLoading(false)
        return
      }

      // Immediately reset all form state to prevent contamination
      setNewPassword("")
      setConfirmPassword("")
      setIsPasswordReset(false)
      setActiveTab("signin") // Switch back to login form
      setLoading(false)

      // Sign out with global scope to clear ALL sessions and cached state.
      // Global is intentional here (password just changed — revoke every
      // device), but tolerate a throw from already-stale tokens so the
      // catch below doesn't toast a raw AuthApiError.
      let signOutError: unknown = null
      try {
        ({ error: signOutError } = await supabase.auth.signOut({ scope: 'global' }))
      } catch (e) {
        signOutError = e
      }

      if (signOutError) {
        toast({ title: t('auth.resetPassword.cleanupFailed') as string || 'Session cleanup failed. Please refresh the page.', variant: 'warning' })
        return
      }

      // Reset email and password fields for clean login
      setEmail("")
      setPassword("")

      // Show success message
      toast({ title: t('auth.resetPassword.success') as string || 'Password updated successfully! Please sign in with your new password.', variant: 'success' })
    } catch (error) {
      toast({ title: (error as Error).message, variant: 'destructive' })
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
      <div className="relative z-10 w-full space-y-6 px-4 sm:max-w-md sm:px-0 pointer-events-none">
        <div className="text-center pointer-events-none">
          <Image src="/logo.png" alt="Classraum Logo" width={256} height={256} className="mx-auto w-16 h-16" />

          <div className="mt-5 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              {activeTab === "signin" ? t('auth.signin.eyebrow') || 'Sign in' :
               activeTab === "signup" ? t('auth.signup.eyebrow') || 'Sign up' :
               activeTab === "resetPassword" ? t('auth.resetPassword.eyebrow') || 'Reset password' :
               t('auth.forgotPassword.eyebrow') || 'Forgot password'}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {activeTab === "signin" ? t('auth.signin.title') :
               activeTab === "signup" ? t('auth.signup.title') :
               activeTab === "resetPassword" ? t('auth.resetPassword.title') :
               t('auth.forgotPassword.title')}
            </h1>
            <p className="text-sm text-gray-500">
              {activeTab === "signin" ? t('auth.signin.subtitle') :
               activeTab === "signup" ? t('auth.signup.subtitle') :
               activeTab === "resetPassword" ? t('auth.resetPassword.subtitle') :
               t('auth.forgotPassword.subtitle')
              }
            </p>
          </div>
        </div>

        <Card className="p-6 sm:p-7 backdrop-blur-sm pointer-events-none gap-5">
          <form onSubmit={activeTab === "signin" ? handleSignIn : activeTab === "signup" ? handleSignUp : activeTab === "resetPassword" ? handlePasswordReset : handleForgotPassword} className="space-y-5 pointer-events-auto">
            {activeTab === "signup" && !isInviteSignup && (
              /* Segmented door toggle — mirrors the shared TabsList /
                 TabsTrigger styling (muted track, white active pill) so
                 it reads as the same control family as the rest of the
                 app. Height matches the h-10 inputs below. */
              <div
                role="radiogroup"
                aria-label={String(t('auth.signup.intentLabel'))}
                className="bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center rounded-lg p-[3px]"
              >
                {([
                  { key: 'study' as const, icon: BookOpen, title: t('auth.signup.intentStudy') },
                  { key: 'academy' as const, icon: Building, title: t('auth.signup.intentAcademy') },
                ]).map(door => {
                  const active = signupIntent === door.key
                  const Icon = door.icon
                  return (
                    <button
                      key={door.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setSignupIntent(door.key)
                        setErrorMessage("")
                        // Leaving the academy door discards its fields so a
                        // half-filled role/academy never leaks into a study
                        // signup (and vice versa the selects start clean).
                        if (door.key === 'study') { setRole(''); setAcademyId('') }
                      }}
                      className={`inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {door.title}
                    </button>
                  )
                })}
              </div>
            )}
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.fullName')} <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.fullName'))}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.email')}{activeTab === "signup" && <span className="text-rose-500"> *</span>}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="email"
                  required
                  value={activeTab === "forgotPassword" ? resetEmail : email}
                  onChange={(e) => activeTab === "forgotPassword" ? setResetEmail(e.target.value) : setEmail(e.target.value)}
                  placeholder={String(t('auth.form.placeholders.email'))}
                  className="pl-10"
                />
              </div>
            </div>
            {activeTab !== "forgotPassword" && activeTab !== "resetPassword" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.password')}{activeTab === "signup" && <span className="text-rose-500"> *</span>}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.password'))}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.confirmPassword')} <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.confirmPassword'))}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
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
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)} aria-label={showNewPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
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
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)} aria-label={showResetConfirmPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                    >
                      {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
            {activeTab === "signup" && signupIntent === 'study' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('auth.form.labels.phone')} <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={String(t('auth.form.placeholders.phone'))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('auth.form.labels.referralCode')}
                  </Label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder={String(t('auth.form.placeholders.referralCode'))}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={16}
                      disabled={isReferralCodeFromUrl}
                      className={`pl-10 uppercase ${isReferralCodeFromUrl ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  {isReferralCodeFromUrl && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('auth.signup.referralApplied')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
                  {t('auth.signup.studyNote')}
                </p>
              </>
            )}
            {activeTab === "signup" && signupIntent === 'academy' && (
              <>
                {!isInviteSignup && (
                  <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
                    {t('auth.signup.academyInviteHint')}
                  </p>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.role')} <span className="text-rose-500">*</span></Label>
                  <Select value={role} onValueChange={setRole} required disabled={isRoleFromUrl}>
                    <SelectTrigger className={`!h-10 w-full ${isRoleFromUrl ? 'opacity-60 cursor-not-allowed' : ''}`} size="default">
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
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.academyId')} <span className="text-rose-500">*</span></Label>
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
                        className="pl-10"
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
                      className="pl-10"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Error message display */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 ring-1 ring-rose-100 rounded-xl flex items-start gap-2">
                <p className="text-rose-700 text-sm">
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Success message for forgot password */}
            {activeTab === "forgotPassword" && resetSent && (
              <div className="p-3 bg-emerald-50 ring-1 ring-emerald-100 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <p className="text-emerald-700 text-sm">
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

        </Card>
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