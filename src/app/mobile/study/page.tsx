"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ArrowRight,
  History, GraduationCap, FileText, CreditCard,
  Calculator, Languages, Atom, Globe2, BookOpen, Palette, Code2, Music,
  PenLine, ClipboardCheck, Briefcase, Flag, Scroll, BookMarked, LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from './SubscriptionGate'
import { RecommendedShelf } from './RecommendedShelf'

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
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80 mb-2">
              {t('study.landing.eyebrow')}
            </p>
            <h1 className="text-[28px] leading-[1.1] font-semibold tracking-tight text-gray-900">
              {t('study.landing.title')}
            </h1>
            <p className="text-gray-500 text-[15px] leading-relaxed mt-2 max-w-md">
              {t('study.landing.subtitle')}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 pt-1">
            <Link
              href="/mobile/study/history"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur ring-1 ring-gray-200/70 text-gray-600 hover:ring-primary/40 hover:text-primary hover:bg-white transition-all"
              aria-label={String(t('study.landing.history'))}
            >
              <History className="w-4 h-4" />
            </Link>
            <Link
              href="/mobile/study/subscription"
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/80 backdrop-blur ring-1 ring-gray-200/70 text-gray-600 hover:ring-primary/40 hover:text-primary hover:bg-white transition-all"
              aria-label={String(t('study.subscription.title'))}
            >
              <CreditCard className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Recommended shelf — Phase 3, reads study_mastery + recent
            sessions via /api/study/recommended. */}
        <RecommendedShelf />

        {/* Subjects — curated K-12 catalog. */}
        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            {t('study.landing.browseTitle')}
          </h2>
          {loading ? (
            <SkeletonSquareGrid />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subj, i) => (
                <SubjectSquareCard
                  key={subj.id}
                  item={subj}
                  name={name}
                  delay={i * 50}
                />
              ))}
            </div>
          )}
        </section>

        {/* Test Prep — flat list of standardized tests. */}
        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-violet-50 ring-1 ring-violet-100">
              <FileText className="w-3.5 h-3.5 text-violet-600" />
            </span>
            {t('study.landing.testsTitle')}
          </h2>
          {loading ? (
            <SkeletonGrid />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {tests.map((test, i) => {
                const theme = themeForTest(test.slug)
                const Icon = theme.Icon
                return (
                  <Link
                    key={test.id}
                    href={`/mobile/study/topic/${test.slug}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`group relative overflow-hidden rounded-2xl p-4 min-h-[120px] ring-1 ${theme.ring} ${theme.gradient} shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.10),0_20px_40px_-12px_rgba(0,0,0,0.30)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.97] transition-all duration-300 ease-out animate-card-in opacity-0`}
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

                    <div className="relative flex flex-col h-full justify-between gap-3">
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
                        <ArrowRight className={`w-4 h-4 ${theme.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-1 flex-shrink-0 transition-all`} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Free-form — submit creates a chat session with topic_freeform. */}
        <section>
          <h2 className="text-[15px] font-semibold text-gray-900 mb-3">
            {t('study.landing.freeformTitle')}
          </h2>
          <form
            onSubmit={(e) => { e.preventDefault(); void startFreeFormSession() }}
            className="relative group"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-focus-within:text-primary transition-colors" />
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
    </div>
  )
}

/** Shimmer skeleton grid — matches the test-prep card layout. */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className="relative overflow-hidden rounded-2xl min-h-[120px] p-4 bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-gray-200/60 animate-card-in opacity-0"
        >
          <div className="absolute inset-0 animate-shimmer-soft" />
        </div>
      ))}
    </div>
  )
}

/** Shimmer skeleton grid for subject squares — taller cards to match
 *  the actual SubjectSquareCard min-height. */
function SkeletonSquareGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 60}ms` }}
          className="relative overflow-hidden rounded-2xl min-h-[140px] p-4 bg-white ring-1 ring-gray-200/60 animate-card-in opacity-0 flex flex-col justify-between"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 animate-shimmer-soft" />
          <div className="space-y-1.5">
            <div className="h-3 w-3/5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 animate-shimmer-soft" />
            <div className="h-2.5 w-1/3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 animate-shimmer-soft" />
          </div>
        </div>
      ))}
    </div>
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
