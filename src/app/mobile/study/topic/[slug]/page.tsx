"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Loader2, FileText, ArrowRight, Sparkles } from 'lucide-react'
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
  category: 'subject' | 'test_prep'
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
        .select('id, parent_id, slug, name_en, name_ko, level, category')
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
              .select('id, parent_id, slug, name_en, name_ko, level, category')
              .eq('id', row.parent_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        row.level === 1
          ? supabase
              .from('study_topics')
              .select('id, parent_id, slug, name_en, name_ko, level, category')
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
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 -z-10 bg-gradient-to-b from-primary/[0.03] to-transparent"
      />
      <div className="px-5 pt-6 pb-14 space-y-8">
        {/* Back to landing — small affordance above the heading. */}
        <Link
          href="/mobile/study"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors -ml-1 px-1 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('study.topic.backToStudy')}
        </Link>

        <header>
          {parent && (
            <p className="text-[12px] font-medium text-gray-400 mb-1.5 tracking-tight">{name(parent)}</p>
          )}
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-gray-900">
            {name(topic)}
          </h1>
          <p className="text-[15px] text-gray-500 mt-2 leading-relaxed">
            {t('study.topic.pickMode')}
          </p>
        </header>

        {/* Mode picker.
            - Test-prep topics get a featured full-width "Full test"
              tile at the top (it's the marquee mode for that surface),
              then the four learning modes in a 2x2 grid below.
            - Subject topics omit Full test entirely — taking a "mock
              test" on Algebra is awkward; practice + lesson fit better.
         */}
        {topic.category === 'test_prep' && (
          <FeaturedFullTestCard
            startSession={startSession}
            creating={creating}
            t={t}
          />
        )}
        <section className="grid grid-cols-2 gap-3">
          {STUDY_MODES
            .filter(m => m.key !== 'full_test')
            .map(mode => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => startSession(mode.key)}
                  disabled={creating !== null}
                  className={`group relative overflow-hidden flex flex-col items-start gap-3.5 rounded-2xl ${mode.cardBg} p-5 ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${mode.hoverRing} ${mode.hoverShadow} hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait`}
                >
                  {/* Top edge highlight + decorative glow blob in corner for visual identity */}
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  <div aria-hidden className={`pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full ${mode.iconBg} opacity-10 blur-2xl`} />

                  <div className={`relative w-12 h-12 rounded-2xl ${mode.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]`}>
                    {creating === mode.key ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="relative">
                    <div className={`text-[15px] font-semibold text-gray-900 ${mode.hoverText} transition-colors`}>
                      {t(`study.modes.${mode.key}.title`)}
                    </div>
                    <div className="text-[13px] text-gray-600 mt-1 leading-relaxed">
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
            <h2 className="text-[15px] font-semibold text-gray-900 mb-3">
              {t('study.topic.narrowDown')}
            </h2>
            <div className="rounded-2xl bg-white overflow-hidden ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              {children.map((child, i) => (
                <Link
                  key={child.id}
                  href={`/mobile/study/topic/${child.slug}`}
                  className={`group/leaf flex items-center justify-between gap-3 px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50/70 active:bg-gray-100 transition-colors ${
                    i < children.length - 1 ? 'border-b border-gray-100/80' : ''
                  }`}
                >
                  <span className="font-medium">{name(child)}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover/leaf:text-primary group-hover/leaf:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

/**
 * Full-width feature card for the Full Test mode on test-prep topic
 * pages. Lifted out of the inline render so the JSX above stays
 * readable; ranks the test mode visually above the four learning
 * modes since it's the marquee surface for SAT/TOEFL/KSAT/etc.
 */
function FeaturedFullTestCard({
  startSession,
  creating,
  t,
}: {
  startSession: (m: StudyMode) => void
  creating: StudyMode | null
  t: (k: string) => unknown
}) {
  return (
    <button
      type="button"
      onClick={() => startSession('full_test')}
      disabled={creating !== null}
      className="group relative w-full rounded-2xl p-5 ring-1 ring-rose-200/60 bg-gradient-to-br from-rose-50/80 via-amber-50/30 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(244,63,94,0.18)] hover:ring-rose-300/70 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(244,63,94,0.26)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait overflow-hidden"
    >
      {/* Subtle inner highlight on top edge for premium depth */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white text-rose-600 flex items-center justify-center ring-1 ring-rose-200/50 shadow-[0_1px_2px_rgba(244,63,94,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] flex-shrink-0">
          {creating === 'full_test'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[17px] font-semibold text-gray-900 group-hover:text-rose-700 transition-colors tracking-tight">
              {String(t('study.modes.full_test.title'))}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 bg-white/90 backdrop-blur ring-1 ring-rose-200/80 rounded-full px-2 py-0.5 shadow-[0_1px_2px_rgba(244,63,94,0.06)]">
              <Sparkles className="w-2.5 h-2.5" />
              {String(t('study.topic.testPrepBadge'))}
            </span>
          </div>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t('study.modes.full_test.body'))}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-rose-400/70 group-hover:text-rose-500 group-hover:translate-x-0.5 mt-1.5 flex-shrink-0 transition-all" />
      </div>
    </button>
  )
}
