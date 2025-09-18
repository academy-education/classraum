"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Squares } from "@/components/ui/squares-background"
import { Mail, Lock, User, Building, Phone } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

export default function AuthPage() {
  const { t, setLanguage } = useTranslation()
  const router = useRouter()
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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Start with true to show loading while checking auth
  const [familyId, setFamilyId] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [isRoleFromUrl, setIsRoleFromUrl] = useState(false)
  const [isAcademyIdFromUrl, setIsAcademyIdFromUrl] = useState(false)

  // Initialize auth page - handle language and check authentication
  useEffect(() => {
    const initAuthPage = async () => {
      try {
        // Check URL parameters for registration data and language
        const urlParams = new URLSearchParams(window.location.search)
        const roleParam = urlParams.get('role')
        const academyIdParam = urlParams.get('academy_id')
        const familyIdParam = urlParams.get('family_id')
        const langParam = urlParams.get('lang')

        // Set language from URL parameter if present
        if (langParam && (langParam === 'english' || langParam === 'korean')) {
          console.log('Setting language from URL parameter:', langParam)
          await setLanguage(langParam)
        }

        // If registration parameters are present, switch to signup tab and pre-fill form
        if (roleParam || academyIdParam || familyIdParam) {
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

        console.log('Checking auth session...')

        // Only sign out if we're not already authenticated or being redirected
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user) {
          // User is logged in, check their role and redirect appropriately
          const { data: userInfo } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentSession.user.id)
            .single()

          if (userInfo?.role) {
            // User is authenticated with valid role, redirect them
            setIsCheckingAuth(false)
            if (userInfo.role === 'admin' || userInfo.role === 'super_admin') {
              router.replace('/admin')
            } else if (userInfo.role === 'student' || userInfo.role === 'parent') {
              router.replace('/mobile')
            } else if (userInfo.role === 'manager' || userInfo.role === 'teacher') {
              router.replace('/dashboard')
            }
            return // Exit early, don't clear session
          }
        }
        
        // Only clear sessions if no valid user session exists
        console.log('Auth page: No valid session, clearing...')
        await supabase.auth.signOut()

        // Clear storage (language is now stored in cookies, so no need to preserve)
        localStorage.clear()
        sessionStorage.clear()

        // Check if session is cleared immediately (no delay needed)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            // User is still logged in, redirect appropriately
            router.push('/dashboard')
            return
          }
        } catch (error) {
          console.error('Auth check error:', error)
        }

        setIsCheckingAuth(false)
        
      } catch (error) {
        console.error('Auth page init error:', error)
        setIsCheckingAuth(false)
      }
    }
    
    initAuthPage()
  }, [router, setLanguage])


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Step 1: Sign up the user with Supabase Auth with metadata
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
            family_id: familyId || null
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
        // Family association is now handled automatically by the database trigger
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
          if (role === 'student' || role === 'parent') {
            router.push('/mobile')
          } else if (role === 'manager' || role === 'teacher') {
            router.push('/dashboard')
          } else {
            router.push('/auth')
          }
        }, 100)
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
      console.log('Sign in already in progress, ignoring duplicate request')
      return
    }
    
    setLoading(true)
    console.log('Starting sign-in process...')

    try {
      console.log('Attempting to sign in with email:', email)
      
      // First ensure we're truly signed out
      await supabase.auth.signOut()
      
      // Wait a moment to ensure signOut is processed
      await new Promise(resolve => setTimeout(resolve, 200))
      
      let authData, error
      let retryCount = 0
      const maxRetries = 3
      
      // Retry logic for network issues
      while (retryCount < maxRetries) {
        try {
          console.log(`Sign-in attempt ${retryCount + 1}/${maxRetries}`)
          
          // Try direct fetch first as fallback for network issues
          if (retryCount > 0) {
            console.log('Trying direct API call as fallback...')
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
              },
              body: JSON.stringify({
                email,
                password
              })
            })
            
            if (response.ok) {
              const directAuthData = await response.json()
              console.log('Direct API auth successful:', directAuthData)
              
              // Set the session manually in Supabase client
              if (directAuthData.access_token) {
                await supabase.auth.setSession({
                  access_token: directAuthData.access_token,
                  refresh_token: directAuthData.refresh_token
                })
                
                authData = { user: directAuthData.user }
                error = null
                break
              }
            } else {
              const errorData = await response.json().catch(() => ({}))
              console.error('Direct API auth failed:', errorData)
            }
          }
          
          // Try regular Supabase client
          const result = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          authData = result.data
          error = result.error
          break
        } catch (fetchError) {
          console.error(`Sign-in attempt ${retryCount + 1} failed:`, fetchError)
          retryCount++
          
          if (retryCount >= maxRetries) {
            error = {
              message: 'Network connection failed. Please check your internet connection and try again. If this persists, try refreshing the page.',
              name: 'NetworkError'
            }
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }

      console.log('Sign in response:', { authData, error })

      if (error) {
        console.error('Sign in error:', error)
        let errorMessage = error.message
        
        // Provide more user-friendly error messages
        if (error.message?.includes('fetch')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.'
        } else if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        }
        
        alert('Sign in failed: ' + errorMessage)
        setLoading(false)
        return
      }

      if (!authData?.user) {
        console.error('No user returned from sign in')
        alert('Sign in failed: No user data received')
        setLoading(false)
        return
      }

      console.log('Sign in successful, user ID:', authData.user.id)

      // Fetch user role from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      console.log('User role fetch result:', { userData, userError })

      if (userError) {
        console.error('Error fetching user role:', userError)
        alert('Error fetching user role: ' + userError.message)
        setLoading(false)
        return
      }

      if (!userData?.role) {
        console.error('No role found for user')
        alert('Error: No role found for user')
        setLoading(false)
        return
      }

      // Redirect based on user role
      const userRole = userData.role
      console.log('Redirecting user with role:', userRole)
      
      // Use router.replace for cleaner navigation
      if (userRole === 'admin' || userRole === 'super_admin') {
        console.log('Redirecting to admin panel')
        router.replace('/admin')
      } else if (userRole === 'student' || userRole === 'parent') {
        console.log('Redirecting to mobile interface')
        router.replace('/mobile')
      } else if (userRole === 'manager' || userRole === 'teacher') {
        console.log('Redirecting to dashboard')
        router.replace('/dashboard')
      } else {
        console.log('Unknown role, redirecting to auth')
        router.replace('/auth')
      }
      
      // Don't set loading to false here since we're navigating away
    } catch (error) {
      console.error('Unexpected error during sign in:', error)
      alert("An unexpected error occurred: " + (error as Error).message)
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?type=reset`,
      })

      if (error) {
        alert('Error sending reset email: ' + error.message)
        setLoading(false)
        return
      }

      setResetSent(true)
      setLoading(false)
    } catch (error) {
      console.error('Unexpected error during password reset:', error)
      alert("An unexpected error occurred: " + (error as Error).message)
      setLoading(false)
    }
  }

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return <LoadingScreen />
  }

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
      <div className="relative z-10 w-full space-y-8 sm:max-w-md pointer-events-none">
        <div className="text-center pointer-events-none">
          <Image src="/logo.png" alt="Classraum Logo" width={256} height={256} className="mx-auto w-16 h-16" />
          
          <div className="mt-5 space-y-2">
            <h3 className="text-3xl font-bold">
              {activeTab === "signin" ? t('auth.signin.title') : 
               activeTab === "signup" ? t('auth.signup.title') : 
               t('auth.forgotPassword.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? t('auth.signin.subtitle') : 
               activeTab === "signup" ? t('auth.signup.subtitle') : 
               t('auth.forgotPassword.subtitle')
              }
            </p>
          </div>
        </div>
        
        <div className="space-y-6 p-4 py-6 shadow sm:rounded-lg sm:p-6 bg-white dark:bg-gray-900/95 backdrop-blur-sm pointer-events-none">
          <form onSubmit={activeTab === "signin" ? handleSignIn : activeTab === "signup" ? handleSignUp : handleForgotPassword} className="space-y-5 pointer-events-auto">
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.fullName')}</Label>
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
              <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.email')}</Label>
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
            {activeTab !== "forgotPassword" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={String(t('auth.form.placeholders.password'))}
                    className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            )}
            {activeTab === "signup" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.role')}</Label>
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
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.academyId')}</Label>
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
                      {t('auth.form.labels.schoolName')} <span className="text-sm text-muted-foreground">{t('auth.form.labels.schoolNameOptional')}</span>
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
                    {t('auth.form.labels.phone')} <span className="text-sm text-muted-foreground">{t('auth.form.labels.phoneOptional')}</span>
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
              disabled={loading || (activeTab === "forgotPassword" && resetSent)}
              className="w-full h-10"
            >
              {loading ? (
                activeTab === "signin" ? t('auth.buttons.signingIn') : 
                activeTab === "signup" ? t('auth.buttons.creatingAccount') : 
                t('auth.buttons.sendingReset')
              ) : (
                activeTab === "signin" ? t('auth.buttons.login') : 
                activeTab === "signup" ? t('auth.buttons.signup') : 
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
}