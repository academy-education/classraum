"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Check, Target, GraduationCap, Clock, Globe, Sparkles, BarChart3, ArrowRight, Settings } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonBlock, SkeletonCard, SkeletonSettingsGroup } from '../skeletons'
import { StudySubPageHeader } from '../_shared/primitives'

interface Prefs {
  target_test: string | null
  grade_level: string | null
  daily_goal_minutes: number
  default_language: 'en' | 'ko'
  default_difficulty: 'warmup' | 'balanced' | 'challenge'
}

const TESTS = [
  { value: 'ksat',  ko: '수능',         en: 'KSAT' },
  { value: 'sat',   ko: 'SAT',         en: 'SAT' },
  { value: 'toefl', ko: 'TOEFL',       en: 'TOEFL' },
  { value: 'toeic', ko: 'TOEIC',       en: 'TOEIC' },
  { value: 'ielts', ko: 'IELTS',       en: 'IELTS' },
  { value: 'act',   ko: 'ACT',         en: 'ACT' },
  { value: 'ap',    ko: 'AP 시험',     en: 'AP Exams' },
  { value: 'gre',   ko: 'GRE',         en: 'GRE' },
]

const GRADES = [
  { value: 'elementary', ko: '초등학생',     en: 'Elementary' },
  { value: 'middle',     ko: '중학생',       en: 'Middle School' },
  { value: 'high',       ko: '고등학생',     en: 'High School' },
  { value: 'college',    ko: '대학생',       en: 'College' },
  { value: 'adult',      ko: '성인 학습자',  en: 'Adult learner' },
]

const GOAL_PRESETS = [15, 30, 45, 60, 90]

/**
 * Study preferences page — surfaces every knob the onboarding
 * wizard collected, plus a stats link. Editable any time so the
 * student can change their goal, target test, or default
 * difficulty without re-running onboarding.
 */
export default function StudyPreferencesPage() {
  return (
    <StudySubscriptionGate>
      <PreferencesInner />
    </StudySubscriptionGate>
  )
}

function PreferencesInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [saving, setSaving] = useState<keyof Prefs | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setPrefs(json.prefs)
      } catch { /* show empty state */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Optimistic update — flip the UI, then PUT. Reverts on failure.
  const update = async <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    if (!prefs) return
    const prev = prefs
    setPrefs({ ...prefs, [key]: value })
    setSaving(key)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setPrefs(prev)
    } finally {
      setSaving(null)
    }
  }

  if (!prefs) {
    // Skeleton mirrors the loaded layout: back link, title +
    // subtitle, stats link card, then 5 setting groups.
    return (
      <div className="px-5 pt-6 pb-14 space-y-6">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-1/2 rounded-lg" />
          <SkeletonBlock className="h-3 w-4/5 rounded-full" />
        </div>
        <SkeletonCard className="p-4 flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3.5 w-1/3 rounded-full" />
            <SkeletonBlock className="h-2.5 w-2/5 rounded-full" />
          </div>
        </SkeletonCard>
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-14 space-y-6">
      <StudySubPageHeader
        backHref="/mobile/study"
        backLabel={String(t('study.topic.backToStudy'))}
        icon={Settings}
        eyebrow={ko ? '학습' : 'Study'}
        title={String(t('study.prefs.title'))}
        subtitle={String(t('study.prefs.subtitle'))}
      />

      {/* Stats link card */}
      <Link
        href="/mobile/study/stats"
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/[0.06] via-indigo-50/40 to-white ring-1 ring-primary/20 p-4 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.18)] active:scale-[0.99] transition-all"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-b from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/30">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-gray-900">{String(t('study.prefs.statsTitle'))}</div>
          <div className="text-[12.5px] text-gray-500 mt-0.5">{String(t('study.prefs.statsSubtitle'))}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </Link>

      {/* Custom test builder link */}
      <Link
        href="/mobile/study/builder"
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-white ring-1 ring-amber-200/60 p-4 hover:shadow-[0_2px_8px_-2px_rgba(245,158,11,0.18)] active:scale-[0.99] transition-all"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_4px_rgba(245,158,11,0.25)] ring-1 ring-orange-600/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-gray-900">{String(t('study.builder.title'))}</div>
          <div className="text-[12.5px] text-gray-500 mt-0.5">{String(t('study.builder.subtitle'))}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </Link>

      {/* Target test */}
      <SettingGroup icon={Target} label={String(t('study.prefs.targetTest'))} saving={saving === 'target_test'}>
        <div className="grid grid-cols-2 gap-2">
          {TESTS.map(test => {
            const selected = prefs.target_test === test.value
            return (
              <button
                key={test.value}
                type="button"
                onClick={() => update('target_test', selected ? null : test.value)}
                className={`relative h-11 rounded-xl text-[13.5px] font-semibold transition-all ${
                  selected
                    ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/30'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                }`}
              >
                {ko ? test.ko : test.en}
                {selected && <Check className="absolute top-1.5 right-1.5 w-3 h-3" />}
              </button>
            )
          })}
        </div>
      </SettingGroup>

      {/* Grade level */}
      <SettingGroup icon={GraduationCap} label={String(t('study.prefs.gradeLevel'))} saving={saving === 'grade_level'}>
        <div className="grid grid-cols-1 gap-1.5">
          {GRADES.map(grade => {
            const selected = prefs.grade_level === grade.value
            return (
              <button
                key={grade.value}
                type="button"
                onClick={() => update('grade_level', selected ? null : grade.value)}
                className={`flex items-center justify-between h-11 px-4 rounded-xl text-[14px] font-semibold transition-all ${
                  selected
                    ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white ring-1 ring-emerald-700/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-emerald-300 active:scale-[0.99]'
                }`}
              >
                <span>{ko ? grade.ko : grade.en}</span>
                {selected && <Check className="w-4 h-4" />}
              </button>
            )
          })}
        </div>
      </SettingGroup>

      {/* Daily goal */}
      <SettingGroup icon={Clock} label={String(t('study.prefs.dailyGoal'))} saving={saving === 'daily_goal_minutes'}>
        <Segmented
          options={GOAL_PRESETS.map(m => ({ value: m, label: ko ? `${m}분` : `${m}m` }))}
          value={prefs.daily_goal_minutes}
          onChange={(v) => update('daily_goal_minutes', v)}
        />
      </SettingGroup>

      {/* Default language */}
      <SettingGroup icon={Globe} label={String(t('study.prefs.defaultLanguage'))} saving={saving === 'default_language'}>
        <Segmented
          options={[{ value: 'en', label: 'English' }, { value: 'ko', label: '한국어' }]}
          value={prefs.default_language}
          onChange={(v) => update('default_language', v as 'en' | 'ko')}
        />
      </SettingGroup>

      {/* Default difficulty */}
      <SettingGroup icon={Sparkles} label={String(t('study.prefs.defaultDifficulty'))} saving={saving === 'default_difficulty'}>
        <Segmented
          options={[
            { value: 'warmup',    label: String(t('study.testConfig.difficultyWarmup')) },
            { value: 'balanced',  label: String(t('study.testConfig.difficultyBalanced')) },
            { value: 'challenge', label: String(t('study.testConfig.difficultyChallenge')) },
          ]}
          value={prefs.default_difficulty}
          onChange={(v) => update('default_difficulty', v as Prefs['default_difficulty'])}
        />
      </SettingGroup>
    </div>
  )
}

function SettingGroup({
  icon: Icon, label, children, saving,
}: { icon: typeof Target; label: string; children: React.ReactNode; saving: boolean }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600">{label}</span>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-auto" />}
      </div>
      {children}
    </section>
  )
}

function Segmented<T>({ options, value, onChange }: {
  options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center w-full p-0.5 rounded-xl bg-gray-100 ring-1 ring-gray-200/70">
      {options.map(opt => {
        const selected = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 h-9 rounded-[10px] text-[13px] font-semibold transition-all ${
              selected
                ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]'
                : 'text-gray-500 hover:text-gray-700 active:scale-[0.97]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
