"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon, ArrowRight,
  FileText, CreditCard, Settings, Camera, Sparkles,
  Calculator, Languages, Atom, Globe2, BookOpen, Palette, Code2, Music,
  PenLine, ClipboardCheck, Briefcase, Flag, Scroll, BookMarked, GraduationCap, LucideIcon,
  MoreHorizontal, Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from './SubscriptionGate'
import { RecommendedShelf } from './RecommendedShelf'
import { ResumableShelf } from './ResumableShelf'
import { MistakeBankShelf } from './MistakeBankShelf'
import { GeneratingTestsChip } from './GeneratingTestsChip'
import { StudyStreakChip } from './StudyStreakChip'
import { TodayProgressRing } from './TodayProgressRing'
import { ResumeBanner } from './ResumeBanner'
import { DailyReviewCTA } from './DailyReviewCTA'
import { StreakAtRiskBanner } from './_shared/StreakAtRiskBanner'
import { DailyChallengeCard } from './_shared/DailyChallengeCard'
import { SearchSheet } from './_shared/SearchSheet'
import { OnboardingWizard } from './OnboardingWizard'
import { useOnboardingGate } from './useOnboardingGate'
import { SkeletonTestGrid, SkeletonSquareGrid } from './skeletons'

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
  ring: 'ring-gray-200/60',
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
      <StudyLandingInner />
    </StudySubscriptionGate>
  )
}

