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

export default function AuthPage() {
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
  const [currentLanguage, setCurrentLanguage] = useState("English")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Force logout and clear all sessions on page load
  useEffect(() => {
    const forceLogout = async () => {
      console.log('Auth page: Force clearing all sessions...')
      await supabase.auth.signOut()
      // Clear any local storage
      localStorage.clear()
      sessionStorage.clear()
    }
    forceLogout()
  }, [])

  // Auth check to redirect authenticated users
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // User is already logged in, redirect to dashboard
          router.push('/dashboard')
          return // Keep loading screen during redirect
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        // Only hide loading if no redirect is happening
        setIsCheckingAuth(false)
      }
    }
    // Remove delay and check immediately
    checkAuth()
  }, [router])

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
    setLoading(true)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Fetch user role from database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        if (userError) {
          alert('Error fetching user role: ' + userError.message)
          setLoading(false)
          return
        }

        // Redirect based on user role
        const userRole = userData.role
        // Small delay to ensure smooth transition
        setTimeout(() => {
          if (userRole === 'student' || userRole === 'parent') {
            router.push('/mobile')
          } else if (userRole === 'manager' || userRole === 'teacher') {
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

  // Add force logout button for testing
  const handleForceLogout = async () => {
    console.log('Force logout clicked')
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
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
          
          {/* Force logout button for testing */}
          <Button 
            onClick={handleForceLogout}
            className="mt-3 mb-2 pointer-events-auto bg-red-600 hover:bg-red-700 text-xs"
          >
            Force Logout & Clear Cache
          </Button>
          
          <div className="mt-5 space-y-2">
            <h3 className="text-3xl font-bold">
              {activeTab === "signin" ? "Welcome back" : "Create an account"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" 
                ? "Sign in to your account to continue" 
                : "Enter your information to get started"
              }
            </p>
          </div>
        </div>
        
        <div className="space-y-6 p-4 py-6 shadow sm:rounded-lg sm:p-6 bg-white dark:bg-gray-900/95 backdrop-blur-sm pointer-events-none">
          <form onSubmit={activeTab === "signin" ? handleSignIn : handleSignUp} className="space-y-5 pointer-events-auto">
            {activeTab === "signup" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            {activeTab === "signup" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Role</Label>
                  <Select value={role} onValueChange={setRole} required>
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3" size="default">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Academy ID</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      required
                      value={academyId}
                      onChange={(e) => setAcademyId(e.target.value)}
                      placeholder="Enter your academy ID"
                      className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    Phone <span className="text-sm text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:!border-primary focus-visible:!ring-0 focus-visible:!ring-offset-0 focus-visible:!border-primary focus:!ring-0 focus:!ring-offset-0 [&:focus-visible]:!border-primary [&:focus]:!border-primary"
                    />
                  </div>
                </div>
              </>
            )}
            <Button 
              type="submit"
              disabled={loading}
              className="w-full h-10"
            >
              {loading ? (activeTab === "signin" ? "Signing in..." : "Creating account...") : (activeTab === "signin" ? "Log in" : "Sign up")}
            </Button>
          </form>
          
          <div className="text-center space-y-1 pointer-events-auto">
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
            {activeTab === "signin" && (
              <div>
                <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">
                  Forgot password?
                </a>
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
                  setCurrentLanguage("English")
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-1"
              >
                <span>🇺🇸 English</span>
                {currentLanguage === "English" && <Check className="h-4 w-4 text-primary" />}
              </button>
              <button
                onClick={() => {
                  setCurrentLanguage("한국어")
                  setShowLanguages(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span>🇰🇷 한국어</span>
                {currentLanguage === "한국어" && <Check className="h-4 w-4 text-primary" />}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowLanguages(!showLanguages)}
            className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-border rounded-full px-4 py-3 shadow-lg hover:shadow-xl transition-shadow pointer-events-auto"
          >
            <Globe className="h-5 w-5" />
            <span className="text-sm font-medium">{currentLanguage}</span>
            <ChevronUp className={`h-4 w-4 opacity-50 transition-transform ${showLanguages ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </main>
  )
}