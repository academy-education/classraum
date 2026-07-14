"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, HelpCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'
import { StudyPageHeader } from '../../_shared/primitives'
import { MascotLoader, useMascotGate } from '../../_shared/MascotLoader'
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
  const showLoader = useMascotGate(loading)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // try/finally: a thrown query (network drop) must not strand the
      // skeleton — fall through to the not-found state, which has a
      // back link, instead of spinning forever.
      try {
        const { data: row } = await supabase
          .from('study_sessions')
          .select('id, topic_id, mode, title, language')
          .eq('id', id)
          .maybeSingle()

        if (cancelled || !row) return
        setSession(row as Session)

        if (row.topic_id) {
          const { data: t } = await supabase
            .from('study_topics')
            .select('slug, name_en, name_ko')
            .eq('id', row.topic_id)
            .maybeSingle()
          if (!cancelled) setTopic(t as Topic | null)
        }
      } catch { /* handled by finally + not-found fallback */ }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading || showLoader) {
    // Studying surface → Raumi (commit-gated).
    return showLoader
      ? <MascotLoader className="h-full py-16" label={t('study.landing.loading')} />
      : <div className="h-full py-16" aria-hidden />
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-14 text-center">
        <p className="text-sm text-gray-500">{t('study.session.notFound')}</p>
        <Link
          href="/mobile/study"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />{t('study.topic.backToStudy')}
        </Link>
      </div>
    )
  }

  const mode = STUDY_MODES.find(m => m.key === session.mode)
  const ModeIcon = mode?.icon ?? HelpCircle

  const header = (
    <StudyPageHeader
      wide
      backHref={topic ? `/mobile/study/topic/${topic.slug}` : '/mobile/study'}
      backLabel={String(t('study.session.back'))}
      icon={ModeIcon}
      iconColorClass={mode?.color ?? 'text-primary bg-primary/10'}
      eyebrow={String(t(`study.modes.${session.mode}.title`))}
      title={topic ? (ko ? topic.name_ko : topic.name_en) : String(t('study.session.untitled'))}
    />
  )

  // Pick the mode-specific session UI. Every mode shares the same
  // chrome so this is chosen once and wrapped in a single capped column.
  const body = (() => {
    switch (session.mode) {
      case 'chat':       return <ChatSession sessionId={session.id} language={session.language} />
      case 'practice':   return <PracticeSession sessionId={session.id} language={session.language} />
      case 'lesson':     return <LessonSession sessionId={session.id} language={session.language} />
      case 'flashcards': return <FlashcardsSession sessionId={session.id} language={session.language} />
      case 'full_test':  return <TestSession sessionId={session.id} language={session.language} />
      case 'response':   return <ResponseSession sessionId={session.id} language={session.language} />
      default:
        // Safety net if a row ever lands with an unknown mode value.
        return (
          <div className="flex-1 px-5 py-8">
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {t('study.session.unknownMode')}
              </p>
            </div>
          </div>
        )
    }
  })()

  // Test-taking surfaces (practice + full test) lay their content out in
  // TWO panes on desktop (passage/prompt beside the answers) and FILL the
  // width — big screens should be used, not framed by dead gutters.
  // Single-flow reading modes (chat/lesson/flashcards/response) still cap
  // to a comfortable measure. The header always spans full width with the
  // back button at the left. Phones get the full screen either way.
  const wide = session.mode === 'practice' || session.mode === 'full_test'

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Full-width header (back at the left edge). */}
      {header}
      <div className={`flex-1 flex flex-col min-h-0 w-full ${wide ? '' : 'max-w-3xl mx-auto'}`}>
        {body}
      </div>
    </div>
  )
}
