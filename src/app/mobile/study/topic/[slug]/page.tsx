"use client"

import React, { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStudyErrorToast, startFailedMessage } from '../../_shared/useStudyErrorToast'
import { ArrowLeft, ChevronDown, Loader2, FileText, ArrowRight, Sparkles, Check, Mic, Lock, GraduationCap, BookOpen, ClipboardList } from '@/app/mobile/study/_shared/icons'
import { StudyPageHeader, StudyScrollShell } from '../../_shared/primitives'
import { StudyButton, studyButtonClass } from '../../_shared/StudyButton'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { SkeletonBlock, SkeletonCard, SkeletonStickyHeader } from '../../skeletons'

import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import { StudySubscriptionGate } from '../../SubscriptionGate'
import { STUDY_MODES, type StudyMode } from '../../modes'
import { TestCustomizationSheet, type TestConfig } from '../../TestCustomizationSheet'
import { TestPrepDisclaimer } from '../../_shared/TestPrepDisclaimer'
import { TestPrepPathCard } from '../../_shared/TestPrepPathCard'
import { PredictedScore } from '../../_shared/PredictedScore'
import { RecommendedShelf } from '../../RecommendedShelf'
import { LandingDataProvider } from '../../LandingDataProvider'
import { defaultsForTestSection } from '@/lib/test-specs'
import type { TestFamily } from '@/lib/study-prompt-context'

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

// Slugs that have been hidden behind a "Coming soon" lock on the
// landing grid — must also block deep-link access here so users
// can't bypass the lock with a direct URL or back-button.
const LOCKED_TOPIC_SLUGS = new Set([
  'test-toefl', 'test-ksat', 'test-toeic', 'test-ielts', 'test-act', 'test-ap', 'test-gre',
])

export default function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  if (LOCKED_TOPIC_SLUGS.has(slug)) {
    // Mirror the landing-page lock UI rather than 404 — students
    // landing here from an old bookmark see "Coming soon" with a
    // way back to study, not a broken page.
    return <LockedTopicView />
  }
  return (
    <StudySubscriptionGate>
      <TopicInner slug={slug} />
    </StudySubscriptionGate>
  )
}

