"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, ArrowRight,
  History, GraduationCap, FileText, CreditCard
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
      <div className="px-5 pt-8 pb-14 space-y-9">
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
            <LoadingCard label={t('study.landing.loading')} />
          ) : (
            <div className="space-y-2.5">
              {subjects.map(subj => (
                <ExpandableCard key={subj.id} item={subj} name={name} />
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
            <LoadingCard label={t('study.landing.loading')} />
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {tests.map(test => (
                <Link
                  key={test.id}
                  href={`/mobile/study/topic/${test.slug}`}
                  className="group flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-violet-300/70 hover:shadow-[0_2px_8px_-2px_rgba(124,58,237,0.16),0_8px_24px_-12px_rgba(124,58,237,0.22)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
                >
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors truncate">
                    {name(test)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
                </Link>
              ))}
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

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 px-5 py-7 text-center text-sm text-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {label}
    </div>
  )
}

/**
 * Reusable expandable card — subject cards use this; tests render
 * flat so this only renders the level-1 children inline for subjects.
 */
function ExpandableCard({
  item,
  name,
}: {
  item: BrowseItem
  name: (s: { name_en: string; name_ko: string }) => string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl bg-white overflow-hidden ring-1 transition-all duration-200 ${
      open
        ? 'ring-emerald-200/80 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.14),0_8px_24px_-12px_rgba(16,185,129,0.18)]'
        : 'ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 hover:bg-gray-50/50 active:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-900">{name(item)}</span>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-all duration-200 ${open ? 'rotate-90 text-emerald-500' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100/80 px-2 py-2 space-y-0.5 bg-gradient-to-b from-gray-50/30 to-transparent">
          {item.branches.map(branch => (
            <Link
              key={branch.id}
              href={`/mobile/study/topic/${branch.slug}`}
              className="group/branch flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/50 active:bg-emerald-50/70 text-sm text-gray-700 transition-colors"
            >
              <span>{name(branch)}</span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover/branch:text-emerald-500 group-hover/branch:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
