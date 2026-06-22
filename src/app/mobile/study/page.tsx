"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Search, ChevronRight, ArrowRight, Lightbulb
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from './SubscriptionGate'

/**
 * /mobile/study — study landing.
 *
 * Three vertically-stacked sections:
 *  1. Recommended-for-you shelf (placeholder in Phase 1; wired to
 *     mastery data in Phase 3)
 *  2. Topic-first selector — browse curated subjects/branches
 *  3. Free-form fallback — "didn't find it? type any topic" → AI auto-
 *     categorizes (Phase 2)
 *
 * Mode picker lives one step deeper: tapping a topic opens a chooser
 * (chat / practice / lesson / flashcards) that starts the session.
 *
 * Wrapped in StudySubscriptionGate so first-visit auto-provisions a
 * 7-day trial. Phase 4 hardens the paywall path.
 */

interface Subject {
  id: string
  slug: string
  name_en: string
  name_ko: string
}

interface SubjectWithBranches extends Subject {
  branches: Subject[]
}

export default function StudyLandingPage() {
  return (
    <StudySubscriptionGate>
      <StudyLandingInner />
    </StudySubscriptionGate>
  )
}

function StudyLandingInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [subjects, setSubjects] = useState<SubjectWithBranches[]>([])
  const [loading, setLoading] = useState(true)
  const [freeFormQuery, setFreeFormQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // Pull subjects + branches in one go. Leaves load lazily when
      // the user expands a branch (Phase 1 keeps this shallow).
      const { data } = await supabase
        .from('study_topics')
        .select('id, slug, name_en, name_ko, level, parent_id, sort_order')
        .in('level', [0, 1])
        .order('sort_order', { ascending: true })

      if (cancelled) return

      const subjs = (data ?? []).filter(t => t.level === 0)
      const branches = (data ?? []).filter(t => t.level === 1)
      const grouped: SubjectWithBranches[] = subjs.map(s => ({
        id: s.id,
        slug: s.slug,
        name_en: s.name_en,
        name_ko: s.name_ko,
        branches: branches
          .filter(b => b.parent_id === s.id)
          .map(b => ({ id: b.id, slug: b.slug, name_en: b.name_en, name_ko: b.name_ko })),
      }))
      setSubjects(grouped)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const name = (s: Subject) => ko ? s.name_ko : s.name_en

  return (
    <div className="px-5 pt-6 pb-12 space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
          {t('study.landing.eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {t('study.landing.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('study.landing.subtitle')}
        </p>
      </header>

      {/* Recommended shelf — Phase 1 placeholder; Phase 3 wires this
          to study_mastery + recent sessions. */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {t('study.landing.recommendedTitle')}
          </h2>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
          <Lightbulb className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t('study.landing.recommendedEmpty')}
          </p>
        </div>
      </section>

      {/* Topic-first selector — Phase 1 lists subjects + branches.
          Tapping a branch opens the leaf picker (Phase 2). */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">
          {t('study.landing.browseTitle')}
        </h2>
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 text-center text-sm text-gray-400">
            {t('study.landing.loading')}
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(subj => (
              <SubjectCard key={subj.id} subject={subj} name={name} />
            ))}
          </div>
        )}
      </section>

      {/* Free-form fallback. Phase 2 turns this into an AI-categorize
          call that creates a topic_freeform session. */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">
          {t('study.landing.freeformTitle')}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={freeFormQuery}
            onChange={(e) => setFreeFormQuery(e.target.value)}
            placeholder={String(t('study.landing.freeformPlaceholder'))}
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 px-1">
          {t('study.landing.freeformHint')}
        </p>
      </section>
    </div>
  )
}

/**
 * Per-subject card. Tapping the subject header would deep-link to a
 * subject overview in Phase 2; for Phase 1 it just expands inline.
 */
function SubjectCard({
  subject,
  name,
}: {
  subject: SubjectWithBranches
  name: (s: Subject) => string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50"
      >
        <span className="text-sm font-semibold text-gray-900">{name(subject)}</span>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-2 py-2 space-y-1">
          {subject.branches.map(branch => (
            <Link
              key={branch.id}
              href={`/mobile/study/topic/${branch.slug}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
            >
              <span>{name(branch)}</span>
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// STUDY_MODES lives in ./modes.ts so Phase 2's per-topic mode picker
// can import it without colliding with Next's strict page-file export
// rules.