function StudyLandingInner() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [subjects, setSubjects] = useState<BrowseItem[]>([])
  const [tests, setTests] = useState<BrowseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [freeFormQuery, setFreeFormQuery] = useState('')
  const [creatingFreeForm, setCreatingFreeForm] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { needsOnboarding, markComplete } = useOnboardingGate()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('study_topics')
        .select('id, slug, name_en, name_ko, level, parent_id, category')
        .in('level', [0, 1])
        .order('sort_order', { ascending: true })

      if (cancelled) return
      const rows = (data ?? []) as Topic[]

      // Subjects: each level-0 with category='subject' is a card; its
      // children (level-1 same category) populate the expanded list.
      const subjectTops = rows.filter(r => r.level === 0 && r.category === 'subject')
      const subjectBranches = rows.filter(r => r.level === 1 && r.category === 'subject')

      const subjItems: BrowseItem[] = subjectTops.map(s => ({
        id: s.id,
        slug: s.slug,
        name_en: s.name_en,
        name_ko: s.name_ko,
        branches: subjectBranches.filter(b => b.parent_id === s.id),
      }))

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

      setSubjects(subjItems)
      setTests(testItems)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const name = (s: { name_en: string; name_ko: string }) => ko ? s.name_ko : s.name_en

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
        mode: 'chat',
        language: ko ? 'ko' : 'en',
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreatingFreeForm(false)
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  return (
    <div className="relative">
      {/* Decorative ambient gradient — sits behind everything, very subtle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 -z-10 bg-gradient-to-b from-primary/[0.04] via-violet-500/[0.025] to-transparent"
      />
      <div className="px-5 pt-6 pb-14 space-y-8">
        {/* Header — chips row first so the greeting gets full width.
            On narrow viewports the chips would otherwise compress the
            title into 3 lines of choppy wrap. */}
        <header className="space-y-3">
          <div className="flex items-center justify-end gap-1.5">
            <TodayProgressRing />
            <StudyStreakChip />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={ko ? '검색' : 'Search'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 backdrop-blur ring-1 ring-gray-200/70 text-gray-600 hover:ring-primary/40 hover:text-primary hover:bg-white transition-all"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
            {/* Preferences + subscription collapsed into a single
                overflow menu. Was 3 separate buttons; the header was
                visually heavy with 5 chips squeezed together. */}
            <HeaderOverflowMenu />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 mb-2">
              {t('study.landing.eyebrow')}
            </p>
            <h1 className="text-[26px] leading-[1.15] font-semibold tracking-tight text-gray-900">
              {t('study.landing.title')}
            </h1>
            <p className="text-gray-500 text-[14.5px] leading-relaxed mt-2 max-w-md">
              {t('study.landing.subtitle')}
            </p>
          </div>
        </header>

        {/* Each band below is wrapped in its own <SectionGroup> so
            its label sits tight to its cards (internal space-y-2)
            while the parent's space-y-8 only fires BETWEEN bands.
            Without the wrapper the parent's 32px gap applied
            uniformly between label↔card and card↔card, defeating the
            visual grouping. */}

        {/* Today — time-sensitive, all self-hide when empty. */}
        <SectionGroup label={String(t('study.landing.todayBand'))}>
          <ResumeBanner />
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

        {/* Subjects — curated K-12 catalog. The h2 already labels
            this band on its own; no extra SectionGroup needed (would
            double-label). */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {t('study.landing.browseTitle')}
          </h2>
          {loading ? (
            <SkeletonSquareGrid />
          ) : (
            <div className="relative">
              {/* Locked-feature overlay: subjects (K-12 catalog) is
                  not yet available to students. Grid is rendered
                  underneath at reduced opacity so users can see what
                  will be unlocked. Pointer-events-none on the grid
                  + a top-level absolute lock chip explain the state.
                  When subjects ship, drop this wrapper entirely. */}
              <div
                aria-hidden
                className="grid grid-cols-2 gap-3 pointer-events-none opacity-35 blur-[2px] grayscale select-none"
              >
                {subjects.map((subj, i) => (
                  <SubjectSquareCard
                    key={subj.id}
                    item={subj}
                    name={name}
                    delay={i * 50}
                  />
                ))}
              </div>
              {/* Diagonal stripe overlay reinforces "this is not
                  available" without going so heavy it hides the
                  preview underneath. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.10]"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent 0 8px, #6b7280 8px 9px)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/95 backdrop-blur-md ring-1 ring-gray-300 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)]">
                  <div className="w-9 h-9 rounded-full bg-gray-100 ring-1 ring-gray-200 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-[13px] font-semibold text-gray-700">
                    {String(t('study.landing.browseLocked'))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Test Prep — flat list of standardized tests. */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {t('study.landing.testsTitle')}
          </h2>
          {loading ? (
            <SkeletonTestGrid />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tests.map((test, i) => {
                const theme = themeForTest(test.slug)
                const Icon = theme.Icon
                // Only SAT + TOEFL are open; everything else (KSAT,
                // TOEIC, IELTS, ACT, AP, GRE) shows a locked overlay
                // until we expand coverage. We still render the card
                // so users see what's coming, but disable navigation
                // and dim the visuals.
                const unlocked = test.slug === 'test-sat' || test.slug === 'test-toefl'
                const CardTag = unlocked ? Link : 'div'
                const cardProps = unlocked
                  ? { href: `/mobile/study/topic/${test.slug}` }
                  : { 'aria-disabled': true as const }
                return (
                  <CardTag
                    key={test.id}
                    {...cardProps}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`group relative overflow-hidden rounded-2xl p-4 min-h-[120px] ring-1 ${theme.ring} ${theme.gradient} shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out animate-card-in opacity-0 ${
                      unlocked
                        ? 'hover:shadow-[0_6px_12px_rgba(0,0,0,0.10),0_20px_40px_-12px_rgba(0,0,0,0.30)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.97]'
                        : 'cursor-not-allowed grayscale-[0.7] saturate-50'
                    }`}
                  >
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
                        {(ko ? theme.stat_ko : theme.stat_en) && (
                          <span className={`inline-flex items-center text-[10px] font-semibold tracking-tight ${theme.accent} bg-black/15 backdrop-blur-md ring-1 ring-white/20 rounded-full px-2 py-0.5`}>
                            {ko ? theme.stat_ko : theme.stat_en}
                          </span>
                        )}
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
                  </CardTag>
                )
              })}
            </div>
          )}
        </section>

        {/* Free-form — submit creates a chat session with topic_freeform. */}
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {t('study.landing.freeformTitle')}
          </h2>
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
            <button
              type="submit"
              disabled={!freeFormQuery.trim() || creatingFreeForm}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3.5 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(40,133,232,0.3)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(40,133,232,0.35)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {creatingFreeForm ? '…' : String(t('study.landing.freeformGo'))}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2.5 px-1 leading-relaxed">
            {t('study.landing.freeformHint')}
          </p>
        </section>
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
function SectionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </h2>
      {children}
    </section>
  )
}

/** Collapses settings + subscription behind a single "more" button.
 *  Keeps the streak / progress chips and search prominent while
 *  hiding less-frequent navigation behind a tap-to-expand menu. */
function HeaderOverflowMenu() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ko ? '더 보기' : 'More'}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/80 backdrop-blur ring-1 ring-gray-200/70 text-gray-600 hover:ring-primary/40 hover:text-primary hover:bg-white transition-all"
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

/** Square subject card — matches the test prep grid's visual rhythm.
 *  Tapping navigates to /topic/[slug] where the new dropdown picker
 *  on the topic page handles the subtopic selection (Algebra, Geometry,
 *  etc.). Removes the old inline-expand pattern in favor of a
 *  consistent grid-of-squares layout across both subjects and tests. */
function SubjectSquareCard({
  item,
  name,
  delay,
}: {
  item: BrowseItem
  name: (s: { name_en: string; name_ko: string }) => string
  delay: number
}) {
  const { t } = useTranslation()
  const theme = themeForSubject(item.slug, item.name_en)
  const Icon = theme.Icon
  const branchCount = item.branches.length
  return (
    <Link
      href={`/mobile/study/topic/${item.slug}`}
      style={{ animationDelay: `${delay}ms` }}
      className={`group relative overflow-hidden rounded-2xl ${theme.cardBg} p-4 min-h-[140px] ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:${theme.ring.replace('ring-', 'ring-')} ${theme.hoverShadow} hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-out animate-card-in opacity-0 flex flex-col justify-between`}
    >
      {/* Top edge highlight */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      {/* Decorative glow blob using the subject's accent */}
      <div aria-hidden className={`pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full ${theme.iconBg} opacity-[0.10] blur-2xl group-hover:opacity-[0.18] transition-opacity duration-300`} />

      <div className={`relative flex-shrink-0 w-12 h-12 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04] group-hover:scale-105 transition-transform duration-300`}>
        <Icon className={`w-5 h-5 ${theme.iconText}`} />
      </div>

      <div className="relative">
        <div className={`text-[15px] font-semibold text-gray-900 ${theme.hoverText} transition-colors leading-tight`}>
          {name(item)}
        </div>
        {branchCount > 0 && (
          <div className="text-[12px] text-gray-500 mt-1">
            {String(t(
              branchCount === 1 ? 'study.landing.topicCountSingular' : 'study.landing.topicCountPlural',
              { count: String(branchCount) }
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
