"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles, CheckCircle2, Lock, Play, Trophy, Target,
  BookOpen, Zap, ChevronRight, Repeat, X, Plus,
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
  /** The currently-focused target — the Path is scoped to this test. */
  target_test: string | null
  /** All targets the student is prepping for. Superset of target_test.
   *  The header target-chip strip lets them swap focus between these. */
  target_tests: string[]
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
  const [pickerOpen, setPickerOpen] = useState(false)

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

  const activeTargets = prefs?.target_tests ?? []
  const currentTarget = prefs?.target_test ?? null
  // Duolingo-style header: no more single "Change" button. When the
  // student has 2+ targets, they get a compact chip strip to swap
  // focus; a "+" button always lets them add another test template.
  const showChipStrip = activeTargets.length >= 2

  const header = (
    <StudyPageHeader
      backHref="/mobile/study"
      backLabel={ko ? '공부 화면으로' : 'Back to Study'}
      icon={Target}
      iconColorClass="text-primary bg-primary/10"
      eyebrow={String(t('study.path.eyebrow'))}
      title={template ? (ko ? template.titleKo : template.titleEn) : String(t('study.path.title'))}
      rightSlot={template ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11.5px] font-semibold transition"
          aria-label={showChipStrip
            ? (ko ? '목표 시험 추가' : 'Add target test')
            : (ko ? '목표 시험 변경' : 'Change target test')}
        >
          {showChipStrip ? <Plus className="w-3 h-3" /> : <Repeat className="w-3 h-3" />}
          {showChipStrip
            ? (ko ? '추가' : 'Add')
            : (ko ? '변경' : 'Change')}
        </button>
      ) : undefined}
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

  const handlePicked = (picked: string) => {
    // The picker acts as both an "add target" and "swap current
    // target" flow — the endpoint knows how to merge picked into the
    // full target_tests array (see prefs PUT), so all we do here is
    // optimistically reflect that same merge locally.
    setPrefs(prev => {
      const existingList = prev?.target_tests ?? []
      const nextList = existingList.includes(picked)
        ? existingList
        : [...existingList, picked]
      return { target_test: picked, target_tests: nextList }
    })
    setTemplate(getPathTemplate(picked))
    setPickerOpen(false)
  }

  /** Swap the currently-focused target without adding/removing any.
   *  Used by the chip strip when the student already has 2+ targets. */
  const switchTarget = async (next: string) => {
    if (!prefs || next === prefs.target_test) return
    setPrefs({ ...prefs, target_test: next })
    setTemplate(getPathTemplate(next))
    // Fire-and-forget PUT — the local optimistic swap is what the
    // student sees; the DB catches up asynchronously. If it fails
    // the next reload restores the last-known-good state.
    try {
      const headers = await authHeaders()
      await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_test: next }),
      })
    } catch { /* silent */ }
  }

  /** Drop a target from the strip. The endpoint reconciles target_test
   *  to a valid remaining entry (or null when the list empties). Never
   *  invoked on the currently-focused target — the UI hides the × on
   *  the current chip since removing what you're looking at right now
   *  would need a swap-then-remove and complicates the flow. */
  const removeTarget = async (test: string) => {
    if (!prefs) return
    const nextList = prefs.target_tests.filter(t => t !== test)
    // If the current target is being removed (only possible if the
    // caller doesn't respect the "not current" precondition), fall
    // back to the first remaining or null.
    const nextCurrent = prefs.target_test === test
      ? (nextList[0] ?? null)
      : prefs.target_test
    setPrefs({ target_test: nextCurrent, target_tests: nextList })
    if (nextCurrent !== prefs.target_test) {
      setTemplate(getPathTemplate(nextCurrent))
    }
    try {
      const headers = await authHeaders()
      await fetch('/api/study/prefs', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_tests: nextList }),
      })
    } catch { /* silent */ }
  }

  if (!template) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <TargetTestPicker onPicked={handlePicked} currentTarget={null} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {header}
      {showChipStrip && (
        <TargetChipStrip
          targets={activeTargets}
          currentTarget={currentTarget}
          onSwitch={switchTarget}
          onRemove={removeTarget}
        />
      )}
      <StudyPageTransition>
        <PathList nodes={annotated} testSlug={template.testSlug} />
      </StudyPageTransition>
      {pickerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-gray-50 overflow-y-auto">
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            aria-label={ko ? '닫기' : 'Close'}
            className="fixed top-4 right-4 z-[70] inline-flex items-center gap-1 h-9 px-3 rounded-full bg-white ring-1 ring-gray-200 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.20)] text-gray-700 text-[12px] font-semibold hover:ring-primary/40 transition"
          >
            <X className="w-3.5 h-3.5" />
            {ko ? '취소' : 'Cancel'}
          </button>
          {/* In add-mode we treat the currently-focused target as
              "already picked" so the picker greys it out AND greys
              out every other target the student has already added.
              When the student has only one target it's a swap-flow
              and only the current target is disabled. */}
          <TargetTestPicker
            onPicked={handlePicked}
            currentTarget={currentTarget}
            disabledTargets={showChipStrip ? activeTargets : []}
          />
        </div>
      )}
    </div>
  )
}

