"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'

/**
 * /mobile/study/topic/[slug] — topic page with mode picker.
 *
 * Works at any tree level. Branch-level pages list their leaves
 * underneath so the student can drill in for a tighter session;
 * leaf-level pages skip that section (no children to show). Either
 * way, picking a mode creates a study_session row scoped to the
 * current topic and routes to /mobile/study/session/[id].
 *
 * The session insert respects the column defaults from the schema
 * (status='active', language matched to current i18n cookie, no
 * title yet — the chat tutor fills it in after the first exchange).
 */

interface Topic {
  id: string
  parent_id: string | null
  slug: string
  name_en: string
  name_ko: string
  level: number
}

export default function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return (
    <StudySubscriptionGate>
      <TopicInner slug={slug} />
    </StudySubscriptionGate>
  )
}

function TopicInner({ slug }: { slug: string }) {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [topic, setTopic] = useState<Topic | null>(null)
  const [parent, setParent] = useState<Topic | null>(null)
  const [children, setChildren] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<StudyMode | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data: row } = await supabase
        .from('study_topics')
        .select('id, parent_id, slug, name_en, name_ko, level')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled || !row) {
        setLoading(false)
        return
      }
      setTopic(row)

      // Parent breadcrumb (subject for a branch, branch for a leaf).
      // Children list for branches (level 1) to surface leaves.
      const [{ data: parentRow }, { data: childRows }] = await Promise.all([
        row.parent_id
          ? supabase
              .from('study_topics')
              .select('id, parent_id, slug, name_en, name_ko, level')
              .eq('id', row.parent_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        row.level === 1
          ? supabase
              .from('study_topics')
              .select('id, parent_id, slug, name_en, name_ko, level')
              .eq('parent_id', row.id)
              .order('sort_order')
          : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      setParent(parentRow ?? null)
      setChildren((childRows ?? []) as Topic[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [slug])

  const startSession = async (mode: StudyMode) => {
    if (!topic || !user?.userId) return
    setCreating(mode)
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: topic.id,
        mode,
        language: ko ? 'ko' : 'en',
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreating(null)
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 px-5 py-10">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.landing.loading')}
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        {t('study.topic.notFound')}
      </div>
    )
  }

  const name = (n: { name_en: string; name_ko: string }) => ko ? n.name_ko : n.name_en

  return (
    <div className="px-5 pt-6 pb-12 space-y-7">
      {/* Back to landing — small affordance above the heading. */}
      <Link
        href="/mobile/study"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.topic.backToStudy')}
      </Link>

      <header>
        {parent && (
          <p className="text-xs text-gray-500 mb-1">{name(parent)}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {name(topic)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('study.topic.pickMode')}
        </p>
      </header>

      {/* Mode picker — four cards, one per mode. */}
      <section className="grid grid-cols-2 gap-3">
        {STUDY_MODES.map(mode => {
          const Icon = mode.icon
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => startSession(mode.key)}
              disabled={creating !== null}
              className="group flex flex-col items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_4px_16px_-6px_rgba(40,133,232,0.18)] active:scale-[0.98] transition-all text-left disabled:opacity-60 disabled:cursor-wait"
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${mode.color} ring-1 ring-black/[0.03]`}>
                {creating === mode.key ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {t(`study.modes.${mode.key}.title`)}
                </div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {t(`study.modes.${mode.key}.body`)}
                </div>
              </div>
            </button>
          )
        })}
      </section>

      {/* Leaf list — branch pages only. Tapping a leaf navigates into
          a tighter scoped topic page so mode sessions are sharper. */}
      {children.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            {t('study.topic.narrowDown')}
          </h2>
          <div className="rounded-2xl bg-white overflow-hidden ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {children.map((child, i) => (
              <Link
                key={child.id}
                href={`/mobile/study/topic/${child.slug}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  i < children.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span>{name(child)}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
