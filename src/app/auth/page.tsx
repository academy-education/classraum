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
import { Mail, Lock, User, Building, Phone, Globe, ChevronUp, Check } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

export default function AuthPage() {
  const { t, language, setLanguage } = useTranslation()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("")
  const [academyId, setAcademyId] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("signin")
  const [showLanguages, setShowLanguages] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Initialize auth page - handle language and check authentication
  useEffect(() => {
    const initAuthPage = async () => {
      try {
        // Test Supabase connection first
        console.log('Testing Supabase connection...')
        try {
          await supabase.auth.getSession()
          console.log('Supabase connection successful')
        } catch (connectionError) {
          console.error('Supabase connection failed:', connectionError)
        }
        
        // Preserve language preference when clearing storage
        const savedLanguage = localStorage.getItem('classraum_language')
        // Check URL parameters for language setting
        const urlParams = new URLSearchParams(window.location.search)
        const langParam = urlParams.get('lang')
        
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
            if (userInfo.role === 'student' || userInfo.role === 'parent') {
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
        
        // Clear any local storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Restore or set language preference (URL param takes precedence)
        const languageToSet = langParam === 'korean' || langParam === 'english' ? langParam : savedLanguage
        if (languageToSet) {
          localStorage.setItem('classraum_language', languageToSet)
          // Set language immediately if it's different from current
          if (languageToSet !== language) {
            setLanguage(languageToSet as 'korean' | 'english')
          }
        }
        
        // Small delay to ensure logout is processed, then check auth
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              // User is somehow still logged in after logout, redirect to dashboard
              router.push('/dashboard')
              return
            }
          } catch (error) {
            console.error('Auth check error:', error)
          } finally {
            setIsCheckingAuth(false)
          }
        }, 500)
        
      } catch (error) {
        console.error('Auth page init error:', error)
        setIsCheckingAuth(false)
      }
    }
    
    initAuthPage()
  }, [language, setLanguage, router])


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
            school_name: null
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
        // Success! User is signed in and profile created - redirect based on role
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
      if (userRole === 'student' || userRole === 'parent') {
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
                    placeholder={t('auth.form.placeholders.fullName')}
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
                  placeholder={t('auth.form.placeholders.email')}
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
                    placeholder={t('auth.form.placeholders.password')}
                    className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            )}
            {activeTab === "signup" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('auth.form.labels.role')}</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3" size="default">
                      <SelectValue placeholder={t('auth.form.placeholders.role')} />
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
                      placeholder={t('auth.form.placeholders.academyId')}
                      className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                    />
                  </div>
                </div>
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
                      placeholder={t('auth.form.placeholders.phone')}
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

      {/* Floating Language Selector */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {showLanguages && (
            <div className="absolute bottom-14 right-0 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg p-1 min-w-[120px] pointer-events-auto">
              <button
                onClick={() => {
                  setLanguage('english')
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
              >
                <span>🇺🇸 English</span>
                {language === 'english' && <Check className="h-4 w-4 text-primary" />}
              </button>
              <button
                onClick={() => {
                  setLanguage('korean')
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span>🇰🇷 한국어</span>
                {language === 'korean' && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-border rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-shadow pointer-events-auto"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">{language === 'english' ? 'English' : '한국어'}</span>
            <ChevronUp className={`h-4 w-4 opacity-50 transition-transform ${showLanguages ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </main>
  )
}