function LockedTopicView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-5 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
        <Lock className="w-6 h-6 text-gray-500" />
      </div>
      <div>
        <h1 className="text-[18px] font-semibold text-gray-900">Coming soon</h1>
        <p className="text-[13px] text-gray-500 mt-1.5 max-w-xs leading-relaxed">
          This test isn&apos;t available yet. Currently only the SAT is open.
        </p>
      </div>
      <Link
        href="/mobile/study"
        className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-white text-[13px] font-semibold shadow-[0_4px_12px_-2px_rgba(40,133,232,0.30)] active:scale-[0.97] transition-transform"
      >
        Back to study
      </Link>
    </div>
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
  // Test-prep layout tab: premade mock tests vs learning modes.
  const [tab, setTab] = useState<'tests' | 'practice'>('tests')
  const [bankBusy, setBankBusy] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [testSheetOpen, setTestSheetOpen] = useState(false)
  const [testDefaults, setTestDefaults] = useState<{ count: number; minutes: number }>({
    count: 20, minutes: 30,
  })
  const [progress, setProgress] = useState<{ mastery: number | null; sessions: number; lastActive: string | null }>({
    mastery: null, sessions: 0, lastActive: null,
  })
  const [testLanguage, setTestLanguage] = useState<'en' | 'ko'>('en')

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
      // Hide subtopics that aren't ready for users yet. Currently
      // sat-essay — the Digital SAT discontinued the essay in March
      // 2023 so there's no active demand, and we haven't built the
      // rhetorical-analysis rubric / prompts. Keeping the row in the
      // DB so it's easy to re-enable later, just filtering it out of
      // the category picker.
      const HIDDEN_SUBTOPIC_SLUGS = new Set(['sat-essay'])
      const kids = ((childRows ?? []) as Topic[])
        .filter(c => !HIDDEN_SUBTOPIC_SLUGS.has(c.slug))
      setParent(parentRow ?? null)
      setChildren(kids)
      // Default-select the first child so the mode picker has a real
      // target on first paint (no "you haven't chosen a category" state).
      if (kids.length > 0) setSelectedChildId(kids[0].id)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [slug])

  // Per-topic progress: mastery score + session count + last activity.
  // Refetches whenever effectiveTopic changes (category picker moves).
  useEffect(() => {
    if (!user?.userId || !effectiveTopic) return
    let cancelled = false
    void (async () => {
      const [{ data: mastery }, { data: sessions }] = await Promise.all([
        supabase
          .from('study_mastery')
          .select('score')
          .eq('student_id', user.userId)
          .eq('topic_id', effectiveTopic.id)
          .maybeSingle(),
        supabase
          .from('study_sessions')
          .select('last_active_at', { count: 'exact' })
          .eq('student_id', user.userId)
          .eq('topic_id', effectiveTopic.id)
          .order('last_active_at', { ascending: false })
          .limit(1),
      ])
      if (cancelled) return
      const sessionCount = (sessions as { last_active_at: string }[] | null)?.length ?? 0
      const lastRow = (sessions as { last_active_at: string }[] | null)?.[0] ?? null
      setProgress({
        mastery: (mastery?.score as number | undefined) ?? null,
        sessions: sessionCount,
        lastActive: lastRow?.last_active_at ?? null,
      })
    })()
    return () => { cancelled = true }
  }, [user?.userId, effectiveTopic])

  const startSession = async (mode: StudyMode, config?: TestConfig, overrideLanguage?: 'en' | 'ko') => {
    const target = effectiveTopic
    if (!target || !user?.userId) return
    // PREMADE-FIRST: SAT full tests are assembled instantly from the
    // verified item bank, never AI-generated. Live generation is
    // reserved for the free-form "type anything" creator.
    if (mode === 'full_test' && parseTestSlug(target.slug).family === 'sat') {
      void startBankTest()
      return
    }
    setCreating(mode)
    // Full-test sessions lock language to the test's native language
    // (KSAT → ko, everything else → en) via overrideLanguage. Other
    // modes default to the UI language at session-start time.
    const sessionLanguage = overrideLanguage ?? (ko ? 'ko' : 'en')
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: target.id,
        mode,
        language: sessionLanguage,
        config: config ?? {},
        // TOEFL Speaking grade mode toggle. 'text' is the default set
        // by the DB column; only insert 'audio' when explicitly picked.
        speaking_grade_mode: config?.speakingGradeMode === 'audio' ? 'audio' : 'text',
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreating(null)
      showError(startFailedMessage(ko))
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  // Instant bank-assembled practice (SAT). No AI wait, no credit —
  // the assemble route builds a domain-balanced test from the verified
  // item bank and returns a ready session to route into.
  const startBankTest = async () => {
    const target = effectiveTopic
    if (!target || bankBusy) return
    const { family, section } = parseTestSlug(target.slug)
    if (family !== 'sat') return
    const bankSection = section && /math/i.test(section) ? 'math' : 'reading_writing'
    setBankBusy(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/assemble', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        // Two-module adaptive: assemble draws Module 1 only; Module 2 is
        // routed + drawn after the student finishes Module 1.
        body: JSON.stringify({ section: bankSection, adaptive: true }),
      })
      if (res.status === 402) { setBankBusy(false); router.push('/mobile/study/subscription'); return }
      if (!res.ok) { setBankBusy(false); showError(startFailedMessage(ko)); return }
      const json = await res.json()
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setBankBusy(false)
      showError(startFailedMessage(ko))
    }
  }

  // Open the customization sheet for a full test. Loads the spec
  // defaults (question count + time) for the effective topic so the
  // sheet can show them as the starting values.
  const openTestSheet = () => {
    const target = effectiveTopic
    if (!target) return
    // Derive family + section directly from the slug — pure client
    // code, no DB / supabase-admin call. Topic slugs follow the
    // convention "<family>-<section>" (e.g., toefl-reading, sat-math)
    // for leaves; the parent test root is "test-<family>".
    const { family, section } = parseTestSlug(target.slug)
    const { count, minutes } = defaultsForTestSection(family, section)
    setTestDefaults({ count, minutes })
    // Language is locked to the test's native language: KSAT in
    // Korean (passages, prompts, answers all 한국어), all other
    // standardized tests in English.
    setTestLanguage(family === 'ksat' ? 'ko' : 'en')
    setTestSheetOpen(true)
  }

  if (loading) {
    // Mirror the loaded shell so nothing shifts when data arrives:
    // sticky header → path card → section dropdown → progress mini-card
    // → tab bar → featured full-test card.
    return (
      <StudyScrollShell header={<SkeletonStickyHeader />}>
        {/* Path card */}
        <SkeletonBlock className="h-[92px] w-full rounded-2xl" />
        {/* Choose a section — label + dropdown */}
        <div className="space-y-2">
          <SkeletonBlock className="h-2.5 w-24 rounded-full" />
          <SkeletonBlock className="h-12 w-full rounded-2xl" />
        </div>
        {/* Progress mini-card */}
        <SkeletonCard className="h-[72px]" />
        {/* Tab bar */}
        <SkeletonBlock className="h-10 w-full rounded-lg" />
        {/* Featured full-test card */}
        <SkeletonCard className="min-h-[120px]" />
      </StudyScrollShell>
    )
  }

  if (!topic) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500 space-y-3">
        <p>{t('study.topic.notFound')}</p>
        <Link
          href="/mobile/study"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {String(t('study.topic.backToStudy'))}
        </Link>
      </div>
    )
  }

  const name = (n: { name_en: string; name_ko: string }) => ko ? n.name_ko : n.name_en

  // The 2x2 learning-mode grid — shared by the subject layout and the
  // test-prep "Practice" tab.
  const modeGrid = (
    <section className="grid grid-cols-2 gap-3">
      {STUDY_MODES
        .filter(m => m.key !== 'full_test')
        .filter(m => m.key !== 'response')
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
  )

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={topic.category === 'test_prep' ? FileText : GraduationCap}
          iconColorClass={topic.category === 'test_prep' ? 'text-rose-600 bg-rose-50' : 'text-primary bg-primary/10'}
          eyebrow={parent ? name(parent) : (topic.category === 'test_prep' ? String(t('study.landing.testPrepTitle')) : String(t('study.landing.browseTitle')))}
          title={name(topic)}
          subtitle={String(t('study.topic.pickMode'))}
        />
      }
    >
      {errorToast}
        {/* Mascot-led path entry — only for test-prep topics that have a
            hand-crafted path (SAT / TOEFL). Self-gates on whether this
            test is already the student's goal: continue-path card if so,
            "make this your goal?" card if not. */}
        {topic.category === 'test_prep' && parseTestSlug(topic.slug).family && (
          <TestPrepPathCard test={parseTestSlug(topic.slug).family as string} />
        )}
        {/* Diagnostic + "recommended for you" — moved here from the home
            so a student prepping for a specific test finds the baseline
            diagnostic (PredictedScore cold-start) and their weak-area
            picks together. Both self-hide when not applicable. */}
        {topic.category === 'test_prep' && (
          // RecommendedShelf reads subscription + target from LandingData;
          // that provider is only mounted on the home, so wrap it here or
          // the shelf's paid-gate self-hides everywhere else.
          <LandingDataProvider>
            <PredictedScore />
            {/* hideUpsell: the diagnostic card above is already the
                premium pitch (and promises weak-area targeted practice),
                so a second "unlock personalized picks" paywall here just
                repeats it. Free users see one pitch; paid users still get
                real recommended cards. */}
            <RecommendedShelf hideUpsell />
          </LandingDataProvider>
        )}

        {/* Category picker — only when the topic has children.
            AP → AP Biology / AP Calc AB, KSAT → 국어 / 수학 / 영어, etc.
            The student picks a category first, then the mode picker
            below targets that specific category. For leaves (sat-math,
            ksat-korean) this section doesn't render and the mode
            picker targets the leaf itself. */}
        {children.length > 0 && (
          <CategoryPicker
            label={String(t(topic.category === 'test_prep' ? 'study.topic.sectionPickerLabel' : 'study.topic.categoryPickerLabel'))}
            items={children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
            name={name}
          />
        )}

        {/* Per-topic progress mini-card — sits directly under the section
            dropdown so mastery/sessions/last read as stats for the chosen
            section. Only when the student has done a session here. */}
        {progress.sessions > 0 && (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4 flex items-center gap-4">
            <div className="flex-1 grid grid-cols-3 gap-3">
              {/* Neutral number — a red "37/100" read as an error state
                  the moment the page opened. Progress context shouldn't
                  scold; score screens carry the semantic colors. */}
              <MiniStat
                label={ko ? '숙련도' : 'Mastery'}
                value={progress.mastery !== null ? `${progress.mastery}` : '—'}
                suffix={progress.mastery !== null ? '/100' : undefined}
                accent="gray"
              />
              <MiniStat
                label={ko ? '세션' : 'Sessions'}
                value={String(progress.sessions)}
                accent="primary"
              />
              <MiniStat
                label={ko ? '최근' : 'Last'}
                value={progress.lastActive ? formatShortTimeAgo(progress.lastActive, ko) : '—'}
                accent="gray"
              />
            </div>
          </div>
        )}

        {/* Mode picker.
            - Test-prep topics split into two tabs: "Full tests" (the
              marquee premade mock test + the student's recent results)
              and "Practice" (the four learning modes + today's
              challenge). Keeps test-taking and question drilling from
              competing on one scroll.
            - Subject topics omit Full test entirely — taking a "mock
              test" on Algebra is awkward; practice + lesson fit better.
         */}
        {topic.category === 'test_prep' ? (
          <>
            <div
              role="tablist"
              aria-label={ko ? '모드 탭' : 'Mode tabs'}
              className="bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center rounded-lg p-[3px]"
            >
              {([
                { key: 'tests' as const, label: ko ? '모의고사' : 'Full tests' },
                { key: 'practice' as const, label: ko ? '문제 연습' : 'Practice' },
              ]).map(tabDef => (
                <button
                  key={tabDef.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === tabDef.key}
                  onClick={() => setTab(tabDef.key)}
                  className={`inline-flex h-full flex-1 items-center justify-center rounded-md px-2 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] ${
                    tab === tabDef.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tabDef.label}
                </button>
              ))}
            </div>

            {tab === 'tests' ? (
              <>
                <FeaturedFullTestCard
                  // SAT tests are premade (instant bank assembly) and have no
                  // customizable options, so skip the customization sheet.
                  startSession={() => {
                    if (effectiveTopic && parseTestSlug(effectiveTopic.slug).family === 'sat') {
                      void startBankTest()
                    } else {
                      openTestSheet()
                    }
                  }}
                  creating={bankBusy ? 'full_test' : creating}
                  t={t}
                />
                <RecentTestsList
                  topicIds={[topic.id, ...children.map(c => c.id)]}
                  studentId={user?.userId ?? null}
                  ko={ko}
                />
              </>
            ) : (
              <>
                {isResponseEligible(effectiveTopic?.slug) && (
                  <FeaturedResponseCard
                    startSession={() => startSession('response')}
                    creating={creating}
                    t={t}
                  />
                )}
                {/* Practice & flashcards each offer both paths: start a
                    fresh session, or browse what already exists in the
                    bank (the Library, deep-linked to this section + mode).
                    Replaces the old single "browse the bank" card. */}
                <div className="space-y-3">
                  {STUDY_MODES.filter(m => m.key === 'practice' || m.key === 'flashcards').map(mode => {
                    const Icon = mode.icon
                    const librarySection = parseTestSlug(effectiveTopic?.slug ?? topic.slug).section === 'math' ? 'math' : 'reading_writing'
                    const isSat = parseTestSlug(effectiveTopic?.slug ?? topic.slug).family === 'sat'
                    return (
                      <div key={mode.key} className="rounded-2xl bg-white ring-1 ring-gray-200/70 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center gap-3">
                          <span className={`flex-shrink-0 w-11 h-11 rounded-2xl ${mode.iconBg} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_8px_rgba(0,0,0,0.10)]`}>
                            <Icon className="w-5 h-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-semibold text-gray-900">{t(`study.modes.${mode.key}.title`)}</div>
                            <div className="text-[12.5px] text-gray-500 leading-snug">{t(`study.modes.${mode.key}.body`)}</div>
                          </div>
                        </div>
                        <div className={`mt-3 grid gap-2 ${isSat ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          <StudyButton
                            type="button"
                            size="sm"
                            onClick={() => startSession(mode.key)}
                            disabled={creating !== null}
                            loading={creating === mode.key}
                            leftIcon={<Sparkles className="w-4 h-4" />}
                          >
                            {ko ? '새로 시작' : 'Start new'}
                          </StudyButton>
                          {/* Bank browsing is SAT-only for now. */}
                          {isSat && (
                            <Link
                              href={`/mobile/study/library?section=${librarySection}&tab=${mode.key}`}
                              className={studyButtonClass({ variant: 'secondary', size: 'sm' })}
                            >
                              <BookOpen className="w-4 h-4" />{ko ? '기존 보기' : 'Browse existing'}
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {isResponseEligible(effectiveTopic?.slug) && (
              <FeaturedResponseCard
                startSession={() => startSession('response')}
                creating={creating}
                t={t}
              />
            )}
            {modeGrid}
          </>
        )}

      {/* Legal: AI-generated / not-affiliated disclaimer + ⓘ trademark
          notice — this is the surface where mock tests are launched. */}
      {topic.category === 'test_prep' && <TestPrepDisclaimer ko={language === 'korean'} />}

      {/* Pre-test customization sheet — opens when student taps Full
          Test. Saves their choices to session.config which the test
          generator reads to override the spec defaults. */}
      <TestCustomizationSheet
        open={testSheetOpen}
        defaults={testDefaults}
        topicId={effectiveTopic?.id ?? null}
        family={effectiveTopic ? parseTestSlug(effectiveTopic.slug).family : null}
        section={effectiveTopic ? parseTestSlug(effectiveTopic.slug).section : null}
        onClose={() => setTestSheetOpen(false)}
        onStart={(config) => { setTestSheetOpen(false); void startSession('full_test', config, testLanguage) }}
      />
    </StudyScrollShell>
  )
}

/** Pure-client slug → (family, section) parser. The DB topic catalog
 *  uses "test-<family>" for the test root (e.g., test-toefl) and
 *  "<family>-<section>" for leaves (e.g., toefl-reading, sat-math).
 *  Section name returned in English to match TEST_SPECS' name_en. */
function parseTestSlug(slug: string): { family: TestFamily | null; section: string | null } {
  const FAMILIES: TestFamily[] = ['ksat', 'sat', 'toefl', 'toeic', 'ielts', 'act', 'ap', 'gre']
  // Parent: test-<family> → all sections; defaultsForTestSection returns sections[0].
  const rootMatch = slug.match(/^test-(.+)$/)
  if (rootMatch) {
    const f = rootMatch[1] as TestFamily
    return { family: FAMILIES.includes(f) ? f : null, section: null }
  }
  // Leaf: <family>-<section-slug> — capitalize the section slug to match
  // TEST_SPECS section name_en (e.g. "reading" → "Reading").
  for (const f of FAMILIES) {
    if (slug.startsWith(`${f}-`)) {
      const sectionSlug = slug.slice(f.length + 1)
      // KSAT uses Korean sections; for others, title-case the slug.
      const section = sectionSlug
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
      return { family: f, section }
    }
  }
  return { family: null, section: null }
}

/** Response (AI Speaking + Writing grader) is only meaningful on
 *  TOEFL/IELTS speaking + writing leaf topics. Other test_prep and
 *  subject topics don't have a rubric to grade against, so the mode
 *  is hidden. KSAT 영어 서답형 will be added in v2. */
const RESPONSE_ELIGIBLE_SLUGS = new Set([
  'toefl-speaking', 'toefl-writing',
  'ielts-speaking', 'ielts-writing',
])
function isResponseEligible(slug: string | undefined): boolean {
  return !!slug && RESPONSE_ELIGIBLE_SLUGS.has(slug)
}

/** Category picker shown above the mode grid when a topic has
 *  children. Custom dropdown — opens a popover panel listing all
 *  options with the current one checkmarked. Better than a horizontal
 *  chip row when the option count is large (AP has 9, KSAT has 6),
 *  and gives more affordance for the "this is a selector" intent.
 *  Apple-style: subtle bg, chevron, soft shadow when open. */
function CategoryPicker({
  label,
  items: categories,
  selectedId,
  onSelect,
  name,
}: {
  label: string
  items: Topic[]
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
  response: null,
}

/**
 * Full-width feature card for the Full Test mode on test-prep topic
 * pages. Lifted out of the inline render so the JSX above stays
 * readable; ranks the test mode visually above the four learning
 * modes since it's the marquee surface for SAT/TOEFL/KSAT/etc.
 */
function FeaturedResponseCard({
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
      onClick={() => startSession('response')}
      disabled={creating !== null}
      className="group relative w-full rounded-2xl p-5 ring-1 ring-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-blue-50/30 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(99,102,241,0.18)] hover:ring-indigo-300/70 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(99,102,241,0.26)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait overflow-hidden"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center ring-1 ring-indigo-200/50 shadow-[0_1px_2px_rgba(99,102,241,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] flex-shrink-0">
          {creating === 'response'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Mic className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[17px] font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors tracking-tight">
              {String(t('study.modes.response.title'))}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.10em] text-indigo-700 bg-white/90 backdrop-blur ring-1 ring-indigo-200/80 rounded-full px-2 py-0.5 shadow-[0_1px_2px_rgba(99,102,241,0.06)]">
              <Sparkles className="w-2.5 h-2.5" />Beta
            </span>
          </div>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t('study.modes.response.body'))}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-indigo-400/70 group-hover:text-indigo-500 group-hover:translate-x-0.5 mt-1.5 flex-shrink-0 transition-all" />
      </div>
    </button>
  )
}

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
      // Primary blue, not rose: this is the tab's go-action, and the
      // color system reserves blue for exactly that.
      className="group relative w-full rounded-2xl p-5 ring-1 ring-primary/20 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(40,133,232,0.20)] hover:ring-primary/35 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(40,133,232,0.28)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait overflow-hidden"
    >
      {/* Subtle inner highlight on top edge for premium depth */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white text-primary flex items-center justify-center ring-1 ring-primary/20 shadow-[0_1px_2px_rgba(40,133,232,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] flex-shrink-0">
          {creating === 'full_test'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[17px] font-semibold text-gray-900 group-hover:text-primary transition-colors tracking-tight">
              {String(t('study.modes.full_test.title'))}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary bg-white/90 backdrop-blur ring-1 ring-primary/25 rounded-full px-2 py-0.5 shadow-[0_1px_2px_rgba(40,133,232,0.06)]">
              <Sparkles className="w-2.5 h-2.5" />
              {String(t('study.topic.testPrepBadge'))}
            </span>
          </div>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t('study.modes.full_test.body'))}
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 mt-1.5 flex-shrink-0 transition-all" />
      </div>
    </button>
  )
}

function MiniStat({ label, value, suffix, accent }: {
  label: string
  value: string
  suffix?: string
  accent: 'primary' | 'emerald' | 'amber' | 'rose' | 'gray'
}) {
  const valueClass =
    accent === 'primary' ? 'text-primary' :
    accent === 'emerald' ? 'text-emerald-600' :
    accent === 'amber' ? 'text-amber-600' :
    accent === 'rose' ? 'text-rose-600' :
    'text-gray-700'
  return (
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500">
        {label}
      </div>
      <div className={`mt-0.5 text-[15px] font-bold tabular-nums leading-tight ${valueClass}`}>
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-medium text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

function formatShortTimeAgo(iso: string, ko: boolean): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (day >= 7) return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
  if (day >= 1) return ko ? `${day}일 전` : `${day}d`
  if (hr >= 1) return ko ? `${hr}시간 전` : `${hr}h`
  if (min >= 1) return ko ? `${min}분 전` : `${min}m`
  return ko ? '방금' : 'now'
}

/** Recent completed mock tests for this test family — score + date,
 *  linking into the session summary. Renders nothing until the student
 *  has at least one completed test. */
function RecentTestsList({ topicIds, studentId, ko }: {
  topicIds: string[]
  studentId: string | null
  ko: boolean
}) {
  const [rows, setRows] = useState<Array<{
    id: string
    title: string | null
    score: number | null
    completed_at: string | null
  }>>([])

  useEffect(() => {
    if (!studentId || topicIds.length === 0) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select('id, title, score, completed_at')
        .eq('student_id', studentId)
        .eq('mode', 'full_test')
        .eq('status', 'completed')
        .eq('archived', false)
        .in('topic_id', topicIds)
        .order('completed_at', { ascending: false })
        .limit(5)
      if (!cancelled) setRows((data ?? []) as typeof rows)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, topicIds.join(',')])

  // Always render the header + "View all" link so the student can reach
  // their full mock-test history even before finishing a test on this
  // section (the list itself only shows COMPLETED tests). When empty,
  // the whole section becomes a single tappable "see your history" card.
  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600">
          {ko ? '내 모의고사' : 'My mock tests'}
        </h2>
        <Link href="/mobile/study/tests" className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-600 hover:text-primary transition-colors">
          {ko ? '전체 보기' : 'View all'}<ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <Link
          href="/mobile/study/tests"
          className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-4 py-4 hover:ring-primary/30 active:scale-[0.99] transition"
        >
          <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
            <ClipboardList className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-medium text-gray-800">{ko ? '지난 모의고사 보기' : 'See your past mock tests'}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{ko ? '완료·진행 중인 시험을 모두 확인하세요' : 'Completed and in-progress tests, all in one place'}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </Link>
      ) : (
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] divide-y divide-gray-100 overflow-hidden">
        {rows.map(row => {
          const score = row.score !== null ? Math.round(Number(row.score)) : null
          return (
            <Link
              key={row.id}
              href={`/mobile/study/session/${row.id}/summary`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className={`flex-shrink-0 inline-flex items-center justify-center w-11 h-8 rounded-xl text-[13px] font-bold tabular-nums ring-1 ${
                score === null ? 'bg-gray-50 ring-gray-200/70 text-gray-500'
                : score >= 80 ? 'bg-emerald-50 ring-emerald-100 text-emerald-700'
                : score >= 50 ? 'bg-amber-50 ring-amber-100 text-amber-700'
                : 'bg-rose-50 ring-rose-100 text-rose-700'
              }`}>
                {score !== null ? `${score}%` : '—'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-gray-900 truncate">
                  {row.title ?? (ko ? '모의고사' : 'Full test')}
                </div>
                <div className="text-[11.5px] text-gray-500 mt-0.5">
                  {row.completed_at ? new Date(row.completed_at).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }) : ''}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
      )}
    </section>
  )
}
