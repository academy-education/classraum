"use client"

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { BookOpen, GraduationCap, Sparkles, ArrowRight } from 'lucide-react'

/**
 * Mobile hub — the chooser students land on their FIRST visit (entry
 * routing skips it once a mode preference is stored; see currentMode.ts).
 *
 * Presented as a main popup — same scrim + bottom-sheet pattern as the
 * onboarding target-test picker — rather than a plain page, so the
 * choice reads as a deliberate one-time decision over the app, not a
 * destination. Not dismissable: picking a mode IS the way forward.
 *
 * Parents who reach this page get only the Grades tile — Study is a
 * student-only experience.
 */
export default function MobileStartPage() {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const role = user?.role
  const isStudent = role === 'student'
  // Study-only students (self-serve signup, no academy membership)
  // get no Grades tile — there's no academy data behind it.
  const hasAcademy = (user?.academyIds?.length ?? 0) > 0

  const firstName = (user?.userName || '').split(' ')[0]

  return (
    <div className="min-h-full bg-gray-50">
      {/* Scrim — same treatment as the target-test picker popup. */}
      <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm animate-fade-in" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        // z-[121]: above the safe-area bars + BottomNavigation, matching
        // the OnboardingWizard sheet.
        className="fixed inset-x-0 bottom-0 z-[121] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)] animate-slide-up"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-2 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
            {t('mobile.hub.eyebrow')}
          </p>
          <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
            {firstName
              ? t('mobile.hub.greetingNamed', { name: firstName })
              : t('mobile.hub.greeting')}
          </h2>
          <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
            {t('mobile.hub.subtitle')}
          </p>

          <div className="space-y-3 mt-5">
            {/* Grades tile — links to existing /mobile dashboard. Hidden
                for study-only students with no academy behind it. */}
            {hasAcademy && (
              <Link
                href="/mobile"
                className="group block rounded-2xl bg-white p-5 ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-16px_rgba(0,0,0,0.12)] hover:ring-emerald-200 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600 flex items-center justify-center mb-3 ring-1 ring-emerald-100">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {t('mobile.hub.gradesTitle')}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {t('mobile.hub.gradesBody')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 mt-1 flex-shrink-0 transition-all" />
                </div>
              </Link>
            )}

            {/* Study tile — students only. Stronger gradient + accent ring
                so the new product gets visual weight on first encounter. */}
            {isStudent && (
              <Link
                href="/mobile/study"
                className="group block rounded-2xl p-5 ring-1 ring-primary/20 bg-gradient-to-br from-primary/[0.07] via-blue-50/70 to-violet-50/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(40,133,232,0.20)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-16px_rgba(40,133,232,0.28)] hover:ring-primary/40 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white text-primary flex items-center justify-center mb-3 ring-1 ring-primary/20 shadow-sm">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                  <ArrowRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 mt-1 flex-shrink-0 transition-all" />
                </div>
              </Link>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center mt-5">
            {t('mobile.hub.toggleHint')}
          </p>
        </div>
      </div>
    </div>
  )
}
