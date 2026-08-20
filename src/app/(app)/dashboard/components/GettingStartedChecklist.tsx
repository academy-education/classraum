"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, GraduationCap, Users, Calendar, BookOpen, ClipboardList, X, Wand2, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/hooks/useTranslation'
import { db } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { startSetupTour } from '@/components/ui/onboarding/SetupTour'
import {
  type SetupCounts, type SetupTourStepId,
  checklistSteps, isStepComplete,
} from '@/lib/onboarding/setup-tour'

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
 *
 * ORDER comes from `SETUP_TOUR_STEPS` (via `checklistSteps`), not from
 * a list kept here. It used to be a second hardcoded array that began
 * with "create your first classroom" — the one step a brand-new
 * manager CANNOT do, because ClassroomCreateModal disables Create
 * without a `teacher_id` and a manager's signup writes no `teachers`
 * row. The checklist and the tour therefore told the user to do two
 * different things first. One list, one order, and `validateStepOrder`
 * polices it in the tour's own test.
 *
 * This is also the LAUNCHER for the guided setup tour (SetupTour). The
 * two are deliberately not siblings on the dashboard: the checklist
 * already owns the "fresh academy" signal and the screen real estate,
 * so the tour hangs off its primary button instead of being a second
 * widget with a second definition of "new user". The checklist stays
 * the map; the tour is the guide that walks you across it.
 */
const DISMISSED_KEY_PREFIX = 'classraum:getting_started_dismissed:'

/** Icon + label + destination for the steps the checklist shows. The
 *  ORDER is not here — it comes from the tour's step list. */
const PRESENTATION: Record<SetupTourStepId, { icon: LucideIcon; labelKey: string }> = {
  teachers: { icon: GraduationCap, labelKey: 'dashboard.gettingStarted.addTeachers' },
  classroom: { icon: BookOpen, labelKey: 'dashboard.gettingStarted.createClassroom' },
  students: { icon: Users, labelKey: 'dashboard.gettingStarted.addStudents' },
  session: { icon: Calendar, labelKey: 'dashboard.gettingStarted.scheduleSession' },
  assignment: { icon: ClipboardList, labelKey: 'dashboard.gettingStarted.setAssignment' },
}

export function GettingStartedChecklist({ academyId }: { academyId: string }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [counts, setCounts] = useState<SetupCounts | null>(null)
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
        db.from('classrooms').select('id', { count: 'exact', head: true }).eq('academy_id', academyId).is('deleted_at', null),
        db.from('teachers').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId),
        db.from('students').select('user_id', { count: 'exact', head: true }).eq('academy_id', academyId),
        // Scoped through the classroom, because classroom_sessions carries
        // no academy_id of its own. This previously had NO academy filter
        // and leaned entirely on RLS to scope it — which happens to hold
        // for a single-academy manager, but breaks for anyone managing two
        // academies, and makes Postgres apply the (expensive) session RLS
        // policy to every row before counting.
        db.from('classroom_sessions')
          .select('id, classrooms!inner(academy_id, deleted_at)', { count: 'exact', head: true })
          .eq('classrooms.academy_id', academyId)
          .is('classrooms.deleted_at', null)
          .is('deleted_at', null),
      ])
      if (cancelled) return
      setCounts({
        classrooms: c.count ?? 0,
        teachers: t.count ?? 0,
        students: s.count ?? 0,
        sessions: sess.count ?? 0,
        // Not a checklist row (see CHECKLIST_STEP_IDS); present only
        // because SetupCounts is the shared shape.
        assignments: 0,
      })
    })()
    return () => { cancelled = true }
  }, [academyId])

  if (dismissed || !counts) return null

  const steps = checklistSteps().map(step => ({
    key: step.id,
    done: isStepComplete(step, counts),
    icon: PRESENTATION[step.id].icon,
    title: t(PRESENTATION[step.id].labelKey),
    href: step.route,
  }))

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
        <span className="text-xs text-gray-500 tabular-nums">
          {completed} / {steps.length}
        </span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-gray-900">
        {t('dashboard.gettingStarted.title')}
      </h3>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        {t('dashboard.gettingStarted.description')}
      </p>

      <Button
        size="sm"
        className="mb-4"
        onClick={() => { if (user?.id) startSetupTour(user.id) }}
      >
        <Wand2 className="w-3.5 h-3.5 mr-1.5" />
        {t('dashboard.gettingStarted.startTour')}
      </Button>

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
