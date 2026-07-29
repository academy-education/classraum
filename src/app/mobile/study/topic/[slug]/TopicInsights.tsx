"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/auth-headers'
import { TrendingUp, TrendingDown, Sparkles } from '../../_shared/icons'
import { SectionBreakdownCard, SkillCards } from '../../_shared/SectionBreakdown'
import type { Breakdown } from '@/lib/study/section-breakdown'
import { chartGeometry, trendDelta, type TrendPoint } from '@/lib/study/topic-trend'

/**
 * Score trend + AI strengths and weaknesses, under the topic's progress
 * card.
 *
 * Every point comes from /api/study/topic-insights, which RECOMPUTES
 * each session through the same scorer the result screen uses. It does
 * not read study_sessions.score — that column still holds the old model
 * for Speaking and Writing, and a chart drawn from it would disagree
 * with the very screen its points link to. See lib/study/topic-trend.ts.
 *
 * Chart choices, so the next person does not "improve" them back:
 * - ONE series, so there is no legend and no categorical palette to get
 *   colourblind-wrong. Identity comes from the title.
 * - The y window is the data's range padded, not 0-100. Three sessions
 *   at 40/42/41 drawn on a full axis is a flat line that hides the only
 *   movement there is; a floor on the span stops the opposite lie.
 * - Only the newest point is labelled. A number on every point is noise
 *   at this size.
 */

interface Insights {
  points: TrendPoint[]
  breakdown: Breakdown
  mastery: {
    score: number | null
    attempts: number
    lastAssessedAt: string | null
    strengths: string[]
    weaknesses: string[]
  } | null
}

const W = 300
const H = 84

export function TopicInsights({
  topicId, ko, onPractice, onScores,
}: {
  topicId: string
  ko: boolean
  /** Starts a practice session on this topic. */
  onPractice?: () => void
  /** Hands the RECOMPUTED percents up so the mock-test list below can
   *  show the same number this chart plots. Without it that list reads
   *  study_sessions.score and printed 60% for the Writing test this card
   *  calls 83%, on one screen. */
  onScores?: (bySessionId: Record<string, number>) => void
}) {
  const [data, setData] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(
          `/api/study/topic-insights?topicId=${topicId}&lang=${ko ? 'ko' : 'en'}`, { headers })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json() as Insights
        if (!cancelled) {
          setData(json)
          setActive(null)
          onScores?.(Object.fromEntries(json.points.map(p => [p.sessionId, p.percent])))
        }
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // onScores is a fresh closure each render; depending on it would
    // refetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, ko])

  if (loading) {
    return <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4 h-[172px] animate-pulse" />
  }

  const points = data?.points ?? []
  const strengths = data?.mastery?.strengths ?? []
  const weaknesses = data?.mastery?.weaknesses ?? []
  const breakdown = data?.breakdown ?? { groups: [], covered: 0, omitted: 0 }
  const hasBreakdown = breakdown.groups.length >= 2

  // Nothing to say yet. The progress card above already reports the
  // session count, so an empty chart here would only take up room.
  if (points.length === 0 && strengths.length === 0 && weaknesses.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden">
        {points.length > 0 && (
          <TrendChart points={points} ko={ko} active={active} onActive={setActive} />
        )}
        {/* Section bars live inside the trend card, under the line: the
            chart says the score moved, these say which parts moved it.
            Aggregated across the plotted sessions, not the newest one —
            a single 12-question test splits into groups too small to
            report and the card would sit empty. */}
        {hasBreakdown && (
          <div className={`px-4 py-3.5 ${points.length > 0 ? 'border-t border-gray-100 bg-gray-50/40' : ''}`}>
            <SectionBreakdownCard
              breakdown={breakdown} ko={ko} dense
              title={ko ? `영역별 (최근 ${points.length}회 합산)`
                        : `By section · last ${points.length} ${points.length === 1 ? 'test' : 'tests'}`}
            />
          </div>
        )}
      </div>

      <SkillCards
        strengths={strengths}
        weaknesses={weaknesses}
        assessedAt={data?.mastery?.lastAssessedAt ?? null}
        ko={ko}
        onPractice={onPractice}
      />
    </div>
  )
}

