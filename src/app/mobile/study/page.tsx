"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon, ArrowRight,
  FileText, CreditCard, Settings, Camera, Sparkles,
  Calculator, Languages, Atom, Globe2, BookOpen, Palette, Code2, Music,
  PenLine, ClipboardCheck, Briefcase, Flag, Scroll, BookMarked, GraduationCap, LucideIcon,
  MoreHorizontal, Lock, Target as TargetIcon,
  Gift, X, Check, Loader2,
} from '@/app/mobile/study/_shared/icons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from './SubscriptionGate'
import { StudyButton } from './_shared/StudyButton'
import { StudyTodayCard } from './_shared/primitives'
import { RecommendedShelf } from './RecommendedShelf'
import { ResumableShelf } from './ResumableShelf'
import { MistakeBankShelf } from './MistakeBankShelf'
import { GeneratingTestsChip } from './GeneratingTestsChip'
import { StudyHero } from './StudyHero'
import { WeeklyQuests } from './_shared/WeeklyQuests'
import { WeekPlanCard } from './_shared/WeekPlanCard'
import { ResumeBanner } from './ResumeBanner'
import { DailyReviewCTA } from './DailyReviewCTA'
import { StreakAtRiskBanner } from './_shared/StreakAtRiskBanner'
import { DailyChallengeCard } from './_shared/DailyChallengeCard'
import { SearchSheet } from './_shared/SearchSheet'
import { useStudyErrorToast, startFailedMessage } from './_shared/useStudyErrorToast'
import { OnboardingWizard } from './OnboardingWizard'
import { useOnboardingGate } from './useOnboardingGate'
import { LandingDataProvider, useLandingData } from './LandingDataProvider'
import { SocialPresenceCard } from './SocialPresenceCard'
import { SkeletonTestGrid, SkeletonBlock, SkeletonCard } from './skeletons'
import { track } from '@/lib/study/track-client'
import { authHeaders } from '@/lib/auth-headers'
import { captureReferralFromUrl, readPendingReferral, clearPendingReferral } from '@/lib/study/pending-referral'

/**
 * /mobile/study — study landing.
 *
 * Two-category browse: Subjects (the original curated tree) and
 * Test Prep (TOEFL / SAT / TOEIC / IELTS / KSAT / etc.). Each
 * category renders as its own expandable list.
 *
 * Recommended-for-you shelf is a Phase 3 hookup; Phase 2 still ships
 * the placeholder.
 *
 * Free-form input at the bottom creates a session with a
 * topic_freeform value when the student doesn't see what they want.
 */

interface Topic {
  id: string
  slug: string
  name_en: string
  name_ko: string
  level: number
  parent_id: string | null
  category: 'subject' | 'test_prep'
}

interface BrowseItem {
  id: string
  slug: string
  name_en: string
  name_ko: string
  branches: Topic[]
}

/** Per-subject visual identity — icon + gradient + accent. Keyed by
 *  slug fragment so unknown subjects fall through to a neutral theme. */
interface Theme {
  Icon: LucideIcon
  /** Tailwind class for the icon tile background gradient. */
  iconBg: string
  /** Tailwind class for the icon color. */
  iconText: string
  /** Subtle card background gradient — sits behind everything. */
  cardBg: string
  /** Accent ring/border color when card is in interactive state. */
  ring: string
  /** Text color for hover state. */
  hoverText: string
  /** Shadow color/glow for hover. */
  hoverShadow: string
}

const NEUTRAL_THEME: Theme = {
  Icon: BookOpen,
  iconBg: 'bg-gradient-to-br from-slate-50 to-slate-100',
  iconText: 'text-slate-600',
  cardBg: 'bg-white',
  ring: 'ring-gray-200/70',
  hoverText: 'group-hover:text-primary',
  hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.14),0_12px_28px_-12px_rgba(40,133,232,0.18)]',
}

