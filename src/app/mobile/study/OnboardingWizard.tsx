"use client"

import { useEffect, useState } from 'react'
import { Sparkles, Target, GraduationCap, Clock, ArrowRight, Check, Loader2 } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { track } from '@/lib/study/track-client'
import { useTranslation } from '@/hooks/useTranslation'

interface Step1 { targetTest: string | null; goalScore: number | null }
interface Step2 { gradeLevel: string | null }
interface Step3 { dailyGoalMinutes: number }

// SAT goal-score presets (mirror the preferences page). Captured up
// front so the predicted-score card shows the motivating "X to go" gap
// from day one instead of "Set a goal score".
const SCORE_PRESETS = [1200, 1300, 1400, 1500, 1600]

// `available` mirrors the landing-grid lock: only the SAT is open for
// now; the rest render dimmed with a "Soon" chip so new students can't
// onboard onto a test that has no content yet.
const TESTS = [
  { value: 'sat',   label_en: 'SAT',         label_ko: 'SAT',    available: true },
  { value: 'toefl', label_en: 'TOEFL',       label_ko: 'TOEFL',  available: false },
  { value: 'ksat',  label_en: 'KSAT (수능)', label_ko: '수능',   available: false },
  { value: 'toeic', label_en: 'TOEIC',       label_ko: 'TOEIC',  available: false },
  { value: 'ielts', label_en: 'IELTS',       label_ko: 'IELTS',  available: false },
  { value: 'act',   label_en: 'ACT',         label_ko: 'ACT',    available: false },
  { value: 'ap',    label_en: 'AP Exams',    label_ko: 'AP 시험', available: false },
  { value: 'gre',   label_en: 'GRE',         label_ko: 'GRE',    available: false },
]

const GRADES = [
  { value: 'elementary', label_en: 'Elementary',  label_ko: '초등학생' },
  { value: 'middle',     label_en: 'Middle School', label_ko: '중학생' },
  { value: 'high',       label_en: 'High School',   label_ko: '고등학생' },
  { value: 'college',    label_en: 'College',       label_ko: '대학생' },
  { value: 'adult',      label_en: 'Adult learner', label_ko: '성인 학습자' },
]

const GOAL_PRESETS = [15, 30, 60, 90]

/**
 * 3-step onboarding wizard shown on first visit to the study landing.
 * Asks for target test, grade level, daily goal. Saves to prefs and
 * sets onboarded_at so the wizard never shows again.
 *
 * Each step can be skipped; a fully-skipped onboarding still
 * persists onboarded_at so the user isn't re-prompted. Defaults
 * apply to the unset fields.
 */
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [s1, setS1] = useState<Step1>({ targetTest: null, goalScore: null })
  const [s2, setS2] = useState<Step2>({ gradeLevel: null })
  const [s3, setS3] = useState<Step3>({ dailyGoalMinutes: 30 })
  const [saving, setSaving] = useState(false)

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const finish = async (skipped: boolean) => {
    setSaving(true)
    try {
      const headers = await authHeaders()
      await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(skipped ? {} : {
            target_test: s1.targetTest,
            goal_score: s1.goalScore,
            grade_level: s2.gradeLevel,
            daily_goal_minutes: s3.dailyGoalMinutes,
          }),
          onboarded_at: new Date().toISOString(),
        }),
      })
    } catch {
      // Still close the wizard — student can adjust prefs later from the profile.
    }
    track('onboarding_completed', { skipped, targetTest: skipped ? null : s1.targetTest })
    onComplete()
  }

  return (
    <>
      <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm animate-fade-in" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        // z-[121] to sit above the safe-area bars (z-100) so the scrim
        // covers the full screen edge-to-edge, and above BottomNavigation
        // (z-50) — otherwise the
        // tab bar covers the wizard's Skip/Next action bar and users
        // can't advance past step 1. Safe-area padding keeps the
        // action bar clear of the iOS home indicator too.
        className="fixed inset-x-0 bottom-0 z-[121] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)] animate-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 pb-2">
          {[1, 2, 3].map(n => (
            <span
              key={n}
              className={`h-1 rounded-full transition-all ${
                n === step ? 'w-8 bg-primary' : n < step ? 'w-1.5 bg-emerald-400' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="px-5 pt-2 pb-4">
          {step === 1 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  {String(t('study.onboarding.step1Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step1Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step1Subtitle'))}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-5">
                {TESTS.map(test => {
                  const selected = s1.targetTest === test.value
                  return (
                    <button
                      key={test.value}
                      type="button"
                      disabled={!test.available}
                      onClick={() => setS1(prev => ({ ...prev, targetTest: selected ? null : test.value }))}
                      className={`group relative h-12 rounded-2xl text-[14px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : test.available
                            ? 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                            : 'bg-gray-50 text-gray-400 ring-1 ring-gray-200/60 cursor-not-allowed'
                      }`}
                    >
                      {ko ? test.label_ko : test.label_en}
                      {selected && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5" />}
                      {!test.available && (
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.08em] uppercase text-gray-500">
                          {ko ? '준비 중' : 'Soon'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Goal score — appears once SAT is chosen. Lights up the
                  predicted-score gap ("X points to go") from the start. */}
              {s1.targetTest === 'sat' && (
                <div className="mt-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-400 mb-2">
                    {ko ? '목표 점수' : 'Goal score'}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {SCORE_PRESETS.map(s => {
                      const selected = s1.goalScore === s
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setS1(prev => ({ ...prev, goalScore: selected ? null : s }))}
                          className={`h-11 rounded-xl text-[13px] font-semibold tabular-nums transition-all ${
                            selected
                              ? 'bg-gradient-to-b from-primary to-primary/90 text-white ring-1 ring-primary/30'
                              : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                          }`}
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {String(t('study.onboarding.step2Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step2Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step2Subtitle'))}
              </p>
              <div className="grid grid-cols-1 gap-2 mt-5">
                {GRADES.map(grade => {
                  const selected = s2.gradeLevel === grade.value
                  return (
                    <button
                      key={grade.value}
                      type="button"
                      onClick={() => setS2({ gradeLevel: selected ? null : grade.value })}
                      className={`flex items-center justify-between h-12 px-4 rounded-2xl text-[14.5px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.99]'
                      }`}
                    >
                      <span>{ko ? grade.label_ko : grade.label_en}</span>
                      {selected && <Check className="w-4 h-4" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                  {String(t('study.onboarding.step3Eyebrow'))}
                </span>
              </div>
              <h2 className="text-[22px] font-semibold tracking-tight text-gray-900 leading-tight">
                {String(t('study.onboarding.step3Title'))}
              </h2>
              <p className="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
                {String(t('study.onboarding.step3Subtitle'))}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-5">
                {GOAL_PRESETS.map(m => {
                  const selected = s3.dailyGoalMinutes === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setS3({ dailyGoalMinutes: m })}
                      className={`h-14 rounded-2xl text-[15px] font-bold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                      }`}
                    >
                      {ko ? `${m}분` : `${m} min`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 px-5 py-4 flex items-center justify-between gap-3 bg-gradient-to-t from-white via-white to-white/80 border-t border-gray-100">
          <button
            type="button"
            onClick={() => void finish(true)}
            disabled={saving}
            className="text-[13px] font-semibold text-gray-500 px-3 h-10 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            {String(t('study.onboarding.skip'))}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as 1 | 2 | 3)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 active:scale-[0.98] transition-all"
            >
              {String(t('study.onboarding.next'))}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish(false)}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-4px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {String(t('study.onboarding.finish'))}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