function TrendChart({
  points, ko, active, onActive,
}: {
  points: TrendPoint[]
  ko: boolean
  active: number | null
  onActive: (i: number | null) => void
}) {
  const percents = points.map(p => p.percent)
  const { coords, linePath, areaPath, yMin, yMax } = chartGeometry(percents, W, H)
  const delta = trendDelta(points)
  const latest = points[points.length - 1]!
  const shown = points[active ?? points.length - 1]!
  const shownAt = coords[active ?? coords.length - 1]!

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-gray-400">
            {ko ? '점수 추이' : 'Score trend'}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-[22px] font-bold text-gray-900 tabular-nums leading-none">
              {latest.percent}<span className="text-[13px] text-gray-400 font-semibold">%</span>
            </span>
            {latest.band !== null && (
              <span className="text-[11.5px] font-semibold text-gray-500 tabular-nums">
                {ko ? '밴드' : 'band'} {latest.band.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {/* A single session cannot establish a direction, so no chip. */}
        {delta !== null && (
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
            delta > 0 ? 'bg-emerald-50 text-emerald-700'
              : delta < 0 ? 'bg-amber-50 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" />
              : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {delta > 0 ? '+' : ''}{delta}
            <span className="font-medium opacity-70">
              {ko ? `· ${points.length}회` : `· ${points.length} tests`}
            </span>
          </div>
        )}
      </div>

      {/* The plot.
          preserveAspectRatio="none" so the line spans the full card
          width instead of letterboxing into a 300-wide box in the
          middle — the viewBox is a coordinate space here, not a shape.
          The stretch would turn SVG circles into ellipses, so the dots
          and their hit targets are HTML positioned in percent, and the
          strokes carry non-scaling-stroke to survive the same squash. */}
      <div className="relative mt-3 h-[84px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          role="img"
          aria-label={ko
            ? `최근 ${points.length}회 점수 추이, 최신 ${latest.percent}퍼센트`
            : `Score across the last ${points.length} tests, most recent ${latest.percent} percent`}
        >
          {/* Recessive rules at the two ends of the window the line is
              drawn in, so the chart never implies a 0-100 axis it is
              not showing. */}
          {[0.5, H - 0.5].map(y => (
            <line key={y} x1={0} y1={y} x2={W} y2={y}
              className="stroke-gray-100" strokeWidth={1}
              vectorEffect="non-scaling-stroke" />
          ))}
          {areaPath && <path d={areaPath} className="fill-primary/[0.07]" />}
          <path
            d={linePath} fill="none" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-primary"
          />
        </svg>

        {coords.map((c, i) => {
          const isShown = i === (active ?? coords.length - 1)
          const left = `${(c.x / W) * 100}%`
          const top = `${(c.y / H) * 100}%`
          return (
            <button
              key={points[i]!.sessionId}
              type="button"
              // 44px hit target around a 10px dot — a 3.5px SVG circle
              // is not tappable on a phone.
              className="absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{ left, top }}
              onPointerEnter={() => onActive(i)}
              onPointerLeave={() => onActive(null)}
              onClick={() => onActive(i)}
              aria-label={`${formatDay(points[i]!.at, ko)}: ${points[i]!.percent}%`}
            >
              <span className={`block rounded-full border-2 border-primary transition-all ${
                isShown ? 'w-2.5 h-2.5 bg-primary' : 'w-2 h-2 bg-white'
              }`} />
            </button>
          )
        })}

        {/* Direct label on the shown point only — a number on every
            point is noise at this size. Flips side near the edges so it
            never runs outside the card. */}
        <div
          className="absolute -top-1.5 pointer-events-none transition-[left] duration-150"
          style={{
            left: `${(shownAt.x / W) * 100}%`,
            transform: shownAt.x > W * 0.7 ? 'translateX(-100%)'
              : shownAt.x < W * 0.3 ? 'translateX(0)' : 'translateX(-50%)',
          }}
        >
          <div className="rounded-lg bg-gray-900 text-white px-2 py-1 text-[10.5px] font-semibold whitespace-nowrap shadow-sm">
            <span className="tabular-nums">{shown.percent}%</span>
            <span className="opacity-60 font-medium"> · {shown.earned}/{shown.max}</span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-gray-400 tabular-nums">
        {/* One session means both ends are the same date, which reads
            as a rendering bug rather than a one-point chart. */}
        <span>{points.length > 1 ? formatDay(points[0]!.at, ko) : ''}</span>
        {/* Rounded: centring the window on the data yields fractional
            bounds, and "45.5–65.5%" reads as false precision on a chart
            whose points are whole percents. */}
        <span className="text-gray-300">{Math.round(yMin)}–{Math.round(yMax)}%</span>
        <span>{formatDay(latest.at, ko)}</span>
      </div>

      <Link
        href={`/mobile/study/session/${shown.sessionId}/summary`}
        className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:opacity-80"
      >
        <Sparkles className="w-3 h-3" />
        {/* Names the date, because tapping a point retargets this link
            while the big number above keeps showing the LATEST score —
            "Open this test" alone left it unclear which one it meant. */}
        {ko ? `${formatDay(shown.at, ko)} 시험 결과 보기`
            : `Open ${formatDay(shown.at, ko)} test`}
      </Link>
    </div>
  )
}

function formatDay(iso: string, ko: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}
