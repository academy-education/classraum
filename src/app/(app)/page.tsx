import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// This is a pure redirect page - no client components needed
export const dynamic = 'force-dynamic'

export default async function AppRootPage() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      redirect('/auth')
    }

    // Get user role for routing
    const { data: userInfo } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userRole = userInfo?.role

    // Redirect based on role
    if (userRole === 'student' || userRole === 'parent') {
      redirect('/mobile')
    } else {
      redirect('/dashboard')
    }
  } catch (error) {
    console.error('Root redirect error:', error)
    redirect('/auth')
  }

  // This should never render, but just in case
  return null
}