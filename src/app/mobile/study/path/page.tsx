"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, CheckCircle2, Lock, Play, Trophy, Target,
  BookOpen, Zap, ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudyPageHeader, StudyPageTransition } from '../_shared/primitives'
import { SkeletonBlock } from '../skeletons'
import { PathMascot, type MascotState } from '../_shared/PathMascot'
import {
  annotatePath, getPathTemplate,
  type PathNodeWithState, type StudyPathTemplate,
} from '@/lib/study-path'

/**
 * StudyPath — mascot-led linear progression surface. Lives at
 * /mobile/study/path alongside the existing landing. Design/build
 * MVP for the "big bet" from the UX research pass.
 *
 * Renders a vertical alternating (left/right) node graph scoped to
 * the student's target test. Each node has one of three states —
 * completed (green check), active (colored + mascot next to it), or
 * locked (gray + lock). Tapping the active node launches the
 * corresponding practice / test session.
 *
 * MVP scope:
 *   - Templates in code (see lib/study-path.ts), not DB
 *   - Two supported tests: SAT + TOEFL
 *   - Progression driven off existing study_mastery + completed
 *     study_sessions — no new tables
 *   - One mascot with idle/celebrate/thinking/sad states, positioned
 *     next to the active node
 *
 * Not scoped for this pass: A/B toggle to promote the path to the
 * primary landing; DB-backed path definitions; branching graphs.
 */

interface Prefs {
  target_test: string | null
}

interface MasteryRow {
  score: number
  topic_id: string
}

export default function StudyPathPage() {
  return <StudyPathInner />
}

function StudyPathInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const { user } = usePersistentMobileAuth()
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [template, setTemplate] = useState<StudyPathTemplate | null>(null)
  const [masteryBySlug, setMasteryBySlug] = useState<Record<string, number>>({})
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false

    void (async () => {
      // Prefs first — target_test drives which template we resolve.
      let target: string | null = null
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (res.ok) {
          const json = await res.json() as { prefs?: Prefs }
          target = json.prefs?.target_test ?? null
          if (!cancelled) setPrefs(json.prefs ?? null)
        }
      } catch { /* silent */ }

      const tpl = getPathTemplate(target)
      if (!cancelled) setTemplate(tpl)
      if (!tpl) {
        if (!cancelled) setLoading(false)
        return
      }

      // Slugs the template exercises + the parent test slug so we can
      // count "full test" completions against it.
      const slugs = Array.from(new Set(tpl.nodes.map(n => n.subtopicSlug)))
      const { data: topics } = await supabase
        .from('study_topics')
        .select('id, slug')
        .in('slug', slugs)
      const idToSlug: Record<string, string> = {}
      const topicIds: string[] = []
      for (const row of (topics ?? []) as Array<{ id: string; slug: string }>) {
        idToSlug[row.id] = row.slug
        topicIds.push(row.id)
      }

      if (topicIds.length > 0) {
        const [{ data: masteryRows }, { data: sessionRows }] = await Promise.all([
          supabase
            .from('study_mastery')
            .select('score, topic_id')
            .eq('student_id', user.userId)
            .in('topic_id', topicIds),
          supabase
            .from('study_sessions')
            .select('topic_id')
            .eq('student_id', user.userId)
            .eq('status', 'completed')
            .in('topic_id', topicIds),
        ])

        const mastery: Record<string, number> = {}
        for (const row of (masteryRows ?? []) as MasteryRow[]) {
          const slug = idToSlug[row.topic_id]
          if (slug) mastery[slug] = row.score
        }

        const completed = new Set<string>()
        for (const row of (sessionRows ?? []) as Array<{ topic_id: string }>) {
          const slug = idToSlug[row.topic_id]
          if (slug) completed.add(slug)
        }

        if (!cancelled) {
          setMasteryBySlug(mastery)
          setCompletedSlugs(completed)
        }
      }

      if (!cancelled) setLoading(false)
    })()

    return () => { cancelled = true }
  }, [user?.userId])

  const annotated = useMemo(() => {
    if (!template) return []
    return annotatePath(template, masteryBySlug, completedSlugs)
  }, [template, masteryBySlug, completedSlugs])

  const header = (
    <StudyPageHeader
      icon={Target}
      iconColorClass="text-primary bg-primary/10"
      eyebrow={String(t('study.path.eyebrow'))}
      title={template ? (ko ? template.titleKo : template.titleEn) : String(t('study.path.title'))}
    />
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <div className="flex-1 px-5 pt-6 space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-center">
              <SkeletonBlock className="h-20 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <TargetTestPicker
          onPicked={(picked) => {
            // Optimistically resolve locally so the path renders
            // instantly on selection; a full refetch would round-trip
            // through the prefs endpoint for no user-visible benefit.
            setPrefs({ target_test: picked })
            setTemplate(getPathTemplate(picked))
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {header}
      <StudyPageTransition>
        <PathList nodes={annotated} testSlug={template.testSlug} />
      </StudyPageTransition>
    </div>
  )
}

function PathList({ nodes, testSlug }: { nodes: PathNodeWithState[]; testSlug: string }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const router = useRouter()
  const activeIdx = nodes.findIndex(n => n.state.status === 'active')

  const overallPct = useMemo(() => {
    if (nodes.length === 0) return 0
    const done = nodes.filter(n => n.state.status === 'completed').length
    return Math.round((done / nodes.length) * 100)
  }, [nodes])

  const handleLaunch = (node: PathNodeWithState) => {
    // Route to the topic page for this subtopic. Topic page handles
    // mode selection (practice / full_test) via its existing UI. This
    // keeps session-creation logic in one place instead of forking a
    // second path here.
    router.push(`/mobile/study/topic/${node.subtopicSlug}?from=path&mode=${node.launchMode}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Path-wide progress banner */}
      <div className="px-5 pt-5 pb-3">
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-semibold text-gray-800">
              {ko ? '전체 진행률' : 'Overall progress'}
            </div>
            <div className="text-[13px] font-bold tabular-nums text-primary">{overallPct}%</div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary to-emerald-500 transition-[width] duration-700 ease-out"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            {ko
              ? `${nodes.filter(n => n.state.status === 'completed').length} / ${nodes.length} 완료`
              : `${nodes.filter(n => n.state.status === 'completed').length} of ${nodes.length} completed`}
          </div>
        </div>
      </div>

      {/* Node list — alternating left/right positions to create the
          serpentine path visual (Duolingo pattern). The active node
          gets the mascot + call-to-action bubble. */}
      <div className="px-5 pb-24 pt-2">
        {nodes.map((node, i) => {
          const side = i % 2 === 0 ? 'left' : 'right'
          const isActive = node.state.status === 'active'
          const isCompleted = node.state.status === 'completed'
          const isLocked = node.state.status === 'locked'
          const isLastActive = isActive && i === activeIdx
          return (
            <div key={node.id} className="relative">
              {/* Vertical connector segment above every node except the first */}
              {i > 0 && (
                <div
                  aria-hidden
                  className={`mx-auto w-1 h-8 -mt-1 ${
                    nodes[i - 1].state.status === 'completed' ? 'bg-emerald-300' : 'bg-gray-200'
                  }`}
                  style={{ maskImage: 'linear-gradient(to bottom, transparent 0, black 30%, black 70%, transparent 100%)' }}
                />
              )}
              <div className={`flex ${side === 'left' ? 'justify-start pl-4' : 'justify-end pr-4'}`}>
                <div className="flex items-center gap-3">
                  {side === 'right' && isLastActive && (
                    <ActiveBubble node={node} onLaunch={() => handleLaunch(node)} align="left" />
                  )}
                  {side === 'right' && isLastActive && <PathMascot state="idle" size={64} />}
                  <PathNode node={node} onClick={() => !isLocked && handleLaunch(node)} />
                  {side === 'left' && isLastActive && <PathMascot state="idle" size={64} />}
                  {side === 'left' && isLastActive && (
                    <ActiveBubble node={node} onLaunch={() => handleLaunch(node)} align="right" />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Footer chip pointing back to the classic landing so students
            can still get to shelves + browse while the path is opt-in. */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/mobile/study"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200 text-[12px] text-gray-600 hover:text-primary hover:ring-primary/40 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {String(t('study.path.backToLanding'))}
          </Link>
        </div>
        {/* testSlug is unused directly (subtopicSlug drives launches)
            but referenced here to keep it in the signature so callers
            can extend to test-scoped analytics without refactor. */}
        <span data-test-slug={testSlug} className="hidden" aria-hidden />
      </div>
    </div>
  )
}

/** Circle node — completed / active / locked visual variants. Milestone
 *  nodes get a bigger circle and a gold ring so they stand out along
 *  the path. */
function PathNode({ node, onClick }: { node: PathNodeWithState; onClick: () => void }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const status = node.state.status
  const label = ko ? node.labelKo : node.labelEn

  const size = node.milestone ? 'w-24 h-24' : 'w-20 h-20'
  const ring =
    status === 'completed' ? 'ring-emerald-300' :
    status === 'active' ? (node.milestone ? 'ring-amber-300' : 'ring-primary/40') :
    'ring-gray-200'

  const bg =
    status === 'completed' ? 'bg-emerald-500 text-white' :
    status === 'active' ? (node.milestone
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
        : 'bg-primary text-white')
      : 'bg-white text-gray-400'

  const shadow =
    status === 'active' ? 'shadow-[0_8px_22px_-6px_rgba(40,133,232,0.45)]' :
    status === 'completed' ? 'shadow-[0_4px_12px_-4px_rgba(16,185,129,0.45)]' :
    'shadow-none'

  const disabled = status === 'locked'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${size} rounded-full ${bg} ${shadow} ring-4 ${ring} flex flex-col items-center justify-center transition-all disabled:cursor-not-allowed ${
        !disabled ? 'hover:scale-105 active:scale-95' : ''
      }`}
      aria-label={label}
      aria-disabled={disabled}
    >
      {status === 'completed' ? (
        <CheckCircle2 className={node.milestone ? 'w-9 h-9' : 'w-7 h-7'} />
      ) : status === 'locked' ? (
        <Lock className="w-6 h-6" />
      ) : node.kind === 'full_test' ? (
        <Trophy className={node.milestone ? 'w-9 h-9' : 'w-7 h-7'} />
      ) : node.kind === 'section_test' ? (
        <Zap className={node.milestone ? 'w-9 h-9' : 'w-7 h-7'} />
      ) : node.kind === 'diagnostic' ? (
        <Target className="w-7 h-7" />
      ) : (
        <Play className="w-6 h-6 ml-0.5" />
      )}
      <span className={`mt-1 text-[10px] font-semibold tracking-tight leading-none px-1 text-center ${
        status === 'locked' ? 'text-gray-400' : ''
      }`}>
        {String(t(`study.path.kind.${node.kind}`))}
      </span>
    </button>
  )
}

/** Callout bubble shown next to the active node — carries the label,
 *  a one-line detail, and a primary start button. Placement (left vs
 *  right of the node) flips based on which side of the serpentine the
 *  node itself sits on, so the mascot always faces the content. */
function ActiveBubble({
  node, onLaunch, align,
}: {
  node: PathNodeWithState
  onLaunch: () => void
  align: 'left' | 'right'
}) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  return (
    <div className={`max-w-[180px] rounded-2xl bg-white ring-1 ring-primary/20 shadow-[0_8px_20px_-8px_rgba(40,133,232,0.35)] p-3 ${align === 'right' ? 'text-right' : ''}`}>
      <div className="text-[13px] font-bold text-gray-900 leading-tight">
        {ko ? node.labelKo : node.labelEn}
      </div>
      <div className="text-[11px] text-gray-500 mt-1 leading-snug">
        {ko ? node.detailKo : node.detailEn}
      </div>
      <button
        type="button"
        onClick={onLaunch}
        className="mt-2 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 transition"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {String(t('study.path.start'))}
      </button>
    </div>
  )
}

