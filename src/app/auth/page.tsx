"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/supabase"
import Image from "next/image"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Squares } from "@/components/ui/squares-background"
import { Mail, Lock, Building, Phone, Eye, EyeOff, CheckCircle2, BookOpen, Ticket } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { useToast } from "@/hooks/use-toast"
import { readStoredMode } from "@/lib/study/currentMode"
import { studentEntryTarget } from "@/lib/study/student-entry"
import { authHeaders } from "@/lib/auth-headers"
import { savePendingReferral, clearPendingReferral, readPendingReferral } from "@/lib/study/pending-referral"
import { safeNotificationPath } from "@/lib/study/notification-link"
import { useKeyboardInset } from '@/hooks/useKeyboardInset'
import { NameFields, validateNameFields } from "@/components/ui/name-fields"
import { joinName, splitName, buildNameUpdate } from "@/lib/name"
import { SocialAuthButtons } from "@/components/ui/social-auth-buttons"
import { PROVIDER_LABEL, type OAuthProvider } from "@/lib/auth/oauth-providers"
import { startOAuthSignIn, completeOAuthReturn } from "@/lib/auth/oauth-signin"
import { browserContextStore } from "@/lib/auth/oauth-context"
import { isOAuthFlow, OAUTH_FLOW_PARAM } from "@/lib/auth/oauth-callback"
import { outcomeMessageKey } from "@/lib/auth/oauth-outcome"
import { savePendingLink, peekPendingLink, takePendingLinkFor, clearPendingLink } from "@/lib/auth/pending-link"
import { isNativeApp, openExternalUrl } from "@/lib/nativeApp"
import { useOAuthDeepLink } from "@/hooks/useOAuthDeepLink"

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
  // How much of the screen the on-screen keyboard is eating. 0 on
  // desktop and whenever the keyboard is closed, so the layout below is
  // byte-for-byte the old one in that case.
  const keyboardInset = useKeyboardInset()
  const mainRef = useRef<HTMLElement>(null)
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { user, isLoading: authLoading, isInitialized } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  // 성/이름 are the real state. `fullName` below is DERIVED from them —
  // it is still what `users.name`, the auth metadata `name` key and the
  // welcome email receive, because `users.name` stays authoritative and
  // must be written in the same statement as the split columns.
  const [familyName, setFamilyName] = useState("")
  const [givenName, setGivenName] = useState("")
  const [nameErrors, setNameErrors] = useState<{ familyName?: string; givenName?: string }>({})
  const fullName = joinName(familyName, givenName)
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

  // ── Social sign-in ────────────────────────────────────────────────
  // Every one of these is inert while NEXT_PUBLIC_OAUTH_PROVIDERS is
  // unset: the strip renders null, so nothing can set `oauthProvider`,
  // and `flow=oauth` can only appear on a URL we ourselves built.
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null)
  const [socialNotice, setSocialNotice] = useState<{ text: string; tone: 'error' | 'info' } | null>(null)
  // True from the FIRST render when this load is an OAuth return, so the
  // role-based redirect below cannot fire before the invite has been
  // attached. Computed lazily rather than in an effect: an effect runs
  // after the first render, and the redirect effect runs then too.
  const [oauthReturning, setOauthReturning] = useState<boolean>(
    () => typeof window !== 'undefined' && isOAuthFlow(window.location.search)
  )
  const [pendingLinkProvider, setPendingLinkProvider] = useState<OAuthProvider | null>(null)

  // Native returns arrive as a classraum:// deep link, not a navigation.
  // No-op on web and in every build where the flag is off (nothing can
  // have started a flow, so no such link can arrive).
  useOAuthDeepLink()

  // Bring the focused field into the visible strip once the keyboard has
  // finished opening.
  //
  // Shrinking <main> above is what makes this POSSIBLE — it gives the
  // container something to scroll — but it does not by itself move an
  // already-focused input that the keyboard has just covered. The two
  // together are the fix; either alone leaves a case broken.
  //
  // The delay is not a guess at animation length: the inset arrives from
  // `keyboardWillShow`, before the layout has reflowed to the new height,
  // so scrolling on the same frame would scroll the OLD geometry. One
  // frame after paint is enough, and 'nearest' means a field already in
  // view does not jump.
  //
  // Driven by FOCUS, not by the inset changing. The first version keyed
  // off `keyboardInset` alone, which only fires when the keyboard opens
  // or resizes — so filling the form top-down, where the keyboard is
  // ALREADY up by the time you reach 전화번호, scrolled nothing at all.
  // That is the reported bug: the last field sat half-behind the keys.
  // `focusin` fires for every field, including the ones tapped while the
  // keyboard is open.
  //
  // 'center', not 'nearest': 'nearest' scrolls the MINIMUM, so a field
  // whose top edge is barely visible above the keyboard already counts
  // as in view and does not move. Centring is what a person expects when
  // they tap a field near the bottom of a form.
  useEffect(() => {
    const bring = (target: EventTarget | null) => {
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      // One frame after the keyboard animation, not on the same tick:
      // iOS fires focus BEFORE the visual viewport has reflowed, so
      // scrolling immediately scrolls the old geometry.
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 250)
    }
    const onFocusIn = (e: FocusEvent) => bring(e.target)
    document.addEventListener('focusin', onFocusIn)
    // Also re-run when the keyboard itself resizes (rotation, or an
    // autocomplete bar appearing) while a field is already focused.
    if (keyboardInset) bring(document.activeElement)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [keyboardInset])

  // A prove-then-link handshake survives a reload of this page.
  useEffect(() => {
    const marker = peekPendingLink(browserContextStore())
    if (!marker) return
    setPendingLinkProvider(marker.provider)
    setActiveTab('signin')
    setEmail((prev) => prev || marker.email)
  }, [])

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
        db.auth.setSession({
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
          const { data: memberData, error: memberError } = await db
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
            // Prefill 성/이름 from the invite's single-string name ONLY when
            // the split rule can do it confidently. splitName() returns null
            // for relationship labels ("강하준 아버지"), single-token Latin,
            // 3+ token Latin and 1-syllable Korean — for those we leave both
            // boxes EMPTY rather than seeding a plausible wrong record that
            // the user would tab straight past.
            if (memberData.user_name) {
              const split = splitName(memberData.user_name)
              if (split) {
                setFamilyName(split.family_name)
                setGivenName(split.given_name)
              }
            }
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

    // An OAuth return is still being judged: the takeover check may yet
    // reject this session, and /api/academy/join may yet flip users.role.
    // Routing now would either hand over an account we are about to sign
    // out of, or send an invited parent to the student surface.
    if (oauthReturning) return

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

      // ?next= — an explicit post-login destination, currently used by the
      // native "subscribe on web" button, which opens this page in Custom
      // Tabs. That browser has its own cookie jar, so the student genuinely
      // has to sign in; ?next= is what stops them landing on the role-based
      // default and having to find the subscription page again.
      //
      // Validated with safeNotificationPath — the SAME check the notification
      // inbox uses — rather than a second implementation. It rejects
      // protocol-relative "//evil.com", the backslash variants browsers
      // normalise to it, control characters, and anything scheme-shaped. A
      // post-login redirect that accepts absolute URLs is an open redirect,
      // and this one is reachable by anyone who can get a student to open a
      // link.
      const nextParam = new URLSearchParams(window.location.search).get('next')
      const safeNext = safeNotificationPath(nextParam)
      if (safeNext) {
        console.log('[Auth] Redirecting to ?next=', safeNext)
        router.replace(safeNext)
        return
      }

      try {
        // Fetch user role from database
        const { data: userInfo, error } = await db
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

        // Redirect based on role. The student ladder lives in
        // studentEntryTarget() — shared with (app)/home, which had a
        // diverging copy of it. Parents skip the hub since Study is a
        // student-only experience.
        if (userRole === 'student') {
          const target = await studentEntryTarget(db, user.id)
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
  }, [isInitialized, authLoading, user, isPasswordReset, activeTab, router, oauthReturning])

  // Loose plausibility check, not a strict format: 9–15 digits once
  // separators are stripped covers KR mobiles (010-XXXX-XXXX) and
  // international numbers. Billing (Inicis) later requires a real
  // number, so an empty-but-garbage value here just defers the failure.
  const isPlausiblePhone = (v: string) => {
    const digits = v.replace(/[\s\-().+]/g, '')
    return /^\d{9,15}$/.test(digits)
  }

  // Check if all required signup fields are filled. The study door
  // needs no role/academy — those only apply to the academy flow.
  const isSignupFormValid = useMemo(() => {
    if (activeTab !== 'signup') return true
    // Both name fields must be present and valid. `fullName.trim() !== ''`
    // would pass with only one of the two filled, since joinName() falls
    // back to whichever it has — and a half-filled pair is exactly what the
    // trigger refuses to store.
    const baseValid = validateNameFields(familyName, givenName).valid &&
           email.trim() !== '' &&
           password.trim() !== '' &&
           signupConfirmPassword.trim() !== ''
    // Study door collects a phone number (there's no academy to reach
    // these students through, so it's the only contact channel).
    if (signupIntent === 'study') return baseValid && isPlausiblePhone(phone)
    return baseValid && role.trim() !== '' && academyId.trim() !== ''
  }, [activeTab, familyName, givenName, email, password, signupConfirmPassword, role, academyId, signupIntent, phone])

  /**
   * Start a social sign-in.
   *
   * All the ordering that matters (store the invite context BEFORE
   * leaving, clear it again on every failure, suppress the in-WebView
   * redirect on native) lives in startOAuthSignIn, which is unit-tested.
   * This function is state plumbing only.
   */
  const handleOAuth = async (provider: OAuthProvider) => {
    setErrorMessage("")
    setSocialNotice(null)
    setOauthProvider(provider)

    const result = await startOAuthSignIn(provider, {
      store: browserContextStore(),
      search: window.location.search,
      location: {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
      },
      native: isNativeApp(),
      openExternal: openExternalUrl,
      signInWithOAuth: (args) => db.auth.signInWithOAuth(args),
    })

    if (!result.ok) {
      setOauthProvider(null)
      setSocialNotice({
        tone: 'error',
        text: t('auth.social.errors.start', { provider: PROVIDER_LABEL[provider] }),
      })
      console.error('[Auth] OAuth start failed:', result.reason, result.message)
      return
    }
    // On web the browser is already navigating away; on native the
    // Custom Tab is open and the return arrives as a deep link. Either
    // way the button stays in its busy state until the page unmounts.
  }

  /**
   * Finish a social sign-in.
   *
   * Runs once per OAuth return. `oauthReturning` holds the role-based
   * redirect effect off until this resolves — without that the user can
   * be routed into the app before the academy invite is attached, and the
   * dashboard they land on is the wrong one.
   */
  const finishOAuthReturn = async () => {
    const store = browserContextStore()
    // A deliberate link is the one sanctioned bypass of the takeover
    // check, and it is only deliberate if WE are mid-handshake.
    const marker = peekPendingLink(store)

    const result = await completeOAuthReturn({
      store,
      deliberateLink: Boolean(marker),
      fetchIdentity: async () => {
        const res = await fetch('/api/auth/oauth-identity', { headers: await authHeaders() })
        if (!res.ok) return null
        return res.json()
      },
      provision: async () => {
        const res = await fetch('/api/auth/oauth-provision', {
          method: 'POST',
          headers: await authHeaders(),
        })
        return res.ok
      },
      join: async (body) => {
        const res = await fetch('/api/academy/join', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify(body),
        })
        return { ok: res.ok }
      },
    })

    // Strip the flow marker either way, so a reload is an ordinary load
    // and cannot re-run any of this.
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete(OAUTH_FLOW_PARAM)
      url.searchParams.delete('code')
      url.searchParams.delete('error')
      url.searchParams.delete('error_description')
      window.history.replaceState({}, '', url.toString())
    } catch { /* URL rewriting is cosmetic */ }

    if (result.kind === 'blocked') {
      const provider = result.provider
      // SIGN OUT FIRST, always. Whatever else we do, the session being
      // rejected must not survive this function.
      if (result.outcome.kind === 'link_required') {
        // Undo the auto-link before dropping the session — this is the
        // only moment we hold a session authorised to unlink it. Leaving
        // it attached would mean the NEXT social sign-in looks like a
        // long-standing legitimate link and sails through.
        try {
          const { data } = await db.auth.getUserIdentities()
          const identity = data?.identities?.find((i) => i.provider === provider)
          if (identity) await db.auth.unlinkIdentity(identity)
        } catch (e) {
          console.error('[Auth] Could not unlink auto-linked identity:', e)
        }
        savePendingLink(provider, result.outcome.email, store)
        setPendingLinkProvider(provider as OAuthProvider)
        setEmail(result.outcome.email)
        setActiveTab('signin')
      }
      await db.auth.signOut({ scope: 'local' }).catch(() => {})
      const key = outcomeMessageKey(result.outcome, provider)
      setSocialNotice({
        tone: result.outcome.kind === 'link_required' ? 'info' : 'error',
        text: key
          ? t(key, { provider: PROVIDER_LABEL[provider as OAuthProvider] ?? provider })
          : '',
      })
      setOauthProvider(null)
      setOauthReturning(false)
      return
    }

    if (result.kind === 'join_failed') {
      // Authenticated but unattached. They must see something they can
      // act on — the alternative is a study student staring at a hub
      // that has none of their academy's data in it.
      setSocialNotice({ tone: 'error', text: t('auth.social.join.failedBody') })
    } else if (result.kind === 'context_lost') {
      setSocialNotice({
        tone: 'error',
        text:
          result.reason === 'unsupported_role'
            ? t('auth.social.join.unsupportedRole')
            : t('auth.social.join.expired'),
      })
    } else if (result.kind === 'unknown') {
      setSocialNotice({ tone: 'error', text: t('auth.social.errors.failed', { provider: 'OAuth' }) })
    }

    /* Redeem a friend-invite code, exactly as the password path does at
       the end of handleSignUp.
 
       Without this the two signup doors behaved differently for the same
       invite link: a password signup had its credits before the redirect
       landed, while an OAuth signup arrived at the study home with an
       unclaimed banner to notice and press. The code was never LOST —
       savePendingReferral stashes it the moment `?ref=` is read, and the
       home banner is the fallback redeemer — but "you must click this to
       get what you were already promised" is not the same product.
 
       Read from the stash rather than result.context.ref: the stash is
       what the banner reads, so redeeming from it is what clears the
       banner. Only on 'ok' — a 'blocked' session is about to be signed
       out, and redeeming against it would burn the code on an account
       the user is not going to keep. */
    if (result.kind === 'ok') {
      const stashedRef = readPendingReferral()
      if (stashedRef) await redeemReferralCode(stashedRef)
    }

    // Release the redirect effect. It re-reads users.role, which
    // /api/academy/join may just have flipped.
    setOauthReturning(false)
  }

  useEffect(() => {
    if (!oauthReturning) return
    let cancelled = false
    ;(async () => {
      // The browser client exchanges ?code= for a session on load
      // (detectSessionInUrl). Wait for it before asking the server who
      // we are, or the identity call goes out unauthenticated.
      for (let i = 0; i < 40 && !cancelled; i++) {
        const { data } = await db.auth.getSession()
        if (data.session) break
        await new Promise((r) => setTimeout(r, 250))
      }
      if (cancelled) return
      const { data } = await db.auth.getSession()
      if (!data.session) {
        // No session after the wait: a denied consent, or an exchange
        // that failed. Say so rather than spinning.
        setSocialNotice({ tone: 'error', text: t('auth.social.errors.cancelled') })
        setOauthReturning(false)
        return
      }
      await finishOAuthReturn()
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthReturning])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("") // Clear any existing errors

    // Per-field name validation. One error key per field — a bad 성 must
    // not light up the 이름 box.
    const nameCheck = validateNameFields(familyName, givenName)
    if (!nameCheck.valid) {
      setNameErrors({
        familyName: nameCheck.familyName ? t(nameCheck.familyName) : undefined,
        givenName: nameCheck.givenName ? t(nameCheck.givenName) : undefined,
      })
      setLoading(false)
      return
    }
    setNameErrors({})

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
      const { data: authData, error: authError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            // `name` stays — the trigger falls back to it and Supabase
            // reads it. family_name/given_name are sent ALONGSIDE, and
            // BOTH or NEITHER: handle_new_user() stores neither column
            // when one is missing, so a half split can never masquerade
            // as an already-migrated row.
            name: fullName,
            family_name: familyName.trim(),
            given_name: givenName.trim(),
            role: signupRole,
            academy_id: signupAcademyId,
            phone: phone || null,
            school_name: signupRole === 'student' ? schoolName || null : null,
            family_id: familyMemberId ? null : (familyId || null) // Don't pass family_id if using family_member_id
          }
        }
      })

      // Existing account → guide to log in instead ("link, don't
      // create"). The invite params stay in the URL through login, so
      // the authenticated redirect forwards to /mobile?invite=… and the
      // join modal attaches the membership to the EXISTING account —
      // study history, credits, and billing included. A second account
      // would fork all of that. Supabase surfaces this two ways: an
      // explicit "already registered" error, or (with email
      // confirmation + enumeration protection) a fake success whose
      // user has zero identities.
      const emailTaken =
        (authError && /already\s*(registered|exists|been\s*registered)/i.test(authError.message)) ||
        (!authError && authData.user != null && (authData.user.identities?.length ?? 0) === 0)
      if (emailTaken) {
        setActiveTab('signin')
        setErrorMessage(
          signupAcademyId
            ? (language === 'korean'
                ? '이미 이 이메일로 가입된 계정이 있어요. 로그인하시면 초대가 기존 계정에 연결돼요 (학습 기록도 그대로 유지돼요).'
                : 'An account with this email already exists. Log in and the invite will attach to your existing account — study history and all.')
            : (language === 'korean'
                ? '이미 이 이메일로 가입된 계정이 있어요. 로그인해 주세요.'
                : 'An account with this email already exists. Please log in instead.'),
        )
        setLoading(false)
        return
      }

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
      const { data: existingUser, error: checkError } = await db
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (checkError || !existingUser) {
        console.log('[Auth] Trigger did not create user, creating manually...')

        // Create user record manually
        const { error: userInsertError } = await db
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            // buildNameUpdate writes family_name, given_name AND name in
            // the same statement — users.name is never left unwritten.
            ...buildNameUpdate(familyName, givenName),
            role: signupRole,
            phone: phone || null
          })

        if (userInsertError) {
          console.error('[Auth] Failed to create user record:', userInsertError)
        } else {
          console.log('[Auth] User record created, creating signupRole-specific records...')

          // Create signupRole-specific record based on signupRole and academy_id.
          //
          // Every insert below is CHECKED. supabase-js resolves with
          // `{ error }` instead of throwing, so an un-destructured `await`
          // here silently discards RLS denials and constraint violations —
          // which is how a parent could finish signup with no family link
          // and never see their child's data. Failures are non-fatal at
          // this point (the verify-and-repair step below retries each one),
          // but they must be visible in the console/Sentry breadcrumbs so a
          // systematic breakage isn't invisible.
          if (signupAcademyId) {
            // Each branch names a literal table so the typed client can check
            // the row shape. parents/teachers/managers share the same columns;
            // `students` is the only one that also carries school_name.
            const roleBase = {
              user_id: authData.user.id,
              academy_id: signupAcademyId,
              phone: phone || null
            }
            const roleInsertTable =
              signupRole === 'parent' ? 'parents' :
              signupRole === 'student' ? 'students' :
              signupRole === 'teacher' ? 'teachers' :
              signupRole === 'manager' ? 'managers' : null

            const roleCreate =
              roleInsertTable === 'parents' ? db.from('parents').insert(roleBase) :
              roleInsertTable === 'students' ? db.from('students').insert({ ...roleBase, school_name: schoolName || null }) :
              roleInsertTable === 'teachers' ? db.from('teachers').insert(roleBase) :
              roleInsertTable === 'managers' ? db.from('managers').insert(roleBase) : null

            if (roleCreate) {
              const { error: roleCreateError } = await roleCreate

              if (roleCreateError) {
                console.error(`[Auth] Failed to create ${roleInsertTable} record:`, roleCreateError)
              }
            }
          }

          // Create user preferences
          const { error: prefsCreateError } = await db
            .from('user_preferences')
            .insert({ user_id: authData.user.id })

          if (prefsCreateError) {
            console.error('[Auth] Failed to create user_preferences record:', prefsCreateError)
          }

          // If using standard family_id link (not family_member_id), create family_member record
          if (familyId && !familyMemberId && (signupRole === 'student' || signupRole === 'parent')) {
            const { error: familyCreateError } = await db
              .from('family_members')
              .insert({
                user_id: authData.user.id,
                family_id: familyId,
                role: signupRole
              })

            if (familyCreateError) {
              console.error('[Auth] Failed to create family_members record:', familyCreateError)
            }
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
          const { data: roleRecord, error: roleCheckError } = await db
            .from(roleTable)
            .select('user_id')
            .eq('user_id', authData.user.id)
            .single()

          if (roleCheckError || !roleRecord) {
            console.log(`[Auth] ${roleTable} record missing, creating...`)

            // Create the missing signupRole record. Same literal-table
            // branching as the first-pass insert above.
            const roleData = {
              user_id: authData.user.id,
              academy_id: signupAcademyId,
              phone: phone || null
            }

            const roleInsert =
              roleTable === 'parents' ? db.from('parents').insert(roleData) :
              roleTable === 'students' ? db.from('students').insert({ ...roleData, school_name: schoolName || null }) :
              roleTable === 'teachers' ? db.from('teachers').insert(roleData) :
              db.from('managers').insert(roleData)

            const { error: roleInsertError } = await roleInsert

            if (roleInsertError) {
              console.error(`[Auth] Failed to create ${roleTable} record:`, roleInsertError)
              /*
               * Managers and teachers can no longer attach themselves to an
               * academy that already has a manager (migration 103 — the
               * self-serve route was a privilege escalation: anyone could
               * type an academy UUID from an invite link and read that
               * academy's students, parents and teachers).
               *
               * The generic "contact support" toast is wrong for that case:
               * nothing is broken and support cannot fix it. The academy's
               * own manager has to add them.
               */
              const selfServeRefused =
                (roleTable === 'managers' || roleTable === 'teachers') &&
                (roleInsertError.code === '42501' ||
                 /row-level security|policy/i.test(roleInsertError.message))
              toast({
                title: selfServeRefused
                  ? `An existing manager of this academy has to add you as a ${signupRole}. Your account was created — ask them to invite you, then sign in.`
                  : (t('auth.signup.profileCreationFailed') as string ||
                     `Warning: Your ${signupRole} profile could not be created. Please contact support.`),
                variant: 'warning',
              })
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
        const { data: familyMemberRecord, error: familyMemberCheckError } = await db
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

          const { error: familyMemberError } = await db
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
      const { data: prefsRecord, error: prefsCheckError } = await db
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .single()

      if (prefsCheckError || !prefsRecord) {
        console.log('[Auth] user_preferences record missing, creating...')

        const { error: prefsInsertError } = await db
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
      const { error: signInError } = await db.auth.signInWithPassword({
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

          const { data: updateData, error: updateError } = await db
            .from('family_members')
            .update({ user_id: authData.user.id })
            .eq('id', familyMemberId)
            .is('user_id', null) // Safety check: only update if not already assigned
            .select()

          // A no-op UPDATE is the dangerous case and it does NOT set
          // `error`: `.is('user_id', null)` matches zero rows when the
          // invite was already claimed, when RLS hides the row, or when
          // the id is stale — and the old code logged "Successfully
          // updated" for all three. The family link is then permanently
          // missing and the parent silently never sees their child.
          // Treat "no row changed" exactly like a failure.
          const linked = Array.isArray(updateData) && updateData.length > 0

          if (updateError || !linked) {
            console.error('[Auth] Failed to link family_member:', {
              familyMemberId,
              userId: authData.user.id,
              error: updateError,
              rowsUpdated: Array.isArray(updateData) ? updateData.length : 0,
            })

            // Re-read to distinguish "already linked to THIS user" (a
            // benign retry — the trigger or a previous attempt got there
            // first) from a genuinely unlinked invite.
            const { data: currentMember } = await db
              .from('family_members')
              .select('user_id')
              .eq('id', familyMemberId)
              .maybeSingle()

            if (currentMember?.user_id === authData.user.id) {
              console.log('[Auth] family_member already linked to this user ✓')
            } else {
              toast({
                title: t('auth.signup.familyAssociationFailed') as string ||
                  'Warning: Family association could not be created. Please contact support.',
                variant: 'warning',
              })
            }
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
        const { data: preLoginSession } = await db.auth.getSession()
        if (preLoginSession.session) {
          await db.auth.signOut({ scope: 'local' })
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

      const { error: signInError } = await db.auth.signInWithPassword({
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
        /* PROVE-THEN-LINK, second half.
         *
         * The password just succeeded, which is the proof of ownership
         * the whole handshake exists to obtain. Only now is linking the
         * provider safe, and only to the account that password opened —
         * takePendingLinkFor refuses when the signed-in address is not
         * the one the marker was written for, so a marker left behind on
         * a shared device cannot attach somebody else's Kakao account.
         *
         * A failure here is NOT fatal: the user is signed in to their
         * own account, which is what they asked for. They keep the
         * password login and can try again. */
        const linkStore = browserContextStore()
        const provider = takePendingLinkFor(email, linkStore)
        setPendingLinkProvider(null)
        if (provider) {
          try {
            const { error: linkError } = await db.auth.linkIdentity({ provider })
            setSocialNotice(
              linkError
                ? { tone: 'error', text: t('auth.social.link.failed', { provider: PROVIDER_LABEL[provider] }) }
                : { tone: 'info', text: t('auth.social.link.success', { provider: PROVIDER_LABEL[provider] }) }
            )
          } catch {
            setSocialNotice({ tone: 'error', text: t('auth.social.link.failed', { provider: PROVIDER_LABEL[provider] }) })
          }
        }

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

      const { error } = await db.auth.resetPasswordForEmail(resetEmail, {
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
    const { data: currentSession } = await db.auth.getSession()
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
      const { error } = await db.auth.updateUser({
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
        ({ error: signOutError } = await db.auth.signOut({ scope: 'global' }))
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
    // overflow-y-auto makes <main> its OWN scroll container so the form
    // scrolls even inside the Capacitor mobile shell (where the body
    // itself doesn't scroll). `my-auto` on the child centers it when it
    // fits and collapses to top-aligned + scrollable when it's taller than
    // the viewport (e.g. the long sign-up form) — plain justify-center would
    // clip the overflowing top/bottom with no way to reach it.
    //
    // The height is 100dvh MINUS the keyboard. dvh tracks browser chrome
    // but NOT the on-screen keyboard, so on a phone this container kept
    // its full height while the keyboard covered the bottom third of it
    // — and because the container never overflowed, there was nothing to
    // scroll and the focused input simply sat behind the keys.
    // Subtracting the inset makes the visible area the real one, at
    // which point the existing my-auto/overflow behaviour does the rest.
    <main
      ref={mainRef}
      className="relative flex w-full flex-col items-center overflow-y-auto bg-background sm:px-4"
      style={{ height: `calc(100dvh - ${keyboardInset}px)` }}
    >
      <Squares
        direction="diagonal"
        speed={0.2}
        squareSize={40}
        borderColor="rgba(0, 0, 0, 0.01)"
        hoverFillColor="rgba(0, 0, 0, 0.02)"
        className="z-0 pointer-events-none"
      />
      <div className="relative z-10 my-auto w-full space-y-6 px-4 py-8 sm:max-w-md sm:px-0 pointer-events-none">
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
              <NameFields
                korean={language === 'korean'}
                t={t}
                required
                familyName={familyName}
                givenName={givenName}
                familyNameError={nameErrors.familyName}
                givenNameError={nameErrors.givenName}
                onFamilyNameChange={(v) => {
                  setFamilyName(v)
                  setNameErrors((prev) => ({ ...prev, familyName: undefined }))
                }}
                onGivenNameChange={(v) => {
                  setGivenName(v)
                  setNameErrors((prev) => ({ ...prev, givenName: undefined }))
                }}
              />
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
                  {phone.trim() !== '' && !isPlausiblePhone(phone) && (
                    <p className="text-xs text-rose-600 leading-relaxed">
                      {language === 'korean'
                        ? '올바른 휴대폰 번호를 입력해 주세요 (예: 010-1234-5678).'
                        : 'Please enter a valid phone number (e.g. 010-1234-5678).'}
                    </p>
                  )}
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
                      // Store what was typed; do NOT uppercase here.
                      //
                      // Rewriting a controlled input's value inside onChange
                      // is what breaks an IME: the composing text is replaced
                      // mid-composition and the buffer resets. It happens to
                      // be harmless for Hangul (toUpperCase is identity) but
                      // it is the general shape of the bug, and referral
                      // codes are exactly the field someone pastes or types
                      // in a non-Latin keyboard layout by mistake.
                      //
                      // The field already LOOKS uppercase — `uppercase` in
                      // the className below — and the value is uppercased
                      // once at submit, where no composition is in flight.
                      onChange={(e) => setReferralCode(e.target.value)}
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

          {/* Social sign-in.
              With NEXT_PUBLIC_OAUTH_PROVIDERS unset, SocialAuthButtons
              returns null and `socialNotice` / `pendingLinkProvider` can
              never be set (nothing can start a flow), so this whole
              block renders nothing and the card is unchanged. */}
          {(socialNotice || pendingLinkProvider) && (
            <div
              className={`p-3 rounded-xl ring-1 ${
                socialNotice?.tone === 'error'
                  ? 'bg-rose-50 ring-rose-100'
                  : 'bg-blue-50 ring-blue-100'
              } pointer-events-auto`}
            >
              <p
                className={`text-sm ${
                  socialNotice?.tone === 'error' ? 'text-rose-700' : 'text-blue-700'
                }`}
              >
                {socialNotice?.text ||
                  (pendingLinkProvider
                    ? t('auth.social.link.prompt', { provider: PROVIDER_LABEL[pendingLinkProvider] })
                    : '')}
              </p>
              {pendingLinkProvider && (
                <button
                  type="button"
                  onClick={() => {
                    clearPendingLink(browserContextStore())
                    setPendingLinkProvider(null)
                    setSocialNotice(null)
                  }}
                  className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {t('auth.social.link.cancel')}
                </button>
              )}
            </div>
          )}

          {/*
            * Social sign-in is offered for LOGIN always, and for SIGNUP
            * only in study mode.
            *
            * handleOAuth does not read `signupIntent` — it cannot, because
            * the OAuth round trip leaves the page and returns with only
            * what the provider sends. So every social signup lands as
            * role='student' with no academy (handle_new_user defaults the
            * role, and there is nowhere in the flow to collect an academy
            * id). A user who selected "academy" and pressed Google was
            * silently given a study account.
            *
            * Hiding the buttons for academy signup is the honest
            * short-term fix: it removes an affordance that could not do
            * what it appeared to do. Supporting it properly means
            * carrying the intent through the redirect and collecting the
            * academy id on return — a real flow, not a flag.
            */}
          {(activeTab === "signin" || (activeTab === "signup" && signupIntent === 'study')) && (
            <SocialAuthButtons
              t={t}
              onSelect={handleOAuth}
              busyProvider={oauthProvider}
              disabled={loading || oauthReturning}
            />
          )}

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