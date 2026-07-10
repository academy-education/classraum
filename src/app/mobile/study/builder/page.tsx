"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Sparkles, ChevronDown, Check } from 'lucide-react'
import { StudySubPageHeader } from '../_shared/primitives'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonBlock, SkeletonSettingsGroup } from '../skeletons'
import { useStudyErrorToast, startFailedMessage } from '../_shared/useStudyErrorToast'

interface TopicRow {
  id: string
  slug: string
  name_en: string
  name_ko: string
  parent_id: string | null
}

const COUNT_PRESETS = [10, 20, 30, 50]
const TIME_PRESETS = [15, 30, 45, 60, 90]

/**
 * Custom test builder — pick a topic + question count + time + difficulty
 * in one screen, hit "Start". Skips the topic-page / mode-picker dance
 * for students who know exactly what they want to drill.
 *
 * Builds on the existing test_generate pipeline via session.config —
 * the same plumbing the regular Full Test customization sheet uses.
 */
export default function CustomTestBuilderPage() {
  return (
    <StudySubscriptionGate>
      <BuilderInner />
    </StudySubscriptionGate>
  )
}

function BuilderInner() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'

  const [topics, setTopics] = useState<TopicRow[]>([])
  const [topicId, setTopicId] = useState<string | null>(null)
  const [topicPickerOpen, setTopicPickerOpen] = useState(false)
  const [questionCount, setQuestionCount] = useState(20)
  const [timeLimit, setTimeLimit] = useState(30)
  const [difficulty, setDifficulty] = useState<'warmup' | 'balanced' | 'challenge'>('balanced')
  const [creating, setCreating] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [loadingTopics, setLoadingTopics] = useState(true)

  // Load every leaf topic the student can target. Both subject and
  // test_prep leaves; user picks via the dropdown.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_topics')
        .select('id, slug, name_en, name_ko, parent_id, category, children:study_topics!parent_id(id)')
        .not('parent_id', 'is', null)
        .order('name_en', { ascending: true })
      if (cancelled) return
      // Keep only leaves (no children of their own).
      const leaves = (data ?? []).filter(t => {
        const kids = (t as unknown as { children: { id: string }[] }).children
        return !kids || kids.length === 0
      })
      setTopics(leaves as TopicRow[])
      setLoadingTopics(false)
    })()
    return () => { cancelled = true }
  }, [])

  const selectedTopic = topics.find(t => t.id === topicId) ?? null

  const start = async () => {
    if (!user?.userId || !selectedTopic || creating) return
    setCreating(true)
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: selectedTopic.id,
        mode: 'full_test',
        language: ko ? 'ko' : 'en',
        config: {
          questionCount,
          timeLimit,
          difficultyBias: difficulty,
        },
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreating(false)
      showError(startFailedMessage(ko))
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  if (loadingTopics) {
    return (
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-1/2 rounded-lg" />
          <SkeletonBlock className="h-3 w-4/5 rounded-full" />
        </div>
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
      {errorToast}
      <StudySubPageHeader
        backHref="/mobile/study"
        backLabel={String(t('study.topic.backToStudy'))}
        icon={Sparkles}
        iconColorClass="text-orange-600 bg-orange-50"
        eyebrow={String(t('study.builder.eyebrow'))}
        title={String(t('study.builder.title'))}
        subtitle={String(t('study.builder.subtitle'))}
      />

      {/* Topic picker — dropdown opens a full topic list. */}
      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600 mb-2 px-1">
          {String(t('study.builder.topicLabel'))}
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTopicPickerOpen(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 h-12 rounded-2xl bg-white ring-1 ring-gray-200/70 hover:ring-primary/25 transition-all"
          >
            <span className={`text-[15px] font-semibold ${selectedTopic ? 'text-gray-900' : 'text-gray-400'}`}>
              {selectedTopic ? (ko ? selectedTopic.name_ko : selectedTopic.name_en) : String(t('study.builder.topicPlaceholder'))}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${topicPickerOpen ? 'rotate-180' : ''}`} />
          </button>
          {topicPickerOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.18)] max-h-[50vh] overflow-y-auto py-1.5">
              {topics.map(topic => {
                const selected = topic.id === topicId
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => { setTopicId(topic.id); setTopicPickerOpen(false) }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] text-left transition-colors ${
                      selected ? 'bg-primary/[0.06] text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{ko ? topic.name_ko : topic.name_en}</span>
                    {selected && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Count */}
      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600 mb-2 px-1">
          {String(t('study.builder.countLabel'))}
        </h2>
        <Segmented
          options={COUNT_PRESETS.map(n => ({ value: n, label: String(n) }))}
          value={questionCount}
          onChange={setQuestionCount}
        />
      </section>

      {/* Time */}
      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600 mb-2 px-1">
          {String(t('study.builder.timeLabel'))}
        </h2>
        <Segmented
          options={TIME_PRESETS.map(n => ({ value: n, label: ko ? `${n}분` : `${n}m` }))}
          value={timeLimit}
          onChange={setTimeLimit}
        />
      </section>

      {/* Difficulty */}
      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600 mb-2 px-1">
          {String(t('study.builder.difficultyLabel'))}
        </h2>
        <Segmented
          options={[
            { value: 'warmup',    label: String(t('study.testConfig.difficultyWarmup')) },
            { value: 'balanced',  label: String(t('study.testConfig.difficultyBalanced')) },
            { value: 'challenge', label: String(t('study.testConfig.difficultyChallenge')) },
          ]}
          value={difficulty}
          onChange={(v) => setDifficulty(v as 'warmup' | 'balanced' | 'challenge')}
        />
      </section>

      {/* Start CTA */}
      <button
        type="button"
        onClick={() => void start()}
        disabled={!selectedTopic || creating}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25),0_8px_20px_-8px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {String(t('study.builder.start'))}
      </button>
    </div>
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
