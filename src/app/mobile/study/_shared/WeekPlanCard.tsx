"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Flag } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { sectionVisual } from './sectionVisuals'

/**
 * "This week's plan" (score-plan engine P3). Fetches /api/study/plan and
 * renders the weekly workload + the 2–3 weakest topics to attack first,
 * with a points/week pace line once a goal + diagnostic exist. Self-hides
 * for non-SAT targets and when there's nothing actionable yet.
 */

interface FocusItem { slug: string; name_en: string; name_ko: string; masteryScore: number }
interface Payload {
  supported: boolean
  goalScore: number | null
  weeksToTest: number | null
  weeklyMinutes: number
  weeklySessions: number
  weeklyQuestions: number
  perWeekPoints: number | null
  focus: FocusItem[]
}

export function WeekPlanCard({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/plan', { headers })
        if (!res.ok) return
        const json = (await res.json()) as Payload
        if (!cancelled) setData(json)
      } catch { /* self-hides */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Nothing to show until there's at least a focus topic.
  if (!data || !data.supported || data.focus.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        {hideHeading ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">
            {ko ? '학습 계획' : 'Plan'}
          </p>
        ) : (
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {ko ? '이번 주 학습 계획' : "This week’s plan"}
          </h2>
        )}
        {data.perWeekPoints != null && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary tabular-nums">
            <Flag className="w-3 h-3" />
            {ko ? `주당 +${data.perWeekPoints}점 목표` : `~${data.perWeekPoints} pts/wk`}
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Weekly workload — same quiet system as the hero's TODAY'S
            STUDY card: small-caps label, big number with a colored
            numeral, no icon tiles. */}
        <div className="px-4 py-4 grid grid-cols-3 divide-x divide-gray-100">
          <Stat color="text-primary" value={data.weeklySessions} label={ko ? '세션' : 'SESSIONS'} />
          <Stat color="text-violet-600" value={data.weeklyQuestions} label={ko ? '문항' : 'QUESTIONS'} />
          <Stat color="text-amber-600" value={`${data.weeklyMinutes}${ko ? '분' : 'm'}`} label={ko ? '학습 시간' : 'STUDY'} />
        </div>

        {/* Focus topics — section identity icon + a quiet mastery pill. */}
        <p className="px-4 pt-3 pb-1.5 border-t border-gray-100 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {ko ? '집중 공략' : 'Focus first'}
        </p>
        <div className="divide-y divide-gray-100">
          {data.focus.map(f => {
            const v = sectionVisual(f.slug)
            const Icon = v.icon
            const mastery = Math.max(0, Math.min(100, f.masteryScore))
            return (
              <Link
                key={f.slug}
                href={`/mobile/study/topic/${f.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <span className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${v.gradientTile}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0 text-[13.5px] font-medium text-gray-900 truncate">
                  {ko ? f.name_ko : f.name_en}
                </span>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-semibold tabular-nums text-gray-500">
                  {ko ? `숙련도 ${mastery}` : `${mastery}/100`}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Stat({ color, value, label }: { color: string; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center px-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500">{label}</span>
      <span className={`mt-1 text-[20px] font-bold tabular-nums leading-none ${color}`}>{value}</span>
    </div>
  )
}
