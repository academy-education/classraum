"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trophy, AlertTriangle, Target, Clock, CheckCircle2, ListChecks, Award, Lock } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { SkeletonBlock, SkeletonMetricGrid, SkeletonRowList, SkeletonHeader } from '../skeletons'

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
  topMastered: Array<{ score: number; attempts_count: number; topic: { name_en: string; name_ko: string; slug: string } | null }>
  topWeak: Array<{ score: number; attempts_count: number; topic: { name_en: string; name_ko: string; slug: string } | null }>
  achievements: Achievement[]
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
      <div className="px-5 pt-6 pb-14 space-y-6">
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
    <div className="px-5 pt-6 pb-14 space-y-6">
      <Link
        href="/mobile/study/preferences"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors -ml-1 px-1 py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.prefs.title')}
      </Link>

      <header>
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight text-gray-900">
          {String(t('study.stats.title'))}
        </h1>
        <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
          {String(t('study.stats.subtitle'))}
        </p>
      </header>

      {/* Hero stats — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={ListChecks} value={String(stats.totalAttempts)} label={String(t('study.stats.totalQuestions'))} accent="from-primary to-indigo-600" tint="from-primary/[0.06]" />
        <MetricCard icon={CheckCircle2} value={`${stats.accuracy}%`} label={String(t('study.stats.accuracy'))} accent="from-emerald-500 to-teal-600" tint="from-emerald-50/60" />
        <MetricCard icon={Clock} value={`${stats.totalHours}h`} label={String(t('study.stats.totalHours'))} accent="from-amber-400 to-orange-500" tint="from-amber-50/60" />
        <MetricCard icon={Target} value={String(stats.sessionCount)} label={String(t('study.stats.sessions'))} accent="from-violet-400 to-purple-600" tint="from-violet-50/60" />
      </div>

      {/* 14-day sparkline */}
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
          {String(t('study.stats.last14days'))}
        </h2>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <Sparkline data={stats.last14} />
        </div>
      </section>

      {/* Achievements — unlock badges from existing stats data, no
          new schema. Sorted by unlocked first, then locked greyed-out
          so the student can see what's next to chase. */}
      <section>
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3 inline-flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          {String(t('study.stats.achievementsTitle'))}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[...stats.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)).map(a => (
            <AchievementBadge key={a.key} achievement={a} t={t} />
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

function MetricCard({ icon: Icon, value, label, accent, tint }: {
  icon: typeof CheckCircle2; value: string; label: string; accent: string; tint: string
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tint} via-white to-white ring-1 ring-gray-200/60 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]`}>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-b ${accent} text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,0,0,0.08)] mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[24px] font-bold tracking-tight text-gray-900 leading-none">{value}</div>
      <div className="text-[11.5px] font-medium uppercase tracking-[0.10em] text-gray-500 mt-1">{label}</div>
    </div>
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
