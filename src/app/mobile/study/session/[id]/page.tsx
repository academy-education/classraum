"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'
import { ChatSession } from './ChatSession'
import { PracticeSession } from './PracticeSession'
import { LessonSession } from './LessonSession'
import { FlashcardsSession } from './FlashcardsSession'

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
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 px-5 py-10">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.landing.loading')}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        {t('study.session.notFound')}
      </div>
    )
  }

  const mode = STUDY_MODES.find(m => m.key === session.mode)
  const ModeIcon = mode?.icon

  const header = (
    <div className="flex-shrink-0 px-5 pt-5 pb-3 bg-gray-50 border-b border-gray-100">
      <Link
        href={topic ? `/mobile/study/topic/${topic.slug}` : '/mobile/study'}
        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t('study.session.back')}
      </Link>
      <div className="flex items-center gap-3">
        {ModeIcon && mode && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode.color}`}>
            <ModeIcon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-500">
            {t(`study.modes.${session.mode}.title`)}
          </p>
          <h1 className="text-base font-semibold tracking-tight text-gray-900 truncate">
            {topic ? (ko ? topic.name_ko : topic.name_en) : t('study.session.untitled')}
          </h1>
        </div>
      </div>
    </div>
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