const SUBJECT_THEMES: Record<string, Theme> = {
  math: {
    Icon: Calculator,
    iconBg: 'bg-gradient-to-br from-sky-400 to-blue-600',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-sky-50/40 via-white to-white',
    ring: 'ring-sky-100',
    hoverText: 'group-hover:text-sky-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(14,165,233,0.18),0_16px_32px_-12px_rgba(14,165,233,0.22)]',
  },
  english: {
    Icon: Languages,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-amber-50/40 via-white to-white',
    ring: 'ring-amber-100',
    hoverText: 'group-hover:text-amber-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(245,158,11,0.18),0_16px_32px_-12px_rgba(245,158,11,0.22)]',
  },
  korean: {
    Icon: BookMarked,
    iconBg: 'bg-gradient-to-br from-rose-400 to-pink-600',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-rose-50/40 via-white to-white',
    ring: 'ring-rose-100',
    hoverText: 'group-hover:text-rose-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(244,63,94,0.18),0_16px_32px_-12px_rgba(244,63,94,0.22)]',
  },
  science: {
    Icon: Atom,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-600',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-emerald-50/40 via-white to-white',
    ring: 'ring-emerald-100',
    hoverText: 'group-hover:text-emerald-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(16,185,129,0.18),0_16px_32px_-12px_rgba(16,185,129,0.22)]',
  },
  social: {
    Icon: Globe2,
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-600',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-violet-50/40 via-white to-white',
    ring: 'ring-violet-100',
    hoverText: 'group-hover:text-violet-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(139,92,246,0.18),0_16px_32px_-12px_rgba(139,92,246,0.22)]',
  },
  art: {
    Icon: Palette,
    iconBg: 'bg-gradient-to-br from-fuchsia-400 to-pink-500',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-fuchsia-50/40 via-white to-white',
    ring: 'ring-fuchsia-100',
    hoverText: 'group-hover:text-fuchsia-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(217,70,239,0.18),0_16px_32px_-12px_rgba(217,70,239,0.22)]',
  },
  music: {
    Icon: Music,
    iconBg: 'bg-gradient-to-br from-indigo-400 to-blue-500',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-indigo-50/40 via-white to-white',
    ring: 'ring-indigo-100',
    hoverText: 'group-hover:text-indigo-700',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(99,102,241,0.18),0_16px_32px_-12px_rgba(99,102,241,0.22)]',
  },
  cs: {
    Icon: Code2,
    iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900',
    iconText: 'text-white',
    cardBg: 'bg-gradient-to-br from-slate-50/40 via-white to-white',
    ring: 'ring-slate-200',
    hoverText: 'group-hover:text-slate-900',
    hoverShadow: 'hover:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.14),0_16px_32px_-12px_rgba(15,23,42,0.20)]',
  },
}

function themeForSubject(slug: string, name: string): Theme {
  const key = slug.toLowerCase()
  const nameKey = name.toLowerCase()
  if (key.includes('math') || nameKey.includes('수학') || nameKey.includes('산수')) return SUBJECT_THEMES.math
  if (key.includes('english') || nameKey.includes('영어')) return SUBJECT_THEMES.english
  if (key.includes('korean') || nameKey.includes('국어') || nameKey.includes('한국어')) return SUBJECT_THEMES.korean
  if (key.includes('science') || nameKey.includes('과학')) return SUBJECT_THEMES.science
  if (key.includes('social') || nameKey.includes('사회') || key.includes('history') || nameKey.includes('역사')) return SUBJECT_THEMES.social
  if (key.includes('art') || nameKey.includes('미술') || nameKey.includes('예술')) return SUBJECT_THEMES.art
  if (key.includes('music') || nameKey.includes('음악')) return SUBJECT_THEMES.music
  if (key.includes('computer') || key.includes('coding') || nameKey.includes('컴퓨터') || nameKey.includes('코딩')) return SUBJECT_THEMES.cs
  return NEUTRAL_THEME
}

/** Per-test visual identity. Keyed by the slug fragment after "test-".
 *  Each test gets:
 *   - a semantic small icon (pen for writing-heavy, globe for international,
 *     briefcase for workplace, etc.) — not a generic award/trophy
 *   - a brand-aligned gradient
 *   - a faded watermark monogram (SAT/수능/TOEFL/…) in the background
 *   - decorative ASCII chars that hint at content (math symbols for
 *     quant tests, language glyphs for English tests) — Brilliant-app
 *     style background texture
 *   - a stat chip ("44 Q · 70 min") so the card carries useful info
 *     not just brand identity */
