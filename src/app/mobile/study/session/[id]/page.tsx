"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, HelpCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'
import { StudyPageHeader } from '../../_shared/primitives'
import { SkeletonCard, SkeletonBlock } from '../../skeletons'
import { ChatSession } from './ChatSession'
import { PracticeSession } from './PracticeSession'
import { LessonSession } from './LessonSession'
import { FlashcardsSession } from './FlashcardsSession'
import { TestSession } from './TestSession'
import { ResponseSession } from './ResponseSession'

/**
 * /mobile/study/session/[id] — active study session viewer.
 *
 * Phase 1.5 stub: loads the session row, shows topic + mode chrome,
 * and renders a per-mode placeholder body. Phase 2 replaces the body
 * with real per-mode UI:
 *   - chat:       streaming SSE message thread + composer
 *   - practice:   AI-generated questions + answer + grading
 *   - lesson:     AI-generated structured lesson + comprehension
 *   - flashcards: card deck with spaced-repetition flow
 *
 * RLS already enforces that the student can only read their own
 * session, so the empty-row case here means either the id is wrong
 * or someone else's link was shared.
 */

interface Session {
  id: string
  topic_id: string | null
  mode: StudyMode
  title: string | null
  language: 'en' | 'ko'
}

interface Topic {
  slug: string
  name_en: string
  name_ko: string
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <StudySubscriptionGate>
      <SessionInner id={id} />
    </StudySubscriptionGate>
  )
}

function SessionInner({ id }: { id: string }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [session, setSession] = useState<Session | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: row } = await supabase
        .from('study_sessions')
        .select('id, topic_id, mode, title, language')
        .eq('id', id)
        .maybeSingle()

      if (cancelled || !row) {
        setLoading(false)
        return
      }
      setSession(row as Session)

      if (row.topic_id) {
        const { data: t } = await supabase
          .from('study_topics')
          .select('slug, name_en, name_ko')
          .eq('id', row.topic_id)
          .maybeSingle()
        if (!cancelled) setTopic(t as Topic | null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    // Skeleton mirrors the loaded session shell: sticky header +
    // one big card body — so the mode-specific component slots in
    // cleanly when data arrives.
    return (
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <div className="flex items-start gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-2.5 w-16 rounded-full" />
            <SkeletonBlock className="h-4 w-2/5 rounded-full" />
          </div>
        </div>
        <SkeletonCard className="p-5 min-h-[240px] space-y-3">
          <SkeletonBlock className="h-3 w-1/4 rounded-full" />
          <SkeletonBlock className="h-4 w-4/5 rounded-full" />
          <SkeletonBlock className="h-4 w-3/5 rounded-full" />
        </SkeletonCard>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-14 text-center">
        <p className="text-sm text-gray-500">{t('study.session.notFound')}</p>
        <Link
          href="/mobile/study"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4" />{t('study.topic.backToStudy')}
        </Link>
      </div>
    )
  }

  const mode = STUDY_MODES.find(m => m.key === session.mode)
  const ModeIcon = mode?.icon ?? HelpCircle

  const header = (
    <StudyPageHeader
      backHref={topic ? `/mobile/study/topic/${topic.slug}` : '/mobile/study'}
      backLabel={String(t('study.session.back'))}
      icon={ModeIcon}
      iconColorClass={mode?.color ?? 'text-primary bg-primary/10'}
      eyebrow={String(t(`study.modes.${session.mode}.title`))}
      title={topic ? (ko ? topic.name_ko : topic.name_en) : String(t('study.session.untitled'))}
    />
  )

  // Chat + Practice modes get real UIs now. Lesson + Flashcards still
  // show the Phase 1.5 placeholder until their implementations land.
  if (session.mode === 'chat') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <ChatSession sessionId={session.id} language={session.language} />
      </div>
    )
  }
  if (session.mode === 'practice') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <PracticeSession sessionId={session.id} language={session.language} />
      </div>
    )
  }
  if (session.mode === 'lesson') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <LessonSession sessionId={session.id} language={session.language} />
      </div>
    )
  }
  if (session.mode === 'flashcards') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <FlashcardsSession sessionId={session.id} language={session.language} />
      </div>
    )
  }
  if (session.mode === 'full_test') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <TestSession sessionId={session.id} language={session.language} />
      </div>
    )
  }
  if (session.mode === 'response') {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <ResponseSession sessionId={session.id} language={session.language} />
      </div>
    )
  }

  // All four modes are wired; this branch is the safety net if a row
  // ever lands with an unknown mode value.
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {header}
      <div className="flex-1 px-5 py-8">
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">
            {t('study.session.unknownMode')}
          </p>
        </div>
      </div>
    </div>
  )
}
