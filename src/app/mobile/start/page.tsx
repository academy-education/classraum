"use client"

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { BookOpen, GraduationCap, Sparkles, ArrowRight } from 'lucide-react'

/**
 * Mobile hub — the chooser students land on after every login.
 *
 * Two tiles: Grades (existing dashboard at /mobile) and Study (the
 * new AI learning surface at /mobile/study). Persistent mode toggle
 * in the header lets users flip between the two without returning
 * here, but every login starts at this hub so they always see both
 * modes and pick deliberately.
 *
 * Parents who reach this page get only the Grades tile — Study is a
 * student-only experience.
 */
export default function MobileStartPage() {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const role = user?.role
  const isStudent = role === 'student'

  // Personal greeting — same friendly tone the existing dashboard
  // uses but stripped to just the name. Falls back to a generic
  // welcome when we don't have one yet (rare).
  const firstName = (user?.userName || '').split(' ')[0]

  return (
    <div className="min-h-full px-5 pt-8 pb-12 flex flex-col gap-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
          {t('mobile.hub.eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {firstName
            ? t('mobile.hub.greetingNamed', { name: firstName })
            : t('mobile.hub.greeting')}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {t('mobile.hub.subtitle')}
        </p>
      </header>

      <div className="space-y-3 flex-1">
        {/* Grades tile — links to existing /mobile dashboard. */}
        <Link
          href="/mobile"
          className="group block rounded-2xl border border-gray-200 bg-white p-5 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {t('mobile.hub.gradesTitle')}
              </div>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {t('mobile.hub.gradesBody')}
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary mt-1 flex-shrink-0 transition-colors" />
          </div>
        </Link>

        {/* Study tile — students only. */}
        {isStudent && (
          <Link
            href="/mobile/study"
            className="group block rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-blue-50 p-5 hover:border-primary/60 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {t('mobile.hub.studyTitle')}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary bg-white ring-1 ring-primary/30 rounded-full px-2 py-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t('mobile.hub.aiBadge')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  {t('mobile.hub.studyBody')}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary/60 group-hover:text-primary mt-1 flex-shrink-0 transition-colors" />
            </div>
          </Link>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        {t('mobile.hub.toggleHint')}
      </p>
    </div>
  )
}
