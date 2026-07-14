"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, ChevronRight, Clock, ListChecks, Flag } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

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
        {/* Weekly workload */}
        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
          <Stat icon={ListChecks} value={data.weeklySessions} label={ko ? '세션' : 'sessions'} />
          <Stat icon={CalendarCheck} value={data.weeklyQuestions} label={ko ? '문항' : 'questions'} />
          <Stat icon={Clock} value={`${data.weeklyMinutes}${ko ? '분' : 'm'}`} label={ko ? '학습' : 'study'} />
        </div>

        {/* Focus topics */}
        <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          {ko ? '집중 공략' : 'Focus first'}
        </p>
        <div className="divide-y divide-gray-100">
          {data.focus.map(f => (
            <Link
              key={f.slug}
              href={`/mobile/study/topic/${f.slug}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-[12px] font-bold tabular-nums">
                {f.masteryScore}
              </span>
              <span className="flex-1 min-w-0 text-[13.5px] font-medium text-gray-900 truncate">
                {ko ? f.name_ko : f.name_en}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ icon: Icon, value, label }: { icon: typeof ListChecks; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="w-4 h-4 text-gray-400 mb-1" />
      <span className="text-[17px] font-bold tabular-nums text-gray-900 leading-none">{value}</span>
      <span className="text-[10.5px] text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}
