"use client"

import { useEffect, useState } from 'react'
import { X, Globe, Hash, Clock, Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

/** Per-session test customization payload. Stored on
 *  study_sessions.config (jsonb) and read by the test generator. */
export interface TestConfig {
  language?: 'en' | 'ko'
  /** Override question count. When omitted, uses spec/family default. */
  questionCount?: number
  /** Override time limit in minutes. */
  timeLimit?: number
  /** Difficulty bias: 'balanced' uses the spec's mix as-is;
   *  'challenge' pushes ~50% hard; 'warmup' pushes ~50% easy. */
  difficultyBias?: 'balanced' | 'challenge' | 'warmup'
}

/**
 * Bottom-sheet customization panel shown before a full-test session
 * is created. Lets the student tweak language, question count, time,
 * and difficulty bias. The chosen config is saved to
 * study_sessions.config and read by the test generator.
 *
 * Keeps the default-fast-path intact: the "Start test" button can
 * always be tapped without any tweaks — defaults from the spec
 * library apply. Customization is opt-in, not required.
 */
export function TestCustomizationSheet({
  open,
  defaults,
  onClose,
  onStart,
}: {
  open: boolean
  defaults: { count: number; minutes: number; language: 'en' | 'ko' }
  onClose: () => void
  onStart: (config: TestConfig) => void
}) {
  const { t } = useTranslation()
  const [language, setLanguage] = useState<'en' | 'ko'>(defaults.language)
  const [questionCount, setQuestionCount] = useState<number>(defaults.count)
  const [timeLimit, setTimeLimit] = useState<number>(defaults.minutes)
  const [difficultyBias, setDifficultyBias] = useState<'balanced' | 'challenge' | 'warmup'>('balanced')
  const [starting, setStarting] = useState(false)

  // Reset to defaults whenever the sheet reopens for a new test.
  useEffect(() => {
    if (open) {
      setLanguage(defaults.language)
      setQuestionCount(defaults.count)
      setTimeLimit(defaults.minutes)
      setDifficultyBias('balanced')
      setStarting(false)
    }
  }, [open, defaults.language, defaults.count, defaults.minutes])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isDefault =
    language === defaults.language &&
    questionCount === defaults.count &&
    timeLimit === defaults.minutes &&
    difficultyBias === 'balanced'

  const submit = () => {
    setStarting(true)
    onStart({
      language,
      // Only persist overrides — saves jsonb space and makes "no
      // customization" semantically distinct from "matched defaults".
      ...(questionCount !== defaults.count ? { questionCount } : {}),
      ...(timeLimit !== defaults.minutes ? { timeLimit } : {}),
      ...(difficultyBias !== 'balanced' ? { difficultyBias } : {}),
    })
  }

  // Question count presets — let the student pick from a sane range.
  const COUNT_PRESETS = [10, 20, defaults.count, 40]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)

  const MINUTE_PRESETS = [15, 30, defaults.minutes, 90]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)

  return (
    <>
      {/* Backdrop — clickable to dismiss */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Sheet — bottom-anchored on mobile, slides up */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)] animate-slide-up"
      >
        {/* Drag handle */}
        <div className="pt-2.5 pb-1.5 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
              {String(t('study.testConfig.title'))}
            </h2>
            <p className="text-[12.5px] text-gray-500 mt-0.5">
              {String(t('study.testConfig.subtitle'))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 active:scale-[0.94] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="px-5 py-4 space-y-5">
          {/* Language */}
          <SettingGroup icon={Globe} label={String(t('study.testConfig.language'))}>
            <SegmentedControl
              options={[
                { value: 'en', label: 'English' },
                { value: 'ko', label: '한국어' },
              ]}
              value={language}
              onChange={(v: 'en' | 'ko') => setLanguage(v)}
            />
          </SettingGroup>

          {/* Question count */}
          <SettingGroup icon={Hash} label={String(t('study.testConfig.questionCount'))}>
            <SegmentedControl
              options={COUNT_PRESETS.map(n => ({ value: n, label: String(n) }))}
              value={questionCount}
              onChange={(v: number) => setQuestionCount(v)}
            />
          </SettingGroup>

          {/* Time limit */}
          <SettingGroup icon={Clock} label={String(t('study.testConfig.timeLimit'))}>
            <SegmentedControl
              options={MINUTE_PRESETS.map(n => ({ value: n, label: `${n}m` }))}
              value={timeLimit}
              onChange={(v: number) => setTimeLimit(v)}
            />
          </SettingGroup>

          {/* Difficulty bias */}
          <SettingGroup icon={Sparkles} label={String(t('study.testConfig.difficulty'))}>
            <SegmentedControl
              options={[
                { value: 'warmup', label: String(t('study.testConfig.difficultyWarmup')) },
                { value: 'balanced', label: String(t('study.testConfig.difficultyBalanced')) },
                { value: 'challenge', label: String(t('study.testConfig.difficultyChallenge')) },
              ]}
              value={difficultyBias}
              onChange={(v: 'balanced' | 'challenge' | 'warmup') => setDifficultyBias(v)}
            />
          </SettingGroup>
        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-white via-white to-white/80 border-t border-gray-100">
          <button
            type="button"
            onClick={submit}
            disabled={starting}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25),0_8px_20px_-8px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 hover:from-primary/95 hover:to-primary/85 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait transition-all"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isDefault
              ? String(t('study.testConfig.startDefault'))
              : String(t('study.testConfig.startCustom'))}
          </button>
        </div>
      </div>
    </>
  )
}

function SettingGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.10em] text-gray-600">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/** iOS-style segmented control. Single-row pill with the selected
 *  option lifted as a white capsule. */
function SegmentedControl<T>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
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
            className={`flex-1 h-9 rounded-[10px] text-[13px] font-semibold tracking-tight transition-all ${
              selected
                ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_6px_-2px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]'
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
