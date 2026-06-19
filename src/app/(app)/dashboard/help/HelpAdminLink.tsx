"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Tiny gate around the "View analytics" pill on the help index. Reads
 * the current user's role through the client supabase singleton (the
 * server-side cookie path was unreliable here, same as the admin page
 * itself) and only renders the link for manager/admin/super_admin.
 */
export function HelpAdminLink({ label }: { label: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: me } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      const role = me?.role
      // Classraum platform admins only — academy managers don't see
      // the link to platform-wide help analytics.
      if (role === 'admin' || role === 'super_admin') {
        setShow(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!show) return null
  return (
    <Link
      href="/dashboard/help/admin"
      className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-primary/40 hover:text-primary transition-colors"
    >
      <BarChart3 className="w-4 h-4" />
      {label}
    </Link>
  )
}
