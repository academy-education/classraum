"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, ChevronDown, Check } from '@/app/mobile/study/_shared/icons'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { StudyButton } from '../_shared/StudyButton'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonSettingsGroup, SkeletonStickyHeader } from '../skeletons'
import { useStudyErrorToast, startFailedMessage } from '../_shared/useStudyErrorToast'
import { NoCreditsSheet } from '../_shared/CreditConfirmSheet'
import { creditCostForTest } from '@/lib/study/plans'

interface TopicRow {
  id: string
  slug: string
  name_en: string
  name_ko: string
  parent_id: string | null
  category: string
  parent: { slug: string; name_en: string; name_ko: string } | { slug: string; name_en: string; name_ko: string }[] | null
}

const COUNT_PRESETS = [10, 20, 30, 50]
const TIME_PRESETS = [15, 30, 45, 60, 90]

/** Test roots whose sections may appear in the builder. Everything
 *  else is coming-soon and would only add ambiguous entries (four
 *  locked tests all have a section literally named "Writing"). */
const OPEN_TEST_ROOT_SLUGS = new Set(['test-sat'])
/** Mirrors the topic page's HIDDEN_SUBTOPIC_SLUGS. */
const HIDDEN_BUILDER_SLUGS = new Set(['sat-essay'])

/** Display label: test sections carry their family ("SAT · Math") so
 *  same-named sections can never be confused; subjects keep their name. */
function topicLabel(topic: TopicRow, ko: boolean): string {
  const name = ko ? topic.name_ko : topic.name_en
  if (topic.category !== 'test_prep') return name
  const parent = Array.isArray(topic.parent) ? topic.parent[0] : topic.parent
  if (!parent) return name
  const family = (ko ? parent.name_ko : parent.name_en).replace(/^test[- ]/i, '')
  return `${family} · ${name}`
}

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
  // 402 → explicit "not enough credits" popup (cancel / buy).
  const [noCreditsOpen, setNoCreditsOpen] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [loadingTopics, setLoadingTopics] = useState(true)

  // Load the leaf topics the student can target: subject leaves plus
  // test_prep leaves of OPEN tests only. Without the family filter the
  // dropdown listed four adjacent "Writing" rows (TOEFL/TOEIC/IELTS/ACT
  // sections — all locked tests) with no way to tell them apart.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_topics')
        .select('id, slug, name_en, name_ko, parent_id, category, children:study_topics!parent_id(id)')
        .not('parent_id', 'is', null)
        .order('name_en', { ascending: true })
      if (cancelled) return
      // Parent rows (for family filtering + labels) in one extra query —
      // PostgREST can't embed both directions of a self-FK reliably.
      const parentIds = [...new Set((data ?? []).map(r => r.parent_id as string).filter(Boolean))]
      const { data: parentRows } = await supabase
        .from('study_topics')
        .select('id, slug, name_en, name_ko')
        .in('id', parentIds)
      if (cancelled) return
      const parentById = new Map((parentRows ?? []).map(p => [p.id as string, p]))

      const leaves = (data ?? []).flatMap(t => {
        const row = t as unknown as {
          slug: string
          category: string
          parent_id: string
          children: { id: string }[]
        }
        // Keep only leaves (no children of their own).
        if (row.children && row.children.length > 0) return []
        if (HIDDEN_BUILDER_SLUGS.has(row.slug)) return []
        const parent = parentById.get(row.parent_id) ?? null
        // Test-prep leaves: only families that are open (SAT for now).
        if (row.category === 'test_prep') {
          if (!parent || !OPEN_TEST_ROOT_SLUGS.has(parent.slug as string)) return []
        }
        return [{ ...(t as object), parent } as unknown as TopicRow]
      })
      setTopics(leaves)
      setLoadingTopics(false)
    })()
    return () => { cancelled = true }
  }, [])

  const selectedTopic = topics.find(t => t.id === topicId) ?? null

  const start = async () => {
    if (!user?.userId || !selectedTopic || creating) return
    setCreating(true)
    // The builder is SAT-only (OPEN_TEST_ROOT_SLUGS), and SAT full tests
    // are assembled instantly from the verified item bank — never
    // AI-generated. Route through /assemble (charges the per-section
    // credit cost since the 2026-07 relaunch) instead of
    // a raw session insert that would fall into the generate pipeline and
    // reserve a credit. `count` honors the picked length; the bank is
    // fixed-difficulty so the difficulty/time knobs don't apply here.
    const section = /math/i.test(selectedTopic.slug) ? 'math' : 'reading_writing'
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/assemble', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, count: questionCount, adaptive: false }),
      })
      if (res.status === 402) {
        setCreating(false)
        setNoCreditsOpen(true)
        return
      }
      if (!res.ok) {
        setCreating(false)
        showError(startFailedMessage(ko))
        return
      }
      const json = await res.json()
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setCreating(false)
      showError(startFailedMessage(ko))
    }
  }

  if (loadingTopics) {
    return (
      <StudyScrollShell header={<SkeletonStickyHeader />}>
        <SkeletonSettingsGroup rows={2} />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
        <SkeletonSettingsGroup />
      </StudyScrollShell>
    )
  }

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={Sparkles}
          iconColorClass="text-orange-600 bg-orange-50"
          eyebrow={String(t('study.builder.eyebrow'))}
          title={String(t('study.builder.title'))}
          subtitle={String(t('study.builder.subtitle'))}
        />
      }
    >
      {errorToast}
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
              {selectedTopic ? topicLabel(selectedTopic, ko) : String(t('study.builder.topicPlaceholder'))}
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
                    <span className="truncate">{topicLabel(topic, ko)}</span>
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
      <StudyButton
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        square
        onClick={() => void start()}
        disabled={!selectedTopic || creating}
        loading={creating}
        leftIcon={<ArrowRight className="w-4 h-4" />}
      >
        {String(t('study.builder.start'))}
      </StudyButton>
      <NoCreditsSheet
        open={noCreditsOpen}
        cost={creditCostForTest('sat', selectedTopic && /math/i.test(selectedTopic.slug) ? 'math' : 'reading_writing')}
        ko={ko}
        onCancel={() => setNoCreditsOpen(false)}
      />
    </StudyScrollShell>
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
