"use client"

import React, { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Loader2, FileText, ArrowRight, Sparkles, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'
import { TestCustomizationSheet, type TestConfig } from '../../TestCustomizationSheet'
import { loadSectionSpec } from '@/lib/test-spec-cache'
import { loadStudyPromptContext } from '@/lib/study-prompt-context'

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
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<StudyMode | null>(null)
  const [testSheetOpen, setTestSheetOpen] = useState(false)
  const [testDefaults, setTestDefaults] = useState<{ count: number; minutes: number; language: 'en' | 'ko' }>({
    count: 20, minutes: 30, language: ko ? 'ko' : 'en',
  })

  // When the topic has children (e.g., AP → AP Biology / AP Calc AB),
  // the page shows a category picker. The selected category becomes
  // the actual topic the session is created against. For leaf topics
  // (no children) we just use the topic itself.
  const effectiveTopic = selectedChildId
    ? children.find(c => c.id === selectedChildId) ?? topic
    : topic

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
      const kids = (childRows ?? []) as Topic[]
      setParent(parentRow ?? null)
      setChildren(kids)
      // Default-select the first child so the mode picker has a real
      // target on first paint (no "you haven't chosen a category" state).
      if (kids.length > 0) setSelectedChildId(kids[0].id)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [slug])

  const startSession = async (mode: StudyMode, config?: TestConfig) => {
    const target = effectiveTopic
    if (!target || !user?.userId) return
    setCreating(mode)
    // Use the per-session language override from config if provided,
    // else the UI language at session-start time.
    const sessionLanguage = config?.language ?? (ko ? 'ko' : 'en')
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: target.id,
        mode,
        language: sessionLanguage,
        config: config ?? {},
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreating(null)
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  // Open the customization sheet for a full test. Loads the spec
  // defaults (question count + time) for the effective topic so the
  // sheet can show them as the starting values.
  const openTestSheet = async () => {
    const target = effectiveTopic
    if (!target) return
    try {
      const ctx = await loadStudyPromptContext(target.id, ko ? 'ko' : 'en')
      const family = ctx?.testFamily ?? null
      const section = ctx?.testSection ?? null
      const spec = family ? await loadSectionSpec(family, section) : null
      // Fall back to generic 20 Q / 30 min for non-test topics.
      const count = spec ? Math.min(spec.questionsPerSection, 60) : 20
      const minutes = spec ? Math.round(spec.minutesPerSection * (count / spec.questionsPerSection)) : 30
      setTestDefaults({ count, minutes, language: ko ? 'ko' : 'en' })
    } catch {
      setTestDefaults({ count: 20, minutes: 30, language: ko ? 'ko' : 'en' })
    }
    setTestSheetOpen(true)
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

        {/* Category picker — only when the topic has children.
            AP → AP Biology / AP Calc AB, KSAT → 국어 / 수학 / 영어, etc.
            The student picks a category first, then the mode picker
            below targets that specific category. For leaves (sat-math,
            ksat-korean) this section doesn't render and the mode
            picker targets the leaf itself. */}
        {children.length > 0 && (
          <CategoryPicker
            label={String(t(topic.category === 'test_prep' ? 'study.topic.sectionPickerLabel' : 'study.topic.categoryPickerLabel'))}
            children={children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
            name={name}
          />
        )}

        {/* Mode picker.
            - Test-prep topics get a featured full-width "Full test"
              tile at the top (it's the marquee mode for that surface),
              then the four learning modes in a 2x2 grid below.
            - Subject topics omit Full test entirely — taking a "mock
              test" on Algebra is awkward; practice + lesson fit better.
         */}
        {topic.category === 'test_prep' && (
          <FeaturedFullTestCard
            startSession={() => openTestSheet()}
            creating={creating}
            t={t}
          />
        )}
        <section className="grid grid-cols-2 gap-3">
          {STUDY_MODES
            .filter(m => m.key !== 'full_test')
            .map((mode, i) => {
              const Icon = mode.icon
              // Per-mode ambient decoration — small glyph cluster that
              // hints at what the mode does. Chat → dots, Practice →
              // checkmarks, Lesson → reading lines, Flashcards → stacked
              // card edges. Brilliant-style ambient texture.
              const decor = MODE_DECOR[mode.key] ?? null
              return (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => startSession(mode.key)}
                  disabled={creating !== null}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={`group relative overflow-hidden flex flex-col items-start gap-3.5 rounded-2xl ${mode.cardBg} p-5 min-h-[148px] ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${mode.hoverRing} ${mode.hoverShadow} hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-out text-left disabled:opacity-60 disabled:cursor-wait animate-card-in opacity-0`}
                >
                  {/* Top edge highlight */}
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                  {/* Decorative glow blob, mode-tinted */}
                  <div aria-hidden className={`pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full ${mode.iconBg} opacity-[0.12] blur-2xl group-hover:opacity-[0.20] transition-opacity duration-300`} />
                  {/* Mode-specific decoration */}
                  {decor}

                  <div className={`relative w-12 h-12 rounded-2xl ${mode.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04] group-hover:scale-105 transition-transform duration-300`}>
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

      </div>

      {/* Pre-test customization sheet — opens when student taps Full
          Test. Saves their choices to session.config which the test
          generator reads to override the spec defaults. */}
      <TestCustomizationSheet
        open={testSheetOpen}
        defaults={testDefaults}
        onClose={() => setTestSheetOpen(false)}
        onStart={(config) => { setTestSheetOpen(false); void startSession('full_test', config) }}
      />
    </div>
  )
}

/** Category picker shown above the mode grid when a topic has
 *  children. Custom dropdown — opens a popover panel listing all
 *  options with the current one checkmarked. Better than a horizontal
 *  chip row when the option count is large (AP has 9, KSAT has 6),
 *  and gives more affordance for the "this is a selector" intent.
 *  Apple-style: subtle bg, chevron, soft shadow when open. */
function CategoryPicker({
  label,
  children: categories,
  selectedId,
  onSelect,
  name,
}: {
  label: string
  children: Topic[]
  selectedId: string | null
  onSelect: (id: string) => void
  name: (n: { name_en: string; name_ko: string }) => string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = categories.find(c => c.id === selectedId) ?? categories[0]

  // Close the dropdown when the user clicks outside, presses Escape,
  // or scrolls — same conventions as iOS / macOS popovers.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <section ref={containerRef}>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-2.5 px-1">
        {label}
      </h2>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`group w-full flex items-center justify-between gap-3 px-4 h-12 rounded-2xl bg-white ring-1 transition-all duration-200 text-left ${
            open
              ? 'ring-primary/40 shadow-[0_2px_8px_-2px_rgba(40,133,232,0.18),0_12px_28px_-12px_rgba(40,133,232,0.22)]'
              : 'ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/25'
          }`}
        >
          <span className="text-[15px] font-semibold text-gray-900 truncate">
            {selected ? name(selected) : '—'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
          />
        </button>
        {open && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_4px_8px_-2px_rgba(0,0,0,0.06),0_24px_48px_-12px_rgba(0,0,0,0.18)] py-1.5 max-h-[60vh] overflow-y-auto animate-card-in opacity-0 origin-top"
          >
            {categories.map(cat => {
              const isSelected = cat.id === selectedId
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onSelect(cat.id); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-[14px] text-left transition-colors ${
                    isSelected
                      ? 'bg-primary/[0.06] text-primary font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium'
                  }`}
                >
                  <span className="truncate">{name(cat)}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

/** Per-mode ambient decoration glyphs. Sits in the bottom-right of
 *  each mode card as a faded visual hint at what the mode does —
 *  inspired by Brilliant's decorative math symbols on course cards.
 *  Each is an SVG block positioned absolutely; pointer-events-none
 *  so they don't interfere with clicks. */
const MODE_DECOR: Record<StudyMode, React.ReactElement | null> = {
  chat: (
    // Speech bubble cluster — small dots inside a bubble shape
    <svg aria-hidden viewBox="0 0 80 60" className="pointer-events-none absolute bottom-2 right-2 w-16 h-12 text-sky-500/10 group-hover:text-sky-500/20 transition-colors">
      <path d="M5 20 Q5 5 20 5 L55 5 Q70 5 70 20 L70 30 Q70 45 55 45 L25 45 L15 55 L17 45 Q5 45 5 30 Z" fill="currentColor" />
      <circle cx="25" cy="25" r="3" fill="white" />
      <circle cx="37" cy="25" r="3" fill="white" />
      <circle cx="49" cy="25" r="3" fill="white" />
    </svg>
  ),
  practice: (
    // Stacked checklist lines with checkmarks
    <svg aria-hidden viewBox="0 0 80 60" className="pointer-events-none absolute bottom-2 right-2 w-16 h-12 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
      <rect x="5" y="10" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="20" y="12" width="50" height="6" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="5" y="25" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="20" y="27" width="40" height="6" rx="3" fill="currentColor" opacity="0.6" />
      <rect x="5" y="40" width="10" height="10" rx="2" fill="currentColor" />
      <rect x="20" y="42" width="45" height="6" rx="3" fill="currentColor" opacity="0.6" />
      <path d="M7 14 L9 16 L13 12" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M7 29 L9 31 L13 27" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  ),
  lesson: (
    // Open book — two pages with reading lines
    <svg aria-hidden viewBox="0 0 80 60" className="pointer-events-none absolute bottom-2 right-2 w-16 h-12 text-amber-500/10 group-hover:text-amber-500/20 transition-colors">
      <path d="M5 10 L5 50 L40 50 L40 12 Q22 6 5 10 Z" fill="currentColor" />
      <path d="M75 10 L75 50 L40 50 L40 12 Q58 6 75 10 Z" fill="currentColor" />
      <line x1="12" y1="22" x2="32" y2="22" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="12" y1="30" x2="32" y2="30" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="12" y1="38" x2="28" y2="38" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="48" y1="22" x2="68" y2="22" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="48" y1="30" x2="68" y2="30" stroke="white" strokeWidth="1.2" opacity="0.6" />
      <line x1="48" y1="38" x2="64" y2="38" stroke="white" strokeWidth="1.2" opacity="0.6" />
    </svg>
  ),
  flashcards: (
    // Stacked card edges showing depth
    <svg aria-hidden viewBox="0 0 80 60" className="pointer-events-none absolute bottom-2 right-2 w-16 h-12 text-violet-500/10 group-hover:text-violet-500/20 transition-colors">
      <rect x="20" y="15" width="50" height="35" rx="4" fill="currentColor" transform="rotate(8 45 32)" />
      <rect x="15" y="13" width="50" height="35" rx="4" fill="currentColor" transform="rotate(3 40 30)" />
      <rect x="10" y="10" width="50" height="35" rx="4" fill="currentColor" />
      <rect x="18" y="20" width="34" height="3" rx="1.5" fill="white" opacity="0.6" />
      <rect x="18" y="28" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  ),
  full_test: null,
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
