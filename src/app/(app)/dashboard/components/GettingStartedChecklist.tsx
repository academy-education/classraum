"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, GraduationCap, Users, Calendar, BookOpen, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

/**
 * First-week onboarding checklist for brand-new academies.
 *
 * Auto-shows when the academy has zero classrooms (a strong "fresh
 * install" signal) and hides once every step is done or the user
 * dismisses it. Each step links straight to the page where that
 * action happens.
 *
 * Dismissal is keyed by user.id in localStorage — same persistence
 * pattern as the WelcomeModal. A user on a new device briefly seeing
 * the checklist again is fine; once they create a classroom, it's
 * gone regardless of dismissal.
 */
const DISMISSED_KEY_PREFIX = 'classraum:getting_started_dismissed:'

interface Counts {
  classrooms: number
  teachers: number
  students: number
  sessions: number
}

export function GettingStartedChecklist({ academyId }: { academyId: string }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Read dismissal flag once we have a user.
  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return
    try {
      const flag = localStorage.getItem(`${DISMISSED_KEY_PREFIX}${user.id}`)
      if (flag) setDismissed(true)
    } catch {
      // localStorage disabled; show the checklist normally.
    }
  }, [user?.id])

  // Pull setup counts. Cheap — four parallel `count` queries against
  // small tables; runs once per dashboard mount.
  useEffect(() => {
    if (!academyId) return
    let cancelled = false
    void (async () => {
      const [c, t, s, sess] = await Promise.all([
        supabase.from('classrooms').select('id', { count: 'exact', head: true }).eq('academy_id', academyId).is('deleted_at', null),
        supabase.from('teachers').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId),
        supabase.from('students').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId),
        supabase.from('classroom_sessions').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      ])
      if (cancelled) return
      setCounts({
        classrooms: c.count ?? 0,
        teachers: t.count ?? 0,
        students: s.count ?? 0,
        sessions: sess.count ?? 0,
      })
    })()
    return () => { cancelled = true }
  }, [academyId])

  if (dismissed || !counts) return null

  const steps = [
    {
      key: 'classroom',
      done: counts.classrooms > 0,
      icon: BookOpen,
      title: t('dashboard.gettingStarted.createClassroom'),
      href: '/classrooms',
    },
    {
      key: 'teachers',
      done: counts.teachers > 0,
      icon: GraduationCap,
      title: t('dashboard.gettingStarted.addTeachers'),
      href: '/teachers',
    },
    {
      key: 'students',
      done: counts.students > 0,
      icon: Users,
      title: t('dashboard.gettingStarted.addStudents'),
      href: '/families',
    },
    {
      key: 'sessions',
      done: counts.sessions > 0,
      icon: Calendar,
      title: t('dashboard.gettingStarted.scheduleSession'),
      href: '/sessions',
    },
  ] as const

  const completed = steps.filter(s => s.done).length
  // Hide once everything's done — no need for a "100% complete" badge
  // taking up dashboard real estate forever.
  if (completed === steps.length) return null

  // Also hide once the academy has any classroom — by then the user
  // has clearly figured out the basics and the checklist becomes
  // condescending. The first step is the load-bearing one; if it's
  // done they don't need a checklist for the rest.
  if (counts.classrooms > 0) return null

  const dismiss = () => {
    if (user?.id && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${DISMISSED_KEY_PREFIX}${user.id}`, '1')
      } catch { /* see read comment */ }
    }
    setDismissed(true)
  }

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50 p-5 relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-600"
        aria-label={String(t('common.dismiss') ?? 'Dismiss')}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          {t('dashboard.gettingStarted.eyebrow')}
        </span>
        <span className="text-xs text-gray-500">
          {completed} / {steps.length}
        </span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-gray-900">
        {t('dashboard.gettingStarted.title')}
      </h3>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        {t('dashboard.gettingStarted.description')}
      </p>

      <ul className="space-y-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  step.done
                    ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/[0.02]'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white ring-1 ring-gray-200 text-gray-400'
                }`}>
                  {step.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                </div>
                <Icon className={`w-4 h-4 flex-shrink-0 ${step.done ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span className={`text-sm flex-1 ${step.done ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                  {step.title}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