const TEST_THEMES: Record<string, {
  Icon: LucideIcon
  gradient: string
  accent: string
  ring: string
  mono: string
  /** Decorative background characters (math symbols, language glyphs)
   *  arranged absolutely for Brilliant-style texture. */
  decorChars: string[]
  /** Compact structural stat shown as a chip — bilingual. */
  stat_en: string
  stat_ko: string
}> = {
  sat: {
    Icon: PenLine,
    gradient: 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800',
    accent: 'text-blue-50',
    ring: 'ring-blue-900/20',
    mono: 'SAT',
    decorChars: ['x²', '∑', '∫'],
    stat_en: '98 Q · 2h 14m',
    stat_ko: '98문항 · 2시간 14분',
  },
  ksat: {
    Icon: Flag,
    gradient: 'bg-gradient-to-br from-rose-500 via-rose-600 to-red-700',
    accent: 'text-rose-50',
    ring: 'ring-rose-900/20',
    mono: '수능',
    decorChars: ['국', '수', '영'],
    stat_en: '6 sections',
    stat_ko: '6 영역',
  },
  toefl: {
    Icon: Globe2,
    gradient: 'bg-gradient-to-br from-teal-500 via-emerald-600 to-emerald-700',
    accent: 'text-teal-50',
    ring: 'ring-emerald-900/20',
    mono: 'TOEFL',
    decorChars: ['A', 'a', '‹›'],
    stat_en: '4 sections · 2h',
    stat_ko: '4영역 · 2시간',
  },
  toeic: {
    Icon: Briefcase,
    gradient: 'bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700',
    accent: 'text-sky-50',
    ring: 'ring-sky-900/20',
    mono: 'TOEIC',
    decorChars: ['$', '@', '✉'],
    stat_en: '200 Q · 2h',
    stat_ko: '200문항 · 2시간',
  },
  ielts: {
    Icon: Languages,
    gradient: 'bg-gradient-to-br from-violet-500 via-purple-600 to-purple-800',
    accent: 'text-violet-50',
    ring: 'ring-purple-900/20',
    mono: 'IELTS',
    decorChars: ['ℹ', '?', '✓'],
    stat_en: '4 sections · 2h 45m',
    stat_ko: '4영역 · 2시간 45분',
  },
  act: {
    Icon: ClipboardCheck,
    gradient: 'bg-gradient-to-br from-orange-500 via-red-500 to-red-700',
    accent: 'text-orange-50',
    ring: 'ring-red-900/20',
    mono: 'ACT',
    decorChars: ['ⓐ', 'ⓑ', 'ⓒ'],
    stat_en: '5 sections · 3h',
    stat_ko: '5영역 · 3시간',
  },
  ap: {
    Icon: GraduationCap,
    gradient: 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-800',
    accent: 'text-emerald-50',
    ring: 'ring-emerald-900/20',
    mono: 'AP',
    decorChars: ['5', '4', '3'],
    stat_en: '9+ subjects',
    stat_ko: '9+ 과목',
  },
  gre: {
    Icon: Scroll,
    gradient: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-800',
    accent: 'text-indigo-50',
    ring: 'ring-indigo-900/20',
    mono: 'GRE',
    decorChars: ['Σ', 'π', '½'],
    stat_en: '3 sections · 1h 58m',
    stat_ko: '3영역 · 1시간 58분',
  },
}

function themeForTest(slug: string): typeof TEST_THEMES[keyof typeof TEST_THEMES] {
  const key = slug.replace(/^test-/, '').toLowerCase()
  return TEST_THEMES[key] ?? {
    Icon: FileText,
    gradient: 'bg-gradient-to-br from-slate-500 via-slate-600 to-slate-800',
    accent: 'text-slate-50',
    ring: 'ring-slate-900/20',
    mono: key.toUpperCase().slice(0, 4),
    decorChars: ['?', '?'],
    stat_en: '',
    stat_ko: '',
  }
}

export default function StudyLandingPage() {
  return (
    <StudySubscriptionGate>
      <LandingDataProvider>
        <StudyLandingInner />
      </LandingDataProvider>
    </StudySubscriptionGate>
  )
}