/**
 * Inline picker rendered on the empty Path state — lets a student
 * with no target_test choose SAT or TOEFL right here instead of
 * being punted to /mobile/study/preferences. Persists via the
 * standard /api/study/prefs PUT then hands control back to the
 * parent via onPicked so the path renders instantly.
 *
 * Kept scoped to the two tests that actually have templates today
 * (SAT + TOEFL). When more test templates ship (KSAT, TOEIC, …) add
 * them here.
 */
function TargetTestPicker({ onPicked }: { onPicked: (target: string) => void }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const OPTIONS: Array<{
    key: string
    labelEn: string
    labelKo: string
    subEn: string
    subKo: string
    accent: string
    initial: string
  }> = [
    {
      key: 'SAT',
      labelEn: 'SAT',
      labelKo: 'SAT',
      subEn: 'Reading & Writing · Math',
      subKo: '읽기·쓰기 · 수학',
      accent: 'from-sky-500 via-blue-600 to-indigo-700',
      initial: 'S',
    },
    {
      key: 'TOEFL',
      labelEn: 'TOEFL',
      labelKo: 'TOEFL',
      subEn: 'Reading · Listening · Speaking · Writing',
      subKo: '읽기 · 듣기 · 말하기 · 쓰기',
      accent: 'from-emerald-500 via-teal-600 to-cyan-700',
      initial: 'T',
    },
  ]

  const pick = async (opt: typeof OPTIONS[number]) => {
    if (saving) return
    setSaving(opt.key)
    setError(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_test: opt.key }),
      })
      if (!res.ok) {
        setError(ko ? '저장에 실패했어요. 다시 시도해 주세요.' : 'Save failed. Try again.')
        setSaving(null)
        return
      }
      onPicked(opt.key)
    } catch {
      setError(ko ? '네트워크 오류가 발생했어요.' : 'Network error.')
      setSaving(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-14">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center mb-3">
            <PathMascot state="thinking" size={72} />
          </div>
          <h2 className="text-[19px] font-bold tracking-tight text-gray-900">
            {String(t('study.path.noTargetTitle'))}
          </h2>
          <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t('study.path.noTargetDesc'))}
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-[12.5px] text-rose-800">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          {OPTIONS.map(opt => {
            const isSaving = saving === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => pick(opt)}
                disabled={!!saving}
                className={`w-full relative overflow-hidden rounded-2xl bg-gradient-to-br ${opt.accent} text-white p-4 flex items-center gap-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.32)] active:scale-[0.99] disabled:opacity-70 transition-all`}
              >
                <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 ring-1 ring-white/25 text-[20px] font-black tracking-tight">
                  {opt.initial}
                </div>
                <div className="relative flex-1 min-w-0 text-left">
                  <div className="text-[16px] font-bold leading-tight">
                    {ko ? opt.labelKo : opt.labelEn}
                  </div>
                  <div className="text-[11.5px] text-white/85 mt-0.5 leading-snug">
                    {ko ? opt.subKo : opt.subEn}
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  {isSaving
                    ? <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    : <ChevronRight className="w-5 h-5 opacity-80" />}
                </div>
              </button>
            )
          })}
        </div>

        <p className="text-center text-[11px] text-gray-500 mt-5">
          {ko
            ? '언제든지 설정에서 바꿀 수 있어요.'
            : 'You can change this anytime in preferences.'}
        </p>
      </div>
    </div>
  )
}
