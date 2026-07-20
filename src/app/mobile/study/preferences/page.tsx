"use client"

import { useEffect, useState } from 'react'
import { Loader2, Check, X, Target, GraduationCap, Clock, Globe, Sparkles, Settings, TrendingUp } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonBlock, SkeletonCard, SkeletonSettingsGroup } from '../skeletons'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { StudyButton } from '../_shared/StudyButton'
import { SegmentedTabs } from '../_shared/SegmentedTabs'

interface Prefs {
  target_test: string | null
  target_tests: string[]
  grade_level: string | null
  daily_goal_minutes: number
  goal_score: number | null
  goal_scores: Record<string, number>
  test_date: string | null
  default_language: 'en' | 'ko'
  default_difficulty: 'warmup' | 'balanced' | 'challenge'
}

// Values are canonical UPPERCASE test keys — the same shape the
// journey's target picker writes, so one test never appears twice as
// 'sat' vs 'SAT'. Only open tests are selectable; the rest render as
// coming-soon.
const TESTS = [
  { value: 'SAT',   ko: 'SAT',         en: 'SAT',      available: true },
  { value: 'TOEFL', ko: 'TOEFL',       en: 'TOEFL',    available: true },
  { value: 'KSAT',  ko: '수능',         en: 'KSAT',     available: false },
  { value: 'TOEIC', ko: 'TOEIC',       en: 'TOEIC',    available: false },
  { value: 'IELTS', ko: 'IELTS',       en: 'IELTS',    available: false },
  { value: 'ACT',   ko: 'ACT',         en: 'ACT',      available: false },
  { value: 'AP',    ko: 'AP 시험',     en: 'AP Exams', available: false },
  { value: 'GRE',   ko: 'GRE',         en: 'GRE',      available: false },
]

const GRADES = [
  { value: 'elementary', ko: '초등학생',     en: 'Elementary' },
  { value: 'middle',     ko: '중학생',       en: 'Middle School' },
  { value: 'high',       ko: '고등학생',     en: 'High School' },
  { value: 'college',    ko: '대학생',       en: 'College' },
  { value: 'adult',      ko: '성인 학습자',  en: 'Adult learner' },
]

const GOAL_PRESETS = [15, 30, 45, 60, 90]

// Per-test goal-score scales. Keyed by lowercased test family (matching
// study_user_prefs.goal_scores keys). Only tests with a scale here show
// a goal row; others (locked) don't feed the predicted-score engine yet.
const GOAL_SCALES: Record<string, number[]> = {
  sat: [1200, 1300, 1400, 1500, 1600],
  toefl: [80, 90, 100, 105, 110, 120],
}

