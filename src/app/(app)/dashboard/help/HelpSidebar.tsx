"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { HELP_ARTICLES, getArticlesForRole, type HelpArticleMeta } from '@/../content/help/articles'
import { BookOpen } from 'lucide-react'

/**
 * Sidebar list of help articles. Filters by the current user's role so
 * a teacher doesn't see a "Payments" link they can't act on anyway.
 *
 * The user object from useAuth() is the Supabase Auth User — `user.role`
 * there is the auth role ('authenticated'), NOT the app role
 * (manager/teacher/etc.). We have to look the real app role up from the
 * users table. Same pattern AppLayout uses.
 */
export function HelpSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.role) setRole(data.role)
      })
    return () => { cancelled = true }
  }, [user?.id])

  // While the role lookup is in flight, show the full list. Better to
  // briefly show an article the user can't act on than to flash an empty
  // sidebar on every page-mount.
  const articles: HelpArticleMeta[] = role
    ? getArticlesForRole(role)
    : HELP_ARTICLES

  return (
    <nav aria-label="Help articles" className="w-full">
      <Link
        href="/dashboard/help"
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium mb-2 ${
          pathname === '/dashboard/help'
            ? 'bg-primary/10 text-primary'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        Help center
      </Link>

      <div className="text-[11px] uppercase tracking-wide text-gray-400 px-3 mt-4 mb-2">
        Articles
      </div>

      <ul className="space-y-0.5">
        {articles.map(article => {
          const href = `/dashboard/help/${article.slug}`
          const isActive = pathname === href
          return (
            <li key={article.slug}>
              <Link
                href={href}
                className={`block px-3 py-2 rounded-md text-sm leading-snug ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {article.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