function StudyLandingInner() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [tests, setTests] = useState<BrowseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [freeFormQuery, setFreeFormQuery] = useState('')
  const [creatingFreeForm, setCreatingFreeForm] = useState(false)
  const [freeFormCount, setFreeFormCount] = useState(5)
  const [freeFormDifficulty, setFreeFormDifficulty] =
    useState<'warmup' | 'balanced' | 'challenge'>('balanced')
  const [freeFormLanguage, setFreeFormLanguage] = useState<'auto' | 'en' | 'ko'>('auto')
  const { errorToast, showError } = useStudyErrorToast()
  const [searchOpen, setSearchOpen] = useState(false)
  const { needsOnboarding, markComplete } = useOnboardingGate()
  const landingData = useLandingData()
  const targetTest = landingData?.prefs?.target_test ?? null

  // Invite-link capture: a friend arriving via /mobile/study?ref=CODE has
  // the code stashed + stripped from the URL here, then surfaced as a
  // one-tap claim banner below. Persisted so it survives auth/onboarding.
  const [pendingRef, setPendingRef] = useState<string | null>(null)
  useEffect(() => {
    captureReferralFromUrl()
    setPendingRef(readPendingReferral())
  }, [])

  const loadTopics = useCallback(async () => {
    const { data } = await supabase
      .from('study_topics')
      .select('id, slug, name_en, name_ko, level, parent_id, category')
      .in('level', [0, 1])
      .order('sort_order', { ascending: true })

    const rows = (data ?? []) as Topic[]

    // Test prep: skip the level-0 'test-prep' wrapper. Each level-1
    // test (TOEFL, SAT, ...) becomes a top-level card whose branches
    // load lazily on the dedicated topic page. We surface them as
    // a flat list (no expand) so the most-needed test is one tap away.
    const testTops = rows.filter(r => r.level === 1 && r.category === 'test_prep')

    const testItems: BrowseItem[] = testTops.map(t => ({
      id: t.id,
      slug: t.slug,
      name_en: t.name_en,
      name_ko: t.name_ko,
      branches: [],
    }))

    setTests(testItems)
    setLoading(false)
  }, [])

  useEffect(() => { void loadTopics() }, [loadTopics])

  // Native pull-to-refresh: the shared app layout fires this event on a
  // mobile pull-down. Reload the topic grid + the bundled landing data
  // (streak / progress / prefs) so the gesture actually refreshes content
  // rather than just spinning the indicator.
  const refetchLanding = landingData?.refetch
  useEffect(() => {
    const onRefresh = () => { void loadTopics(); void refetchLanding?.() }
    window.addEventListener('dashboardPullRefresh', onRefresh)
    return () => window.removeEventListener('dashboardPullRefresh', onRefresh)
  }, [loadTopics, refetchLanding])

  // target_test now flows in via LandingDataProvider — one bundled
  // /api/study/landing call replaces the 3 separate prefs/progress/
  // streak fetches this page used to fire.

  // Sort test-prep grid: SAT is pinned first (the only open test —
  // everything else is coming soon), then the student's target, then
  // the rest in catalog order.
  const sortedTests = useMemo(() => {
    const targetSlug = targetTest ? `test-${targetTest.toLowerCase()}` : null
    const rank = (t: BrowseItem) =>
      t.slug === 'test-sat' ? 0 : t.slug === targetSlug ? 1 : 2
    return [...tests].sort((a, b) => rank(a) - rank(b))
  }, [tests, targetTest])


  const name = (s: { name_en: string; name_ko: string }) => ko ? s.name_ko : s.name_en

  // The free-form creator is the ONE surface that still generates a
  // fresh question set with AI (everything topic-based is served from
  // the premade bank). The typed text plus the options below feed the
  // generator as context.
  const startFreeFormSession = async () => {
    const q = freeFormQuery.trim()
    if (!q || creatingFreeForm || !user?.userId) return
    setCreatingFreeForm(true)
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: null,
        topic_freeform: q,
        mode: 'practice',
        language: freeFormLanguage === 'auto' ? (ko ? 'ko' : 'en') : freeFormLanguage,
        config: { questionCount: freeFormCount, difficultyBias: freeFormDifficulty },
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreatingFreeForm(false)
      // Surface the failure — a silently re-enabled button reads as
      // "the app is broken", not "try again".
      showError(startFailedMessage(ko))
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  // ONE coordinated first paint: hold the whole landing behind a
  // full-page skeleton until the batched landing payload AND the topic
  // catalog are both in. Without this the hero rendered with zeros,
  // then the numbers snapped in, then the Today cards popped one by
  // one — the "loads, then changes" effect.
  if (!landingData || loading) {
    return (
      <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14 space-y-8">
        {/* Hero */}
        <SkeletonBlock className="h-[190px] w-full rounded-3xl" />
        {/* This week — heading + plan card + quests card. Use SkeletonBlock
            (which shimmers) rather than a childless SkeletonCard (a static
            white frame that would read as a dead card). */}
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-24 rounded-full" />
          <SkeletonBlock className="h-[132px] w-full rounded-2xl" />
          <SkeletonBlock className="h-[150px] w-full rounded-2xl" />
        </div>
        {/* Today band — heading + 2 cards */}
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-16 rounded-full" />
          {[0, 1].map(i => (
            <SkeletonCard key={i} className="h-[80px] p-4 flex items-center gap-3">
              <SkeletonBlock className="w-11 h-11 rounded-2xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-2.5 w-1/4 rounded-full" />
                <SkeletonBlock className="h-3 w-3/5 rounded-full" />
              </div>
            </SkeletonCard>
          ))}
        </div>
        {/* Test prep grid */}
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-28 rounded-full" />
          <SkeletonTestGrid />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {errorToast}
      {/* Decorative ambient gradient — sits behind everything, very subtle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 bg-gradient-to-b from-primary/[0.04] via-violet-500/[0.025] to-transparent"
      />
      <div className="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14 space-y-8">
        {/* Dark hero band renders its own top-right action row
            (search + overflow) on a light-on-dark treatment so both
            elements share one visual layer. */}
        <StudyHero
          onOpenSearch={() => setSearchOpen(true)}
          overflowMenu={<HeaderOverflowMenu variant="dark" />}
        />

        {/* Invite claim — shows when the student arrived via a friend's
            invite link (?ref=CODE). One tap redeems; both sides get credits.
            Self-clears on any terminal outcome (claimed / already / invalid). */}
        {pendingRef && (
          <ReferralClaimBanner
            code={pendingRef}
            onDone={() => { clearPendingReferral(); setPendingRef(null) }}
          />
        )}

        {/* First-test activation — the single highest-leverage nudge for a
            brand-new user. Shows only until they finish their first mock
            test (firstTestPending), then never again. One tap starts a free,
            instant, bank-assembled SAT test (no AI wait, no credit). */}
        {landingData.firstTestPending && <FirstTestActivationCard />}

        {/* Predicted-score headline + diagnostic moved to the test-prep
            page (topic/[slug]) so the home stays focused on time-sensitive
            items; the diagnostic now sits with "recommended for you"
            where a student prepping for a specific test looks for it. */}

        {/* This week — plan (score-plan engine P3) + weekly quests under
            one heading. Both are weekly-goal cards; grouping them stops
            them reading as two competing sections. Each self-hides when
            empty; on a loaded page Quests always renders, so the heading
            is never orphaned. */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3 px-1">
            {ko ? '이번 주' : 'This week'}
          </h2>
          <div className="space-y-4">
            <WeekPlanCard hideHeading />
            <WeeklyQuests hideHeading />
          </div>
        </section>

        {/* Each band below is wrapped in its own <SectionGroup> so
            its label sits tight to its cards (internal space-y-2)
            while the parent's space-y-8 only fires BETWEEN bands.
            Without the wrapper the parent's 32px gap applied
            uniformly between label↔card and card↔card, defeating the
            visual grouping. */}

        {/* Today — time-sensitive, all self-hide when empty. 2-up on
            desktop so the band uses the width. */}
        <SectionGroup label={String(t('study.landing.todayBand'))} cols>
          {/* No target test yet → the personalized cards below (path,
              challenge, recommendations) have nothing to anchor on, so
              lead with a pick-your-test prompt instead. Gate on
              !landingData.loading: the context object exists immediately
              while prefs are still null, so without this the card flashes
              for everyone until prefs resolve. */}
          {landingData && !landingData.loading && !targetTest && (
            <StudyTodayCard
              href="/mobile/study/path"
              icon={TargetIcon}
              iconColorClass="bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_10px_-2px_rgba(139,92,246,0.35)]"
              eyebrow={ko ? '시작하기' : 'Get started'}
              title={ko ? '목표 시험을 선택하세요' : 'Pick your target test'}
              subtitle={ko ? '추천과 학습 경로의 기준이 돼요' : "Your picks are built around it"}
            />
          )}
          {/* StudyPathPromo removed — the Path now has a permanent bottom-
              nav tab, so a promo card here was a redundant "continue"
              surface competing with Resume / Daily Challenge below. */}
          <ResumeBanner />
          <SocialPresenceCard />
          <GeneratingTestsChip />
          <StreakAtRiskBanner />
          <DailyReviewCTA />
          <DailyChallengeCard />
        </SectionGroup>

        {/* Snap-to-solve CTA removed from the landing — discoverable
            via the bottom-nav "사진 풀이" tab. Removing the orange hero
            here keeps the landing focused on time-sensitive items
            (Today) and learning history. */}

        {/* Shelves below render their own h2 headers (study.landing.
            recommendedTitle / resumeTitle / mistakes.title), so we
            don't wrap them in SectionGroup — that would double-label
            them. They sit as direct space-y-8 children of the parent
            stack, treating each shelf as its own band. */}
        <RecommendedShelf />
        <ResumableShelf />
        <MistakeBankShelf />

        {/* Subjects (K-12 catalog) removed from landing while locked
            — a full section of blurred non-clickable cards was pure
            vertical noise for a feature students can't use. When
            subjects ship, restore a real grid; until then the tests
            grid below IS the browse surface. */}

        {/* Test Prep — flat list of standardized tests. */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {t('study.landing.testsTitle')}
          </h2>
          {/* No loading branch here: the page early-returns its full
              skeleton while `loading` is true, so this only renders loaded. */}
          {(
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sortedTests.filter(t => t.slug === 'test-sat').map((test, i) => {
                const theme = themeForTest(test.slug)
                const Icon = theme.Icon
                const isTarget = targetTest !== null && test.slug === `test-${targetTest.toLowerCase()}`
                // Only the SAT is open; everything else (TOEFL, KSAT,
                // TOEIC, IELTS, ACT, AP, GRE) shows a locked overlay
                // until we expand coverage. We still render the card
                // so users see what's coming, but disable navigation
                // and dim the visuals.
                const unlocked = test.slug === 'test-sat'
                // Rendered via an explicit Link/div branch below — a
                // polymorphic `CardTag` union can't be typed cleanly
                // (Link demands href; div rejects it).
                const cardStyle = { animationDelay: `${i * 40}ms` }
                const cardClassName = `group relative overflow-hidden rounded-2xl p-4 min-h-[120px] col-span-2 ring-1 ${theme.ring} ${theme.gradient} shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out animate-card-in opacity-0 ${
                  unlocked
                    ? 'hover:shadow-[0_6px_12px_rgba(0,0,0,0.10),0_20px_40px_-12px_rgba(0,0,0,0.30)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.97]'
                    : 'cursor-not-allowed grayscale-[0.7] saturate-50'
                }`
                const cardBody = (
                  <>
                    {/* Decorative monogram watermark — large, low-opacity */}
                    <div aria-hidden className="pointer-events-none absolute -top-1 -right-2 text-[62px] font-black tracking-tighter text-white/[0.10] select-none leading-none group-hover:text-white/[0.15] transition-colors">
                      {theme.mono}
                    </div>
                    {/* Brilliant-style ambient decoration: scattered subject glyphs */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
                      {theme.decorChars.map((ch, j) => (
                        <span
                          key={j}
                          className="absolute font-semibold text-white/[0.07] group-hover:text-white/[0.10] transition-colors"
                          style={{
                            // Pseudo-random but deterministic placement per char index
                            top: `${20 + j * 28}%`,
                            left: `${10 + (j * 37) % 70}%`,
                            fontSize: `${14 + (j * 7) % 12}px`,
                            transform: `rotate(${-15 + j * 12}deg)`,
                          }}
                        >{ch}</span>
                      ))}
                    </div>
                    {/* Subtle top edge highlight */}
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    {/* Soft glow blob */}
                    <div aria-hidden className="pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/15 blur-2xl group-hover:bg-white/25 transition-colors" />

                    <div className={`relative flex flex-col h-full justify-between gap-3 ${unlocked ? '' : 'opacity-45'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                          <Icon className={`w-4 h-4 ${theme.accent}`} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(ko ? theme.stat_ko : theme.stat_en) && (
                            <span className={`inline-flex items-center text-[10px] font-semibold tracking-tight ${theme.accent} bg-black/15 backdrop-blur-md ring-1 ring-white/20 rounded-full px-2 py-0.5`}>
                              {ko ? theme.stat_ko : theme.stat_en}
                            </span>
                          )}
                          {isTarget && unlocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[9px] font-bold uppercase tracking-[0.10em] text-gray-900 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.30)] ring-1 ring-white/60">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              {ko ? '내 목표' : 'My target'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <span className={`text-[15px] font-bold ${theme.accent} leading-tight truncate tracking-tight`}>
                          {name(test)}
                        </span>
                        {unlocked && (
                          <ArrowRight className={`w-4 h-4 ${theme.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-1 flex-shrink-0 transition-all`} />
                        )}
                      </div>
                    </div>
                    {/* Locked overlay: stripe pattern + centered
                        chip on tests not yet open (everything but
                        SAT + TOEFL). Keeps the visual identity of
                        the card so users see what's coming, but
                        blocks tap. */}
                    {!unlocked && (
                      <>
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-[0.12]"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, transparent 0 6px, white 6px 7px)',
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md ring-1 ring-gray-300 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)]">
                            <Lock className="w-3.5 h-3.5 text-gray-600" />
                            <span className="text-[11px] font-semibold text-gray-700">
                              {String(t('study.landing.browseLocked'))}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )
                return unlocked ? (
                  <Link
                    key={test.id}
                    href={`/mobile/study/topic/${test.slug}`}
                    style={cardStyle}
                    className={cardClassName}
                  >
                    {cardBody}
                  </Link>
                ) : (
                  <div
                    key={test.id}
                    aria-disabled
                    style={cardStyle}
                    className={cardClassName}
                  >
                    {cardBody}
                  </div>
                )
              })}
            </div>
          )}
          {/* Coming-soon tests as a compact chip strip — the old 2x4
              grid of locked cards spent ~700px of scroll on things
              that can't be tapped. */}
          {!loading && sortedTests.some(t => t.slug !== 'test-sat') && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 mr-0.5">
                <Lock className="w-3 h-3" />
                {ko ? '준비 중' : 'Coming soon'}
              </span>
              {sortedTests.filter(t => t.slug !== 'test-sat').map(test => (
                <span
                  key={test.id}
                  className="px-2.5 py-1 rounded-full bg-white ring-1 ring-gray-200/70 text-[11.5px] font-medium text-gray-400"
                >
                  {name(test)}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Free-form "Or type anything" AI creator — hidden for now.
            Flip this `false` back to re-enable the whole section. */}
        {false && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {t('study.landing.freeformTitle')}
          </h2>
          {/* Generator options — extra context for the question set.
              Count + difficulty ride along in the session config. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-[72px] flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {ko ? '문항 수' : 'Questions'}
              </span>
              {[5, 8, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFreeFormCount(n)}
                  disabled={creatingFreeForm}
                  className={`h-7 min-w-[34px] px-2 rounded-full text-[12px] font-semibold transition-all ${
                    freeFormCount === n
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200/70 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-[72px] flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {ko ? '난이도' : 'Difficulty'}
              </span>
              {([
                { key: 'warmup' as const, en: 'Easy', ko: '쉬움' },
                { key: 'balanced' as const, en: 'Mixed', ko: '중간' },
                { key: 'challenge' as const, en: 'Hard', ko: '어려움' },
              ]).map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setFreeFormDifficulty(d.key)}
                  disabled={creatingFreeForm}
                  className={`h-7 px-2.5 rounded-full text-[12px] font-semibold transition-all ${
                    freeFormDifficulty === d.key
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200/70 hover:bg-gray-50'
                  }`}
                >
                  {ko ? d.ko : d.en}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-[72px] flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {ko ? '언어' : 'Language'}
              </span>
              {([
                { key: 'auto' as const, en: 'Auto', ko: '자동' },
                { key: 'en' as const, en: 'EN', ko: 'EN' },
                { key: 'ko' as const, en: '한국어', ko: '한국어' },
              ]).map(l => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setFreeFormLanguage(l.key)}
                  disabled={creatingFreeForm}
                  className={`h-7 px-2.5 rounded-full text-[12px] font-semibold transition-all ${
                    freeFormLanguage === l.key
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200/70 hover:bg-gray-50'
                  }`}
                >
                  {ko ? l.ko : l.en}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void startFreeFormSession() }}
            className="relative group"
          >
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={freeFormQuery}
              onChange={(e) => setFreeFormQuery(e.target.value)}
              placeholder={String(t('study.landing.freeformPlaceholder'))}
              disabled={creatingFreeForm}
              className="w-full h-12 pl-10 pr-24 rounded-2xl bg-white ring-1 ring-gray-200/70 text-[15px] placeholder:text-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:shadow-[0_2px_12px_-2px_rgba(40,133,232,0.15)] transition-all"
            />
            <StudyButton
              type="submit"
              variant="primary"
              size="sm"
              square
              disabled={!freeFormQuery.trim() || creatingFreeForm}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {creatingFreeForm ? '…' : String(t('study.landing.freeformGo'))}
            </StudyButton>
          </form>
          <p className="text-xs text-gray-400 mt-2.5 px-1 leading-relaxed">
            {t('study.landing.freeformHint')}
          </p>
        </section>
        )}
      </div>

      {/* First-visit onboarding wizard — bottom-sheet that gates the
          landing for new students. Wraps with a check so it never
          re-appears after the wizard finishes (or is skipped). */}
      {needsOnboarding && <OnboardingWizard onComplete={markComplete} />}

      {/* Universal search — opens from the header search icon. */}
      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

// Skeleton grids moved to ./skeletons.tsx for shared use across surfaces.

/** Snap-to-solve hero CTA. Single tap into the camera/upload flow.
 *  Visually loud (amber-orange gradient + camera icon) because this
 *  is the highest-intent action when a student has homework open. */
/** Labelled band on the landing page. Wraps its children in a
 *  <section> with internal space-y-2 so the label sits tight to its
 *  cards, while the parent space-y-8 only fires BETWEEN bands. If
 *  every child auto-hides (e.g. first-time user with no resumable
 *  session, no streak, no due reviews), we still render an empty
 *  section node — but space-y-8 collapses it cleanly. */
function SectionGroup({ label, children, cols }: { label: string; children: React.ReactNode; cols?: boolean }) {
  return (
    <section className="space-y-3">
      {/* Same treatment as the shelf headers below so every landing
          section reads as one system. */}
      <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
        {label}
      </h2>
      {/* `cols` flows the cards into a 2-up grid on wide screens so a
          band of full-width phone cards doesn't stretch across the
          desktop content column. */}
      <div className={cols ? 'grid gap-3 lg:grid-cols-2 items-start' : 'space-y-3'}>
        {children}
      </div>
    </section>
  )
}

/** Collapses settings + subscription behind a single "more" button.
 *  Keeps the streak / progress chips and search prominent while
 *  hiding less-frequent navigation behind a tap-to-expand menu. */
function HeaderOverflowMenu({ variant = 'light' }: { variant?: 'light' | 'dark' } = {}) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const btnClass = variant === 'dark'
    ? 'inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white hover:bg-white/25 transition'
    : 'inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 backdrop-blur ring-1 ring-gray-200/70 text-gray-600 hover:ring-primary/40 hover:text-primary hover:bg-white transition-all'
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ko ? '더 보기' : 'More'}
        aria-expanded={open}
        className={btnClass}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.15)] ring-1 ring-gray-200/70 overflow-hidden animate-fade-in">
            <Link
              href="/mobile/study/preferences"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-gray-800 hover:bg-gray-50 active:bg-gray-100"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              {String(t('study.prefs.title'))}
            </Link>
            <Link
              href="/mobile/study/subscription"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-gray-800 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-100"
            >
              <CreditCard className="w-4 h-4 text-gray-500" />
              {String(t('study.subscription.title'))}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

/** Invite-claim banner. Appears on the landing when the student arrived
 *  via a friend's invite link (?ref=CODE, captured into localStorage). One
 *  tap redeems the code — both sides get credits — via the same endpoint
 *  the Redeem box uses. Any terminal outcome (claimed, already redeemed,
 *  self, invalid) clears the pending code so the banner doesn't linger. */
function ReferralClaimBanner({ code, onDone }: { code: string; onDone: () => void }) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  const claim = async () => {
    if (state === 'busy') return
    setState('busy')
    setMsg(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/referral/redeem', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        const added = typeof json?.creditsAdded === 'number' ? json.creditsAdded : 0
        setMsg(added > 0
          ? (ko ? `크레딧 ${added}개가 지급됐어요!` : `${added} credits added!`)
          : (ko ? '코드를 사용했어요!' : 'Code redeemed!'))
        setState('done')
        setTimeout(onDone, 1600)
        return
      }
      // Terminal failures — clear so we don't nag on every load.
      if (['already_redeemed', 'self_referral', 'unknown_code'].includes(json?.code)) {
        onDone()
        return
      }
      setMsg(ko ? '다시 시도해 주세요.' : 'Please try again.')
      setState('idle')
    } catch {
      setMsg(ko ? '다시 시도해 주세요.' : 'Please try again.')
      setState('idle')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-5 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]">
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full bg-white/20 blur-3xl" />
      {state !== 'done' && (
        <button
          type="button"
          onClick={onDone}
          aria-label={ko ? '닫기' : 'Dismiss'}
          className="absolute top-3 right-3 w-7 h-7 inline-flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 ring-1 ring-white/20 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          {state === 'done' ? <Check className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
            <Sparkles className="w-3 h-3" />
            {ko ? '친구 초대' : "You're invited"}
          </div>
          <div className="text-[15px] font-bold leading-snug mt-0.5">
            {msg
              ? msg
              : (ko
                  ? `초대 코드 ${code} · 지금 크레딧 1개, 프리미엄 시 +10`
                  : `Code ${code} · 1 credit now, +10 when you go Premium`)}
          </div>
        </div>
        {state !== 'done' && (
          <button
            type="button"
            onClick={() => void claim()}
            disabled={state === 'busy'}
            className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-white text-emerald-700 text-[13px] font-bold shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)] hover:bg-emerald-50 active:scale-[0.97] disabled:opacity-70 transition"
          >
            {state === 'busy'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : (ko ? '받기' : 'Claim')}
          </button>
        )}
      </div>
    </div>
  )
}

/** First-test activation card. The single most important step for a new
 *  user is completing one full practice test — this hero-weight card
 *  drives that with one tap into a free, instant, bank-assembled SAT
 *  Reading & Writing test (no AI generation wait, no credit spend). It
 *  self-removes once the student has completed any full test
 *  (firstTestPending flips false), so returning users never see it. */
function FirstTestActivationCard() {
  const { language } = useTranslation()
  const router = useRouter()
  const ko = language === 'korean'
  const [busy, setBusy] = useState(false)
  const { showError } = useStudyErrorToast()

  const start = async () => {
    if (busy) return
    setBusy(true)
    track('activation_cta_clicked', { surface: 'first_test', kind: 'bank_sat' })
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/assemble', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        // Two-module adaptive R&W — the most representative first SAT
        // experience, and instant from the verified bank.
        body: JSON.stringify({ section: 'reading_writing', adaptive: true }),
      })
      if (!res.ok) { setBusy(false); showError(startFailedMessage(ko)); return }
      const json = await res.json()
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setBusy(false)
      showError(startFailedMessage(ko))
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-left text-white p-5 shadow-[0_10px_30px_-10px_rgba(40,133,232,0.5)] hover:shadow-[0_16px_40px_-10px_rgba(40,133,232,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait transition-all"
    >
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full bg-white/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -top-2 -right-3 text-[72px] font-black tracking-tighter text-white/[0.10] select-none leading-none">SAT</div>
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
          <PenLine className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
            <Sparkles className="w-3 h-3" />
            {ko ? '첫 걸음' : 'Start here'}
          </div>
          <div className="text-[16px] font-bold leading-snug mt-0.5">
            {ko ? '첫 모의고사를 풀어보세요' : 'Take your first practice test'}
          </div>
          <div className="text-[12.5px] opacity-90 mt-0.5 leading-snug">
            {ko ? '무료 · 즉시 시작 · 크레딧 불필요' : 'Free · instant · no credits needed'}
          </div>
        </div>
        <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 ring-1 ring-white/25 group-hover:bg-white/30 transition-colors">
          {busy
            ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
        </span>
      </div>
    </button>
  )
}

function SnapToSolveCTA() {
  const { t } = useTranslation()
  return (
    <Link href="/mobile/study/snap"
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-4 shadow-[0_8px_24px_-8px_rgba(251,146,60,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(251,146,60,0.55)] hover:-translate-y-0.5 transition-all">
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
          <Camera className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
            <Sparkles className="w-3 h-3" />{t('study.snap.eyebrow')}
          </div>
          <div className="text-[15px] font-semibold leading-snug mt-0.5">{t('study.snap.ctaTitle')}</div>
          <div className="text-[12px] opacity-90 mt-0.5">{t('study.snap.ctaSubtitle')}</div>
        </div>
        <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}

