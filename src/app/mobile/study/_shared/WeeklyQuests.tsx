"use client"

import { useEffect, useState } from 'react'
import { Target, Check, Play, ListChecks, CalendarCheck } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Weekly Quests card for the study landing — three fixed goals that reset
 * every Monday. Progress is derived server-side from the week's activity;
 * crossing a quest's line grants a one-time bonus XP (the endpoint reports
 * it as `earnedXp` and we pop the shared XP toast). Self-hides until the
 * data loads so it never flashes an empty shell.
 */

interface QuestState {
  key: string
  target: number
  current: number
  done: boolean
  rewardXp: number
  label_en: string
  label_ko: string
}
interface Payload { resetsAt: string; quests: QuestState[]; earnedXp: number }

/** Per-quest icon + tint + bar color, keyed by quest key (see
 *  lib/study/quests.ts) — three distinct identities instead of the
 *  same target glyph three times. Unknown keys fall back to Target. */
const QUEST_VISUALS: Record<string, { icon: typeof Target; tile: string; bar: string }> = {
  sessions_5: { icon: Play, tile: 'bg-primary/10 text-primary', bar: 'bg-gradient-to-r from-primary to-indigo-500' },
  questions_50: { icon: ListChecks, tile: 'bg-violet-500/12 text-violet-600', bar: 'bg-gradient-to-r from-violet-500 to-purple-500' },
  active_4: { icon: CalendarCheck, tile: 'bg-amber-500/12 text-amber-600', bar: 'bg-gradient-to-r from-amber-400 to-orange-500' },
}
function questVisual(key: string) {
  return QUEST_VISUALS[key] ?? { icon: Target, tile: 'bg-primary/10 text-primary', bar: 'bg-gradient-to-r from-primary to-indigo-500' }
}

function resetLabel(iso: string, ko: boolean): string {
  const ms = Date.parse(iso) - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const days = Math.floor(ms / 86400_000)
  const hours = Math.floor((ms % 86400_000) / 3600_000)
  if (days >= 1) return ko ? `${days}일 후 초기화` : `Resets in ${days}d`
  return ko ? `${hours}시간 후 초기화` : `Resets in ${hours}h`
}

export function WeeklyQuests({ hideHeading = false }: { hideHeading?: boolean } = {}) {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/quests', { headers })
        if (!res.ok) return
        const json = (await res.json()) as Payload
        if (cancelled) return
        setData(json)
        if (json.earnedXp > 0) {
          window.dispatchEvent(new CustomEvent('study:xp', {
            detail: { xp: json.earnedXp, label: ko ? '주간 퀘스트!' : 'Weekly quest!' },
          }))
        }
      } catch { /* self-hides */ }
    })()
    return () => { cancelled = true }
  }, [ko])

  // Quests always render once loaded, so a shimmer here is safe — the
  // card lands with the page instead of popping into the This-week band.
  if (!data) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          {hideHeading ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">
              {ko ? '주간 퀘스트' : 'Quests'}
            </p>
          ) : (
            <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
              {ko ? '주간 퀘스트' : 'Weekly quests'}
            </h2>
          )}
        </div>
        <div className="h-[168px] rounded-2xl bg-gray-200/70 animate-pulse" />
      </section>
    )
  }

  const allDone = data.quests.every(q => q.done)

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        {hideHeading ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gray-500">
            {ko ? '주간 퀘스트' : 'Quests'}
          </p>
        ) : (
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {ko ? '주간 퀘스트' : 'Weekly quests'}
          </h2>
        )}
        <span className="text-[11.5px] font-medium text-gray-400 tabular-nums">
          {resetLabel(data.resetsAt, ko)}
        </span>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] divide-y divide-gray-100 overflow-hidden">
        {data.quests.map(q => {
          const pct = Math.min(100, Math.round((q.current / q.target) * 100))
          const v = questVisual(q.key)
          const Icon = v.icon
          return (
            <div key={q.key} className="px-4 py-3 flex items-center gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                q.done ? 'bg-emerald-50 text-emerald-600' : v.tile
              }`}>
                {q.done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13.5px] font-medium truncate ${q.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {ko ? q.label_ko : q.label_en}
                  </p>
                  <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-gray-400">
                    {q.current}/{q.target}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      q.done ? 'bg-emerald-500' : v.bar
                    }`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
              <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10.5px] font-bold tabular-nums ${
                q.done
                  ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70'
                  : 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-200/60'
              }`}>
                +{q.rewardXp} XP
              </span>
            </div>
          )
        })}
      </div>

      {allDone && (
        <p className="mt-2 px-1 text-[12px] font-medium text-emerald-600">
          {ko ? '🎉 이번 주 퀘스트를 모두 완료했어요!' : '🎉 All quests done for this week!'}
        </p>
      )}
    </section>
  )
}