/**
 * Study preferences page — surfaces every knob the onboarding
 * wizard collected. Editable any time so the
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
  const [failed, setFailed] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Auto-dismiss the save-failure toast.
  useEffect(() => {
    if (!saveFailed) return
    const id = setTimeout(() => setSaveFailed(false), 3500)
    return () => clearTimeout(id)
  }, [saveFailed])

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        // Surface failures — a silent return left the skeleton forever.
        if (!res.ok) {
          if (!cancelled) setFailed(true)
          return
        }
        const json = await res.json()
        if (!cancelled) setPrefs(json.prefs)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => { cancelled = true }
  }, [retryKey])

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
      // The optimistic flip snaps back — without a message it reads
      // as the toggle "not working".
      setPrefs(prev)
      setSaveFailed(true)
    } finally {
      setSaving(null)
    }
  }

  if (failed && !prefs) {
    return (
      <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14">
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
          <p className="text-[13.5px] text-gray-600">
            {ko ? '설정을 불러오지 못했어요.' : "We couldn't load your preferences."}
          </p>
          <StudyButton type="button" size="sm" onClick={() => setRetryKey(k => k + 1)}>
            {ko ? '다시 시도' : 'Retry'}
          </StudyButton>
        </div>
      </div>
    )
  }

  // Static title → render the real header immediately during load too
  // (study-wide standard for static-title pages).
  const header = (
    <StudyPageHeader
      backHref="/mobile/study"
      backLabel={String(t('study.topic.backToStudy'))}
      icon={Settings}
      eyebrow={ko ? '학습' : 'Study'}
      title={String(t('study.prefs.title'))}
      subtitle={String(t('study.prefs.subtitle'))}
    />
  )

  if (!prefs) {
    // Skeleton body mirrors the loaded layout: 5 setting groups (target
    // test + grade level as tall grids, then the three segmented rows).
    return (
      <StudyScrollShell header={header}>
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
      </StudyScrollShell>
    )
  }

  return (
    <StudyScrollShell header={header}>
      {/* Save-failure toast — the optimistic revert is invisible
          without it. Fixed above the bottom nav. */}
      {saveFailed && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(var(--safe-area-bottom,0px)+76px)] z-50 rounded-full bg-gray-900/95 text-white text-[12.5px] font-medium px-4 py-2.5 shadow-lg animate-fade-in-up">
          {ko ? '저장하지 못했어요. 다시 시도해 주세요.' : "Couldn't save. Please try again."}
        </div>
      )}

      {/* Target test — multi-select. A student can prep for more than one
          test (SAT + TOEFL). Tapping a chip ADDS it (and focuses it); it
          never removes on the same tap — that used to read as an
          accidental cancel. Remove is a deliberate ✕ on the chip. The
          focused test (target_test) drives the StudyPath + predicted
          score; its goal row sits just below. Case-insensitive to
          tolerate legacy mixed-case rows ('sat' vs 'SAT'). */}
      <SettingGroup icon={Target} label={String(t('study.prefs.targetTest'))} saving={saving === 'target_tests' || saving === 'target_test'}>
        <div className="grid grid-cols-2 gap-2">
          {TESTS.map(test => {
            const targeted = new Set((prefs.target_tests ?? []).map(s => s.toUpperCase()))
            // Fall back to the single focus pointer for older rows that only
            // set target_test.
            if (targeted.size === 0 && prefs.target_test) targeted.add(prefs.target_test.toUpperCase())
            const selected = targeted.has(test.value)
            const focused = (prefs.target_test ?? '').toUpperCase() === test.value
            const locked = !test.available && !selected
            const remove = () => {
              const next = [...targeted].filter(v => v !== test.value)
              update('target_tests', next)
            }
            return (
              <div key={test.value} className="relative">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    // Selected → make it the focus (non-destructive).
                    // Unselected → add it (route sets it as focus too).
                    if (selected) { if (!focused) update('target_test', test.value) }
                    else update('target_tests', [...targeted, test.value])
                  }}
                  className={`relative w-full h-11 rounded-xl text-[13.5px] font-semibold transition-all ${
                    selected
                      ? focused
                        ? 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/30'
                        : 'bg-primary/10 text-primary ring-1 ring-primary/25 active:scale-[0.98]'
                      : locked
                        ? 'bg-gray-50 text-gray-400 ring-1 ring-gray-200/60 cursor-not-allowed'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                  }`}
                >
                  {ko ? test.ko : test.en}
                  {focused && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.1em] text-white/80">
                      {ko ? '주력' : 'Focus'}
                    </span>
                  )}
                  {locked && (
                    <span className="absolute top-1 right-1.5 text-[8.5px] font-bold uppercase tracking-wide text-gray-400">
                      {ko ? '준비 중' : 'Soon'}
                    </span>
                  )}
                </button>
                {selected && (
                  <button
                    type="button"
                    aria-label={ko ? `${ko ? test.ko : test.en} 제거` : `Remove ${test.en}`}
                    onClick={remove}
                    className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-1 transition-transform active:scale-90 ${
                      focused ? 'bg-white text-primary ring-primary/20' : 'bg-white text-gray-500 ring-gray-200'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </SettingGroup>

      {/* Goal score — one row per target test that has a known scale
          (SAT, TOEFL). Each writes into the goal_scores map; the server
          mirrors SAT down to the legacy goal_score the predicted-score
          engine reads. */}
      {(() => {
        // Unique target tests (case-insensitive), preserving order, that
        // have a goal scale defined.
        const seen = new Set<string>()
        const goalTests: string[] = []
        for (const raw of [...(prefs.target_tests ?? []), prefs.target_test ?? '']) {
          const key = raw.toLowerCase()
          if (key && GOAL_SCALES[key] && !seen.has(key)) { seen.add(key); goalTests.push(key) }
        }
        const multi = goalTests.length > 1
        return goalTests.map(test => {
          const scale = GOAL_SCALES[test]
          const current = prefs.goal_scores?.[test] ?? null
          const label = multi
            ? `${test.toUpperCase()} ${ko ? '목표 점수' : 'goal'}`
            : (ko ? '목표 점수' : 'Goal score')
          return (
            <SettingGroup key={test} icon={TrendingUp} label={label} saving={saving === 'goal_scores'}>
              <div className={`grid gap-2 ${scale.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
                {scale.map(s => {
                  const selected = current === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const next = { ...(prefs.goal_scores ?? {}) }
                        if (selected) delete next[test]
                        else next[test] = s
                        void update('goal_scores', next)
                      }}
                      className={`h-11 rounded-xl text-[13.5px] font-semibold transition-all ${
                        selected
                          ? 'bg-gradient-to-b from-primary to-primary/90 text-white ring-1 ring-primary/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)]'
                          : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.98]'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </SettingGroup>
          )
        })
      })()}

      {/* Grade level */}
      <SettingGroup icon={GraduationCap} label={String(t('study.prefs.gradeLevel'))} saving={saving === 'grade_level'}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
          {GRADES.map(grade => {
            const selected = prefs.grade_level === grade.value
            return (
              <button
                key={grade.value}
                type="button"
                onClick={() => update('grade_level', selected ? null : grade.value)}
                className={`flex items-center justify-between h-11 px-4 rounded-xl text-[14px] font-semibold transition-all ${
                  selected
                    ? 'bg-gradient-to-b from-primary to-primary/90 text-white ring-1 ring-primary/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25)]'
                    : 'bg-white text-gray-700 ring-1 ring-gray-200/70 hover:ring-primary/30 active:scale-[0.99]'
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

    </StudyScrollShell>
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
  return <SegmentedTabs options={options} value={value} onChange={onChange} />
}
