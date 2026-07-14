"use client"

import { useEffect, useState } from 'react'
import { Target, Check } from 'lucide-react'
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

  if (!data) return null

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
          return (
            <div key={q.key} className="px-4 py-3 flex items-center gap-3">
              <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                q.done ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'
              }`}>
                {q.done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Target className="w-4 h-4" />}
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
                      q.done ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-indigo-500'
                    }`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
              <span className={`flex-shrink-0 text-[11px] font-bold tabular-nums ${q.done ? 'text-emerald-600' : 'text-gray-400'}`}>
                +{q.rewardXp}
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
