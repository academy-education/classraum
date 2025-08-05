"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { LogOut } from 'lucide-react'

export default function MobilePage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        // Check user role
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userData) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        if (userData.role === 'student' || userData.role === 'parent') {
          setIsAuthorized(true)
        } else {
          setTimeout(() => router.push('/dashboard'), 2100)
        }
      } catch {
        setTimeout(() => router.push('/auth'), 2100)
      }
      // Don't set loading to false here - let LoadingScreen control it
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />
  }

  if (!isAuthorized) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Mobile Dashboard</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      <p className="text-center text-muted-foreground">
        Welcome to the mobile interface for students and parents.
      </p>
    </div>
  )
}