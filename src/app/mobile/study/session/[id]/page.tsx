"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'

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

  return (
    <div className="px-5 pt-6 pb-12 space-y-6">
      <Link
        href={topic ? `/mobile/study/topic/${topic.slug}` : '/mobile/study'}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.session.back')}
      </Link>

      <header className="flex items-center gap-3">
        {ModeIcon && mode && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode.color}`}>
            <ModeIcon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-gray-500">
            {t(`study.modes.${session.mode}.title`)}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900 truncate">
            {topic ? (ko ? topic.name_ko : topic.name_en) : t('study.session.untitled')}
          </h1>
        </div>
      </header>

      {/* Per-mode placeholder body — Phase 2 replaces each branch with
          the real interactive UI. */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">
          {t(`study.modes.${session.mode}.comingSoon`)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {t('study.session.placeholderHint')}
        </p>
      </div>
    </div>
  )
}