/** Duolingo-style target-switcher chip strip. Compact, horizontally
 *  scrollable if it ever grows past viewport width, sits right below
 *  the sticky header. Each chip carries the test name; the current
 *  one is filled. Tap to swap focus — no confirm dialog since it's
 *  a preference toggle, not a destructive action. */
function TargetChipStrip({
  targets, currentTarget, onSwitch, onRemove,
}: {
  targets: string[]
  currentTarget: string | null
  onSwitch: (next: string) => void
  onRemove: (test: string) => void
}) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  return (
    <>
      <div className="flex-shrink-0 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100 px-5 py-2">
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {targets.map(test => {
            const isCurrent = test === currentTarget
            return (
              <div
                key={test}
                className={`group flex-shrink-0 inline-flex items-center h-7 rounded-full text-[11.5px] font-bold tracking-tight transition-all ${
                  isCurrent
                    ? 'bg-primary text-white shadow-[0_2px_6px_-2px_rgba(40,133,232,0.45)]'
                    : 'bg-white ring-1 ring-gray-200 text-gray-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSwitch(test)}
                  className={`pl-2.5 h-full inline-flex items-center ${
                    isCurrent ? '' : 'hover:text-primary'
                  } ${targets.length > 1 && !isCurrent ? 'pr-1' : 'pr-2.5'}`}
                  aria-pressed={isCurrent}
                >
                  {test}
                </button>
                {/* Remove × — only on non-current chips, only when
                    there's more than one target. Prevents the empty-
                    state edge case where a student drops their last
                    active path with a stray tap. */}
                {!isCurrent && targets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmRemove(test)
                    }}
                    aria-label={ko ? `${test} 제거` : `Remove ${test}`}
                    className="pr-1.5 pl-0.5 h-full inline-flex items-center opacity-60 hover:opacity-100 hover:text-rose-500 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {confirmRemove && (
        <RemoveConfirmSheet
          test={confirmRemove}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            onRemove(confirmRemove)
            setConfirmRemove(null)
          }}
        />
      )}
    </>
  )
}

/** Small centered confirm dialog. Not a full-screen sheet — removing
 *  a target is reversible (just re-add it), so we don't need a heavy
 *  interstitial. */
function RemoveConfirmSheet({
  test, onCancel, onConfirm,
}: {
  test: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" role="dialog" aria-modal="true">
      <div
        aria-hidden
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.30)] p-5">
        <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
          {ko ? `${test} 경로를 제거할까요?` : `Remove your ${test} path?`}
        </h3>
        <p className="text-[12.5px] text-gray-600 mt-1.5 leading-relaxed">
          {ko
            ? '이미 푼 문제 기록은 그대로 남아있어요. 언제든지 다시 추가할 수 있어요.'
            : 'Your past attempts stay saved. You can add it back anytime.'}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-700 text-[13px] font-semibold hover:bg-gray-200 transition"
          >
            {ko ? '취소' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-rose-500 text-white text-[13px] font-semibold hover:bg-rose-600 transition"
          >
            {ko ? '제거' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PathList({ nodes, testSlug }: { nodes: PathNodeWithState[]; testSlug: string }) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const router = useRouter()
  const activeIdx = nodes.findIndex(n => n.state.status === 'active')
  const activeRef = useRef<HTMLDivElement | null>(null)

  const completedCount = useMemo(
    () => nodes.filter(n => n.state.status === 'completed').length,
    [nodes],
  )
  const overallPct = nodes.length === 0 ? 0 : Math.round((completedCount / nodes.length) * 100)

  // Scroll the active node into view on mount so returning students
  // see their next task without having to hunt for it.
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
    }
  }, [])

  const handleLaunch = (node: PathNodeWithState) => {
    router.push(`/mobile/study/topic/${node.subtopicSlug}?from=path&mode=${node.launchMode}`)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero-style progress banner — gradient card with mascot inline,
          big % display, sub-metric. Replaces the plain white card. */}
      <div className="px-5 pt-4 pb-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-indigo-700 text-white p-5 shadow-[0_10px_28px_-12px_rgba(40,133,232,0.55)]">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-6 w-32 h-32 rounded-full bg-indigo-300/25 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0">
              <PathMascot
                state={overallPct >= 100 ? 'celebrate' : 'idle'}
                size={64}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-white/75 mb-0.5">
                {ko ? '전체 진행률' : 'Overall progress'}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-[32px] font-bold tabular-nums leading-none">{overallPct}<span className="text-[18px] opacity-80">%</span></div>
                <div className="text-[12px] text-white/85 tabular-nums">
                  {ko
                    ? `${completedCount} / ${nodes.length} 완료`
                    : `${completedCount} / ${nodes.length} done`}
                </div>
              </div>
              <div className="mt-2.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-[width] duration-700 ease-out rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Serpentine path — SVG-drawn curved connectors + centered
          alternating nodes. The connectors color-shift based on the
          FROM-node's completion state, giving the path a visual
          "you-have-been-here" trail. overflow-x-hidden clips any
          transform overshoot on narrow phones (nodes are shifted ±32px
          off-center, callouts constrained to viewport-safe widths). */}
      <div className="relative px-5 pt-4 pb-20 overflow-x-hidden">
        {nodes.map((node, i) => {
          const isActive = node.state.status === 'active'
          const isLocked = node.state.status === 'locked'
          const isLastActive = isActive && i === activeIdx
          // Horizontal offset alternates so the path snakes. Kept small
          // (±32px) so nodes + their under-node callouts stay within a
          // narrow-phone viewport without overflowing horizontally.
          const offset = i % 2 === 0 ? '-translate-x-8' : 'translate-x-8'
          const prevCompleted = i > 0 && nodes[i - 1].state.status === 'completed'
          const curDir = i % 2 === 0 ? 'left' : 'right'
          const prevDir = (i - 1) % 2 === 0 ? 'left' : 'right'
          const showConnector = i > 0
          return (
            <div key={node.id} className="relative">
              {showConnector && (
                <SerpentineConnector
                  prevSide={prevDir as 'left' | 'right'}
                  currSide={curDir as 'left' | 'right'}
                  active={prevCompleted}
                />
              )}
              <div
                ref={isLastActive ? activeRef : undefined}
                className={`relative flex flex-col items-center transition-transform ${offset}`}
              >
                {/* Mascot floats above the active node */}
                {isLastActive && (
                  <div className="mb-1 -mt-2">
                    <PathMascot state="idle" size={72} />
                  </div>
                )}
                <PathNode node={node} onClick={() => !isLocked && handleLaunch(node)} pulsing={isLastActive} />
                {/* Active node's callout sits BELOW, full-width. Better
                    readability than the prior cramped side-by-side layout. */}
                {isLastActive && (
                  <ActiveCallout node={node} onLaunch={() => handleLaunch(node)} />
                )}
              </div>
            </div>
          )
        })}

        <div className="mt-10 flex justify-center">
          <Link
            href="/mobile/study"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200 text-[12px] text-gray-600 hover:text-primary hover:ring-primary/40 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {String(t('study.path.backToLanding'))}
          </Link>
        </div>
        <span data-test-slug={testSlug} className="hidden" aria-hidden />
      </div>
    </div>
  )
}

/** SVG curved connector between two path nodes. The curve direction
 *  flips based on which side each node sits on; active (completed
 *  prior node) segments render solid emerald, others render a subtle
 *  dashed gray so the "you have not been here" state reads clearly. */
function SerpentineConnector({
  prevSide, currSide, active,
}: {
  prevSide: 'left' | 'right'
  currSide: 'left' | 'right'
  active: boolean
}) {
  // Both nodes same side → straight vertical. Different side → S-curve.
  const isCurve = prevSide !== currSide
  const stroke = active ? '#10B981' : '#D1D5DB'
  const dash = active ? undefined : '4 6'
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 56"
      className="w-full h-12 -mt-1 -mb-1"
      preserveAspectRatio="none"
    >
      {isCurve
        ? <path
            d={prevSide === 'left'
              ? 'M 56 0 C 56 28, 184 28, 184 56'
              : 'M 184 0 C 184 28, 56 28, 56 56'}
            stroke={stroke}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={dash}
          />
        : <line
            x1={prevSide === 'left' ? 56 : 184}
            y1="0"
            x2={prevSide === 'left' ? 56 : 184}
            y2="56"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={dash}
          />}
    </svg>
  )
}

/** Circle node — completed / active / locked visual variants.
 *  Milestone nodes get a bigger circle + gold gradient to stand out
 *  along the path. Active node adds a subtle pulse ring behind. */
function PathNode({
  node, onClick, pulsing,
}: {
  node: PathNodeWithState
  onClick: () => void
  pulsing?: boolean
}) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const status = node.state.status
  const label = ko ? node.labelKo : node.labelEn

  const size = node.milestone ? 'w-28 h-28' : 'w-24 h-24'

  // Two-layer visual: outer ring uses a gradient for depth, inner
  // circle carries the actual bg fill. Completed nodes read glossy
  // green, active reads primary-with-shadow, milestones swap in gold.
  const outerRing =
    status === 'completed'
      ? 'from-emerald-300 to-emerald-500'
      : status === 'active'
        ? (node.milestone ? 'from-amber-300 to-orange-500' : 'from-primary/60 to-indigo-500')
        : 'from-gray-200 to-gray-300'

  const innerBg =
    status === 'completed'
      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
      : status === 'active'
        ? (node.milestone
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
            : 'bg-gradient-to-br from-primary to-indigo-600 text-white')
        : 'bg-white text-gray-400'

  const shadow =
    status === 'active'
      ? 'shadow-[0_14px_32px_-8px_rgba(40,133,232,0.55)]'
      : status === 'completed'
        ? 'shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55)]'
        : 'shadow-none'

  const disabled = status === 'locked'
  const iconSize = node.milestone ? 'w-10 h-10' : 'w-8 h-8'

  return (
    <div className="relative">
      {/* Ambient pulse — sits behind the active node so the eye lands
          here on scroll-in. Purely decorative. */}
      {pulsing && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-primary/25 animate-ping"
        />
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative ${size} rounded-full p-1 bg-gradient-to-br ${outerRing} ${shadow} flex items-center justify-center transition-all disabled:cursor-not-allowed ${
          !disabled ? 'hover:scale-105 active:scale-95' : ''
        }`}
        aria-label={label}
        aria-disabled={disabled}
      >
        <div className={`w-full h-full rounded-full ${innerBg} flex flex-col items-center justify-center relative overflow-hidden`}>
          {/* Glossy top highlight — subtle inner light on the top
              third of the circle, adds three-dimensionality. */}
          {status !== 'locked' && (
            <span aria-hidden className="pointer-events-none absolute inset-x-1 top-1 h-1/3 rounded-full bg-white/25 blur-sm" />
          )}
          {status === 'completed' ? (
            <CheckCircle2 className={iconSize} strokeWidth={2.5} />
          ) : status === 'locked' ? (
            <Lock className="w-7 h-7" />
          ) : node.kind === 'full_test' ? (
            <Trophy className={iconSize} strokeWidth={2.5} />
          ) : node.kind === 'section_test' ? (
            <Zap className={iconSize} strokeWidth={2.5} />
          ) : node.kind === 'diagnostic' ? (
            <Target className={iconSize} strokeWidth={2.5} />
          ) : (
            <Play className={iconSize} strokeWidth={2.5} />
          )}
          <span className={`mt-1 text-[10px] font-bold tracking-tight leading-none px-1 text-center ${
            status === 'locked' ? 'text-gray-400' : ''
          }`}>
            {String(t(`study.path.kind.${node.kind}`))}
          </span>
        </div>
      </button>
    </div>
  )
}

/** Full-width callout that sits BELOW the active node. Carries the
 *  label, one-line detail, and Start CTA. Full-width reads better on
 *  narrow phones than the prior side-hugging bubble which forced text
 *  wrapping and cramped the horizontal layout. */
function ActiveCallout({
  node, onLaunch,
}: {
  node: PathNodeWithState
  onLaunch: () => void
}) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  return (
    <div className="relative mt-3 w-[240px] max-w-[min(240px,calc(100vw-40px))] rounded-2xl bg-white ring-1 ring-primary/20 shadow-[0_10px_28px_-8px_rgba(40,133,232,0.40)] px-4 py-3">
      {/* Speech-bubble tail pointing up at the node */}
      <div
        aria-hidden
        className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-white ring-1 ring-primary/20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        }}
      />
      <div className="relative text-center">
        <div className="text-[14px] font-bold text-gray-900 leading-tight">
          {ko ? node.labelKo : node.labelEn}
        </div>
        <div className="text-[11.5px] text-gray-500 mt-1 leading-snug">
          {ko ? node.detailKo : node.detailEn}
        </div>
        <button
          type="button"
          onClick={onLaunch}
          className="mt-2.5 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white text-[13px] font-bold shadow-[0_6px_14px_-4px_rgba(40,133,232,0.55)] hover:brightness-110 active:scale-95 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {String(t('study.path.start'))}
        </button>
      </div>
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
function TargetTestPicker({
  onPicked, currentTarget, disabledTargets = [],
}: {
  onPicked: (target: string) => void
  currentTarget: string | null
  /** Extra keys to disable (in addition to currentTarget). Used in
   *  add-target mode so the student can't double-add SAT when SAT is
   *  already in their list. */
  disabledTargets?: string[]
}) {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Multi-pick tracking — when the picker opens from the empty state,
  // students can tap several tests before closing. Each tap still
  // persists immediately (progressive save), but the UI reflects
  // "you've added N so far" rather than snapping shut on the first pick.
  const [sessionAdded, setSessionAdded] = useState<string[]>([])
  // Fresh-start mode is when there's no current target AND nothing
  // pre-disabled. In that case we don't auto-close on pick; the
  // student clicks Done when they're satisfied.
  const freshStart = currentTarget === null && disabledTargets.length === 0

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
      if (freshStart) {
        // Progressive multi-pick — track locally, keep picker open so
        // the student can add more before hitting Done.
        setSessionAdded(prev => prev.includes(opt.key) ? prev : [...prev, opt.key])
        setSaving(null)
      } else {
        // Add-target flow from an existing chip strip — a single tap
        // finishes and closes.
        onPicked(opt.key)
      }
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
            const isCurrent = currentTarget === opt.key
            const isAlreadyAdded =
              disabledTargets.includes(opt.key) || sessionAdded.includes(opt.key)
            const disabled = isCurrent || isAlreadyAdded
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => pick(opt)}
                disabled={!!saving || disabled}
                className={`w-full relative overflow-hidden rounded-2xl bg-gradient-to-br ${opt.accent} text-white p-4 flex items-center gap-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.32)] active:scale-[0.99] disabled:opacity-70 transition-all ${
                  isCurrent ? 'ring-2 ring-white/70' : ''
                } ${isAlreadyAdded && !isCurrent ? 'opacity-60' : ''}`}
              >
                <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 ring-1 ring-white/25 text-[20px] font-black tracking-tight">
                  {opt.initial}
                </div>
                <div className="relative flex-1 min-w-0 text-left">
                  <div className="text-[16px] font-bold leading-tight flex items-center gap-2">
                    {ko ? opt.labelKo : opt.labelEn}
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-sm px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.1em] uppercase">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {ko ? '현재' : 'Current'}
                      </span>
                    )}
                    {!isCurrent && isAlreadyAdded && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-sm px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.1em] uppercase">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {ko ? '추가됨' : 'Added'}
                      </span>
                    )}
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

        {/* Fresh-start Done CTA — enabled once at least one target is
            picked. Progressive save means every pick has already
            persisted, so tapping Done just hands control back to the
            parent with the most-recent pick as the current focus. */}
        {freshStart && sessionAdded.length > 0 && (
          <button
            type="button"
            onClick={() => onPicked(sessionAdded[sessionAdded.length - 1])}
            className="mt-5 w-full h-12 rounded-2xl bg-primary text-white text-[14px] font-bold hover:bg-primary/90 transition"
          >
            {ko
              ? `${sessionAdded.length}개 경로로 시작하기`
              : `Start with ${sessionAdded.length} ${sessionAdded.length === 1 ? 'path' : 'paths'}`}
          </button>
        )}

        <p className="text-center text-[11px] text-gray-500 mt-4">
          {freshStart
            ? (ko
                ? '여러 개를 골라도 돼요. 아무 때나 추가하거나 삭제할 수 있어요.'
                : 'Pick as many as you like. Add or remove anytime.')
            : (ko
                ? '언제든지 설정에서 바꿀 수 있어요.'
                : 'You can change this anytime in preferences.')}
        </p>
      </div>
    </div>
  )
}
