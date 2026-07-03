"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, AlertTriangle, Target, Clock, CheckCircle2, ListChecks, Award, Lock, Sparkles, Flame, ArrowRight, BarChart3 } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonBlock, SkeletonMetricGrid, SkeletonRowList, SkeletonHeader } from '../skeletons'
import { StudyMetric, NumberRoll, StudySubPageHeader } from '../_shared/primitives'

interface Achievement {
  key: string
  unlocked: boolean
  threshold: number
  value: number
}

interface Stats {
  sessionCount: number
  totalAttempts: number
  correct: number
  accuracy: number
  totalHours: number
  last14: Array<{ date: string; count: number }>
  last90?: Array<{ date: string; count: number }>
  /** Full-test score trajectory per section topic — attempts are
   *  oldest→newest, only topics with 2+ completed tests. */
  scoreTrend?: Array<{
    name_en: string
    name_ko: string
    slug: string
    attempts: Array<{ score: number; date: string }>
  }>
  topMastered: Array<{ score: number; attempts_count: number; topic: { name_en: string; name_ko: string; slug: string } | null }>
  topWeak: Array<{ score: number; attempts_count: number; topic: { name_en: string; name_ko: string; slug: string } | null }>
  achievements: Achievement[]
  snapCount?: number
  responseCount?: number
  week?: {
    xp: number
    activeDays: number
    tier: string | null
    rank: number | null
  }
}

/**
 * Study stats dashboard — surfaces lifetime + recent-trend data
 * to give the student a sense of progress over time.
 *
 * Includes: hero metrics row, 14-day question-count sparkline,
 * top mastered + weak topic lists. All data scoped to the caller
 * via /api/study/stats.
 */
export default function StudyStatsPage() {
  return (
    <StudySubscriptionGate>
      <StatsInner />
    </StudySubscriptionGate>
  )
}

function StatsInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/stats', { headers })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setStats(json)
      } catch { /* show empty */ }
    })()
    return () => { cancelled = true }
  }, [])

  if (!stats) {
    // Skeleton mirrors the loaded layout: back link → header →
    // 2x2 metric grid → sparkline card → two row lists. No content
    // shift when stats arrive.
    return (
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-2/3 rounded-lg" />
          <SkeletonBlock className="h-3 w-4/5 rounded-full" />
        </div>
        <SkeletonMetricGrid />
        <div>
          <SkeletonHeader widthClass="w-1/4" />
          <SkeletonBlock className="h-20 w-full rounded-2xl" />
        </div>
        <div>
          <SkeletonHeader widthClass="w-1/3" />
          <SkeletonRowList count={2} />
        </div>
      </div>
    )
  }

  const name = (n: { name_en: string; name_ko: string }) => ko ? n.name_ko : n.name_en

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
      <StudySubPageHeader
        backHref="/mobile/study"
        backLabel={String(t('study.topic.backToStudy'))}
        icon={BarChart3}
        eyebrow={ko ? '학습' : 'Study'}
        title={String(t('study.stats.title'))}
        subtitle={String(t('study.stats.subtitle'))}
      />

      {/* This week — XP + active days + league rank. Visible only
          when the student has done something this week. */}
      {stats.week && (stats.week.xp > 0 || stats.week.activeDays > 0) && (
        <WeekCard week={stats.week} ko={ko} t={t} />
      )}

      {/* Hero stats — 2x2 grid (lifetime) — using shared StudyMetric */}
      <div className="grid grid-cols-2 gap-3">
        <StudyMetric icon={ListChecks} value={stats.totalAttempts} label={String(t('study.stats.totalQuestions'))} accent="primary" />
        <StudyMetric icon={CheckCircle2} value={stats.accuracy} suffix="%" label={String(t('study.stats.accuracy'))} accent="emerald" />
        <StudyMetric icon={Clock} value={stats.totalHours} suffix="h" label={String(t('study.stats.totalHours'))} accent="amber" />
        <StudyMetric icon={Target} value={stats.sessionCount} label={String(t('study.stats.sessions'))} accent="violet" />
      </div>

      {/* Secondary lifetime counters — snap solves + response submissions.
          Self-hide when both are 0 so brand-new users don't see empty rows. */}
      {((stats.snapCount ?? 0) + (stats.responseCount ?? 0)) > 0 && (
        <div className="grid grid-cols-2 gap-3 -mt-1">
          <MiniMetric label={ko ? '사진 풀이' : 'Snap solves'} value={stats.snapCount ?? 0} />
          <MiniMetric label={ko ? '말하기·작문 제출' : 'Responses graded'} value={stats.responseCount ?? 0} />
        </div>
      )}

      {/* Score trajectory — per-section test scores over time.
          Only shows once a section has 2+ completed tests. */}
      {stats.scoreTrend && stats.scoreTrend.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {ko ? '점수 추이' : 'Score trend'}
          </h2>
          <div className="space-y-2">
            {stats.scoreTrend.map((row) => (
              <ScoreTrendRow key={row.slug} row={row} ko={ko} />
            ))}
          </div>
        </section>
      )}

      {/* 14-day sparkline */}
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
          {String(t('study.stats.last14days'))}
        </h2>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <Sparkline data={stats.last14} />
        </div>
      </section>

      {/* 90-day activity heatmap — GitHub-style consistency view. */}
      {stats.last90 && stats.last90.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {ko ? '최근 90일' : 'Last 90 days'}
          </h2>
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <ActivityHeatmap data={stats.last90} ko={ko} />
          </div>
        </section>
      )}

      {/* Achievements — unlock badges from existing stats data, no
          new schema. Sorted by unlocked first, then locked greyed-out
          so the student can see what's next to chase. */}
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3 inline-flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          {String(t('study.stats.achievementsTitle'))}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[...stats.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map((a, i) => (
            <div key={a.key} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }} className="animate-card-in opacity-0">
              <AchievementBadge achievement={a} t={t} />
            </div>
          ))}
        </div>
      </section>

      {/* Top mastered */}
      {stats.topMastered.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3 inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-600" />
            {String(t('study.stats.topMastered'))}
          </h2>
          <div className="space-y-2">
            {stats.topMastered.map((row, i) => row.topic && (
              <Link
                key={i}
                href={`/mobile/study/topic/${row.topic.slug}`}
                className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/60 to-white ring-1 ring-emerald-200/60 hover:ring-emerald-300 transition-all"
              >
                <span className="text-[14px] font-semibold text-gray-900">{name(row.topic)}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-white/80 ring-1 ring-emerald-200 rounded-full px-2 py-0.5">
                  {row.score}/100
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Weak areas */}
      {stats.topWeak.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3 inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {String(t('study.stats.topWeak'))}
          </h2>
          <div className="space-y-2">
            {stats.topWeak.map((row, i) => row.topic && (
              <Link
                key={i}
                href={`/mobile/study/topic/${row.topic.slug}`}
                className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-br from-amber-50/60 to-white ring-1 ring-amber-200/60 hover:ring-amber-300 transition-all"
              >
                <span className="text-[14px] font-semibold text-gray-900">{name(row.topic)}</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-white/80 ring-1 ring-amber-200 rounded-full px-2 py-0.5">
                  {row.score}/100
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** One section's score-over-time row: name + first→latest delta badge
 *  on the left, a compact SVG line chart of the last ≤10 test scores
 *  on the right. Taps through to the section's topic page. */
function ScoreTrendRow({ row, ko }: {
  row: { name_en: string; name_ko: string; slug: string; attempts: Array<{ score: number; date: string }> }
  ko: boolean
}) {
  const scores = row.attempts.map(a => a.score)
  const first = scores[0]!
  const latest = scores[scores.length - 1]!
  const delta = latest - first
  const up = delta > 0
  const flat = delta === 0

  // Line chart: fixed 0-100 y-domain so the line's absolute height is
  // meaningful across sections (a 90% line sits visibly higher than a
  // 40% one), x spread evenly across attempts.
  const W = 120, H = 40, PAD = 4
  const stepX = scores.length > 1 ? (W - PAD * 2) / (scores.length - 1) : 0
  const pointAt = (s: number, i: number): [number, number] => [
    PAD + i * stepX,
    PAD + (1 - s / 100) * (H - PAD * 2),
  ]
  const points = scores.map((s, i) => pointAt(s, i))
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]!

  return (
    <Link
      href={`/mobile/study/topic/${row.slug}`}
      className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white ring-1 ring-gray-200/60 hover:ring-gray-300 transition-all"
    >
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-gray-900 truncate">
          {ko ? row.name_ko : row.name_en}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[12px] tabular-nums">
          <span className="text-gray-500">{first}%</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-gray-900">{latest}%</span>
          <span className={`ml-1 font-semibold ${
            up ? 'text-emerald-600' : flat ? 'text-gray-400' : 'text-rose-500'
          }`}>
            {up ? '+' : ''}{delta}
          </span>
          <span className="text-gray-400">
            · {ko ? `${scores.length}회` : `${scores.length} tests`}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] h-10 flex-shrink-0" aria-hidden>
        <path d={path} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={up ? 'stroke-emerald-500' : flat ? 'stroke-gray-300' : 'stroke-rose-400'} />
        <circle cx={lastX} cy={lastY} r="3"
          className={up ? 'fill-emerald-500' : flat ? 'fill-gray-400' : 'fill-rose-400'} />
      </svg>
    </Link>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200/60 px-3.5 py-2.5 flex items-center justify-between">
      <span className="text-[12px] text-gray-600">{label}</span>
      <span className="text-[15px] font-bold tabular-nums text-gray-900">
        <NumberRoll target={value} />
      </span>
    </div>
  )
}

// MetricCard + NumberRoll were inlined here originally; both moved to
// _shared/primitives.tsx as StudyMetric + NumberRoll. Local copies
// removed — imports added at top of file.

const TIER_LABEL_KO: Record<string, string> = {
  bronze: '브론즈', silver: '실버', gold: '골드', sapphire: '사파이어', ruby: '루비',
  emerald: '에메랄드', amethyst: '자수정', pearl: '진주', obsidian: '흑요석', diamond: '다이아몬드',
}
const TIER_LABEL_EN: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', sapphire: 'Sapphire', ruby: 'Ruby',
  emerald: 'Emerald', amethyst: 'Amethyst', pearl: 'Pearl', obsidian: 'Obsidian', diamond: 'Diamond',
}

function WeekCard({ week, ko, t }: {
  week: { xp: number; activeDays: number; tier: string | null; rank: number | null }
  ko: boolean
  t: ReturnType<typeof useTranslation>['t']
}) {
  const tierLabel = week.tier ? (ko ? TIER_LABEL_KO[week.tier] : TIER_LABEL_EN[week.tier]) : null
  return (
    <Link href="/mobile/study/league"
      className="group block rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-4 shadow-[0_8px_24px_-8px_rgba(251,146,60,0.40)] hover:shadow-[0_12px_32px_-8px_rgba(251,146,60,0.55)] hover:-translate-y-0.5 transition-all overflow-hidden relative">
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
          {ko ? '이번 주' : 'This week'}
        </div>
        <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="relative grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-80 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />XP
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none mt-1">
            <NumberRoll target={week.xp} />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-80 inline-flex items-center gap-1">
            <Flame className="w-3 h-3" />{ko ? '활동일' : 'Active'}
          </div>
          <div className="text-2xl font-bold tabular-nums leading-none mt-1">
            <NumberRoll target={week.activeDays} />
            <span className="text-[14px] font-medium opacity-80 ml-0.5">/7</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-80 inline-flex items-center gap-1">
            <Trophy className="w-3 h-3" />{ko ? '리그' : 'League'}
          </div>
          {tierLabel && week.rank ? (
            <div className="leading-tight mt-1">
              <div className="text-[15px] font-semibold">{tierLabel}</div>
              <div className="text-[11px] opacity-90 tabular-nums">#{week.rank}</div>
            </div>
          ) : (
            <div className="text-[13px] opacity-85 mt-1">{ko ? '미참가' : 'Not joined'}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

/** Single achievement badge — gradient gold when unlocked, gray + lock
 *  icon when locked. Always shows the threshold so the student sees
 *  what's needed to unlock. */
function AchievementBadge({ achievement, t }: { achievement: Achievement; t: ReturnType<typeof useTranslation>['t'] }) {
  const { key, unlocked, threshold, value } = achievement
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-3 flex items-start gap-2.5 transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-amber-50 via-orange-50/60 to-white ring-1 ring-amber-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_12px_-4px_rgba(245,158,11,0.18)]'
          : 'bg-white ring-1 ring-gray-200/60'
      }`}
    >
      {unlocked && (
        <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-16 h-16 rounded-full bg-amber-200/30 blur-2xl" />
      )}
      <div className={`relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${
        unlocked
          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white ring-amber-600/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_4px_rgba(245,158,11,0.25)]'
          : 'bg-gray-100 text-gray-300 ring-gray-200'
      }`}>
        {unlocked ? <Award className="w-4 h-4" fill="currentColor" /> : <Lock className="w-3.5 h-3.5" />}
      </div>
      <div className="relative flex-1 min-w-0">
        <div className={`text-[12.5px] font-semibold leading-tight ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {String(t(`study.achievements.${key}.title`))}
        </div>
        <div className={`text-[10.5px] mt-0.5 leading-snug ${unlocked ? 'text-amber-700/90 font-medium' : 'text-gray-400'}`}>
          {unlocked
            ? String(t(`study.achievements.${key}.unlocked`))
            : String(t(`study.achievements.${key}.locked`, { value: String(value), threshold: String(threshold) }))}
        </div>
      </div>
    </div>
  )
}

/** Minimal SVG sparkline — 14 vertical bars, height scaled by count. */
/** ActivityHeatmap — GitHub-style 13-week × 7-day grid. Tap a cell to
 *  see that day's date + attempt count in a small inline detail strip
 *  below the grid. */
function ActivityHeatmap({ data, ko }: { data: Array<{ date: string; count: number }>; ko: boolean }) {
  const today = new Date()
  const todayDow = today.getDay()
  const totalCells = 13 * 7
  const firstCellOffset = totalCells - 1 - todayDow
  const byDate = new Map<string, number>()
  for (const d of data) byDate.set(d.date, d.count)
  const peak = Math.max(1, ...data.map(d => d.count))

  const cells: Array<{ date: string; count: number; inRange: boolean }> = []
  for (let i = 0; i < totalCells; i++) {
    const offset = firstCellOffset - i
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const inRange = offset >= 0 && offset < 90
    cells.push({ date: key, count: byDate.get(key) ?? 0, inRange })
  }

  const intensityClass = (count: number, inRange: boolean) => {
    if (!inRange) return 'bg-gray-50'
    if (count === 0) return 'bg-gray-100'
    const r = count / peak
    if (r < 0.25) return 'bg-primary/20'
    if (r < 0.50) return 'bg-primary/40'
    if (r < 0.75) return 'bg-primary/65'
    return 'bg-primary'
  }

  // Selected cell — defaults to today (the most-recent in-range cell).
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [selectedDate, setSelectedDate] = useState<string>(todayKey)
  const selected = cells.find(c => c.date === selectedDate) ?? cells[cells.length - 1]
  const selectedCount = selected.count
  // Friendly date formatter for the detail strip.
  const dateLabel = (key: string): string => {
    const [y, m, d] = key.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (key === todayKey) return ko ? '오늘' : 'Today'
    return dt.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })
  }

  return (
    <div>
      <div className="grid grid-cols-13 grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))', gridAutoFlow: 'column' }}>
        {cells.map((cell, i) => {
          const isSelected = cell.date === selectedDate && cell.inRange
          return (
            <button
              type="button"
              key={i}
              onClick={() => cell.inRange && setSelectedDate(cell.date)}
              disabled={!cell.inRange}
              title={`${cell.date} — ${cell.count} ${ko ? '문항' : 'attempts'}`}
              aria-label={`${cell.date}, ${cell.count}`}
              className={`aspect-square rounded-[3px] ${intensityClass(cell.count, cell.inRange)} ${
                isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
              } ${cell.inRange ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity`}
            />
          )
        })}
      </div>
      {/* Detail strip — date + count of the selected cell. */}
      <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
        <div className="text-gray-700">
          <span className="font-semibold">{dateLabel(selected.date)}</span>
          <span className="text-gray-500 mx-1.5">·</span>
          <span className="tabular-nums">{selectedCount}</span> <span className="text-gray-500">{ko ? '문항' : selectedCount === 1 ? 'attempt' : 'attempts'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>{ko ? '적게' : 'Less'}</span>
          <div className="w-2.5 h-2.5 rounded-[3px] bg-gray-100" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/20" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/40" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/65" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-primary" />
          <span>{ko ? '많이' : 'More'}</span>
        </div>
      </div>
    </div>
  )
}

function Sparkline({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const BAR_W = 14
  const GAP = 4
  const HEIGHT = 60
  const totalW = data.length * BAR_W + (data.length - 1) * GAP
  return (
    <svg viewBox={`0 0 ${totalW} ${HEIGHT}`} className="w-full h-16">
      {data.map((d, i) => {
        const h = (d.count / max) * (HEIGHT - 4) + 2
        const x = i * (BAR_W + GAP)
        const y = HEIGHT - h
        return (
          <rect
            key={d.date}
            x={x}
            y={y}
            width={BAR_W}
            height={h}
            rx="3"
            className={d.count === 0 ? 'fill-gray-200' : 'fill-primary'}
          />
        )
      })}
    </svg>
  )
}
