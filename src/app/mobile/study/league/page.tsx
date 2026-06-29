"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Clock, Crown, Loader2, Sparkles, Camera, ListChecks, Layers, Mic, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyEmptyState, StudySectionHeader as _StudySectionHeader, StudyPageTransition } from '../_shared/primitives'

/**
 * /mobile/study/league — weekly cohort leaderboard.
 *
 * Modeled on Duolingo's 10-tier system (Bronze → Diamond) with
 * Sunday-night UTC resets. v1 displays the current cohort + my rank
 * + top 20 + countdown. Promotion / relegation logic comes when we
 * wire up the Sunday cron.
 */

const TIERS = [
  { key: 'bronze',   label_en: 'Bronze',    label_ko: '브론즈',   color: 'from-amber-700 to-orange-800' },
  { key: 'silver',   label_en: 'Silver',    label_ko: '실버',     color: 'from-slate-400 to-slate-600' },
  { key: 'gold',     label_en: 'Gold',      label_ko: '골드',     color: 'from-amber-400 to-yellow-600' },
  { key: 'sapphire', label_en: 'Sapphire',  label_ko: '사파이어', color: 'from-blue-400 to-blue-700' },
  { key: 'ruby',     label_en: 'Ruby',      label_ko: '루비',     color: 'from-rose-400 to-red-600' },
  { key: 'emerald',  label_en: 'Emerald',   label_ko: '에메랄드', color: 'from-emerald-400 to-green-700' },
  { key: 'amethyst', label_en: 'Amethyst',  label_ko: '자수정',   color: 'from-violet-400 to-purple-700' },
  { key: 'pearl',    label_en: 'Pearl',     label_ko: '진주',     color: 'from-pink-200 to-pink-400' },
  { key: 'obsidian', label_en: 'Obsidian',  label_ko: '흑요석',   color: 'from-gray-700 to-gray-900' },
  { key: 'diamond',  label_en: 'Diamond',   label_ko: '다이아몬드', color: 'from-sky-300 to-cyan-500' },
] as const

interface LeaderboardRow {
  student_id: string
  display_name: string
  xp_this_week: number
  rank: number
  is_me: boolean
}

interface PromotionNotice {
  event: 'promoted' | 'held' | 'demoted'
  fromTier: string
  toTier: string
  finalRank: number
}

interface LeagueData {
  joined: boolean
  tier: string | null
  weekStart: string
  resetSeconds: number
  myRank: number | null
  myXp: number
  leaderboard: LeaderboardRow[]
  promotionNotice?: PromotionNotice | null
}

export default function LeaguePage() {
  return (
    <StudySubscriptionGate>
      <LeagueInner />
    </StudySubscriptionGate>
  )
}

function LeagueInner() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<LeagueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/league', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setData(json as LeagueData)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const tier = TIERS.find(t => t.key === data?.tier) ?? TIERS[0]

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <StudyPageHeader
          icon={Trophy}
          iconColorClass="text-amber-600 bg-amber-50"
          eyebrow={String(t('study.league.eyebrow'))}
          title={String(t('study.league.title'))}
        />
        <div className="px-5 pt-6 pb-14 space-y-6">
        <StudyPageTransition>
        {loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-5 h-40 animate-pulse" />
            <div className="space-y-1.5">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-12 rounded-xl bg-white ring-1 ring-gray-200/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>
        ) : !data?.joined ? (
          <NotJoinedState ko={ko} />
        ) : (
          <>
            {data.promotionNotice && (
              <PromotionBanner notice={data.promotionNotice} ko={ko} />
            )}
            <TierBanner tier={tier} ko={ko} myRank={data.myRank} myXp={data.myXp} resetSeconds={data.resetSeconds} />
            <Leaderboard rows={data.leaderboard} ko={ko} />
            <TierLadder activeKey={data.tier ?? 'bronze'} ko={ko} />
            <EarnXpPanel ko={ko} />
          </>
        )}
        </StudyPageTransition>
        </div>
      </div>
    </div>
  )
}

function TierBanner({ tier, ko, myRank, myXp, resetSeconds }: {
  tier: typeof TIERS[number]; ko: boolean; myRank: number | null; myXp: number; resetSeconds: number
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tier.color} text-white p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.30)]`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.14em] uppercase opacity-85">{ko ? '이번 주 리그' : 'This week'}</div>
          <h2 className="text-2xl font-bold tracking-tight mt-0.5">{ko ? tier.label_ko : tier.label_en}</h2>
        </div>
        <Crown className="w-7 h-7 opacity-90" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-70">{ko ? '내 순위' : 'My rank'}</div>
          <div className="text-2xl font-bold tabular-nums leading-none mt-1">#{myRank ?? '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-70">XP</div>
          <div className="text-2xl font-bold tabular-nums leading-none mt-1">{myXp}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.12em] opacity-70">{ko ? '마감' : 'Resets'}</div>
          <div className="text-[15px] font-semibold leading-none mt-1.5 inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{formatCountdown(resetSeconds, ko)}
          </div>
        </div>
      </div>
    </div>
  )
}

function Leaderboard({ rows, ko }: { rows: LeaderboardRow[]; ko: boolean }) {
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">{ko ? '리더보드' : 'Leaderboard'}</h3>
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.student_id}
            style={{ animationDelay: `${i * 40}ms` }}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl ring-1 animate-card-in opacity-0 ${
              r.is_me
                ? 'bg-amber-50 ring-amber-200'
                : 'bg-white ring-gray-200/70'
            }`}>
            <span className={`flex-shrink-0 w-7 text-center text-[12px] font-bold tabular-nums ${
              r.rank === 1 ? 'text-amber-600' : r.rank === 2 ? 'text-gray-500' : r.rank === 3 ? 'text-orange-600' : 'text-gray-400'
            }`}>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</span>
            <span className={`flex-1 min-w-0 truncate text-[13.5px] ${r.is_me ? 'font-semibold text-amber-900' : 'text-gray-800'}`}>
              {r.display_name}{r.is_me && <span className="text-[10px] font-semibold text-amber-600 ml-1.5">({ko ? '나' : 'me'})</span>}
            </span>
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[12.5px] tabular-nums font-mono text-gray-700">
              <Sparkles className="w-3 h-3 text-amber-500" />{r.xp_this_week}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function TierLadder({ activeKey, ko }: { activeKey: string; ko: boolean }) {
  const activeIdx = TIERS.findIndex(t => t.key === activeKey)
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">{ko ? '리그 단계' : 'Tier ladder'}</h3>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TIERS.map((tier, i) => (
          <div key={tier.key}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition ${
              i === activeIdx
                ? `bg-gradient-to-br ${tier.color} text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]`
                : i < activeIdx
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-white ring-1 ring-gray-200 text-gray-400'
            }`}>
            {ko ? tier.label_ko : tier.label_en}
          </div>
        ))}
      </div>
    </section>
  )
}

function PromotionBanner({ notice, ko }: { notice: PromotionNotice; ko: boolean }) {
  const fromLabel = ko ? TIERS.find(t => t.key === notice.fromTier)?.label_ko : TIERS.find(t => t.key === notice.fromTier)?.label_en
  const toLabel = ko ? TIERS.find(t => t.key === notice.toTier)?.label_ko : TIERS.find(t => t.key === notice.toTier)?.label_en
  const isPromoted = notice.event === 'promoted'
  const isDemoted = notice.event === 'demoted'
  const isHeld = notice.event === 'held'
  const Icon = isPromoted ? TrendingUp : isDemoted ? TrendingDown : Minus
  const gradient = isPromoted
    ? 'from-emerald-500 via-teal-500 to-cyan-600'
    : isDemoted
      ? 'from-rose-500 via-pink-500 to-red-600'
      : 'from-slate-500 via-gray-500 to-zinc-600'
  const headlineKo = isPromoted ? '승급!' : isDemoted ? '강등' : '현 리그 유지'
  const headlineEn = isPromoted ? 'Promoted!' : isDemoted ? 'Demoted' : 'Holding rank'
  const bodyKo = isHeld
    ? `지난주 ${notice.finalRank}위 — ${toLabel}에 머무릅니다.`
    : `지난주 ${notice.finalRank}위 — ${fromLabel} → ${toLabel}`
  const bodyEn = isHeld
    ? `Last week #${notice.finalRank} — staying in ${toLabel}.`
    : `Last week #${notice.finalRank} — ${fromLabel} → ${toLabel}`
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white p-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.30)] animate-card-in opacity-0`}>
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
            {ko ? '지난주 결과' : 'Last week'}
          </div>
          <div className="text-[16px] font-semibold leading-snug mt-0.5">
            {ko ? headlineKo : headlineEn}
          </div>
          <div className="text-[12.5px] opacity-95 mt-0.5 leading-relaxed">
            {ko ? bodyKo : bodyEn}
          </div>
        </div>
      </div>
    </div>
  )
}

function EarnXpPanel({ ko }: { ko: boolean }) {
  const rows = [
    { Icon: ListChecks, xp: 10, label_en: 'Each correct practice answer', label_ko: '연습 문제 정답', href: '/mobile/study' },
    { Icon: Camera, xp: 5, label_en: 'Solve a problem with Snap', label_ko: '사진으로 문제 풀이', href: '/mobile/study/snap' },
    { Icon: Mic, xp: 20, label_en: 'Submit a speaking or writing response', label_ko: '말하기·작문 응답 제출', href: '/mobile/study' },
    { Icon: Layers, xp: 5, label_en: 'Easy flashcard review', label_ko: '플래시카드 쉬움', href: '/mobile/study/review' },
    { Icon: BookOpen, xp: 25, label_en: 'Complete a full study session', label_ko: '학습 세션 완료', href: '/mobile/study' },
  ]
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-2 px-1">{ko ? 'XP 얻는 방법' : 'How to earn XP'}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 overflow-hidden divide-y divide-gray-100">
        {rows.map((r, i) => {
          const Icon = r.Icon
          return (
            <Link key={i} href={r.href}
              className="flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50 transition group">
              <div className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 ring-1 ring-amber-100 text-amber-700">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-[13px] text-gray-800">{ko ? r.label_ko : r.label_en}</div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-bold tabular-nums text-amber-700">
                <Sparkles className="w-3 h-3" />+{r.xp}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function NotJoinedState({ ko }: { ko: boolean }) {
  return (
    <StudyEmptyState
      icon={Trophy}
      iconColorClass="text-amber-600 bg-amber-50"
      headline={ko ? '아직 리그에 참가하지 않았어요' : 'Not in a league yet'}
      body={ko ? '문제를 풀거나 사진으로 풀이를 받으면 XP를 얻고 리그에 자동으로 참가됩니다.' : 'Solve a problem or snap one — you earn XP and join your first league automatically.'}
      ctaHref="/mobile/study"
      ctaText={ko ? '공부 시작' : 'Start studying'}
    />
  )
}

function formatCountdown(seconds: number, ko: boolean): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  if (d >= 1) return ko ? `${d}일 ${h}시간` : `${d}d ${h}h`
  const m = Math.floor((seconds % 3600) / 60)
  return ko ? `${h}시간 ${m}분` : `${h}h ${m}m`
}
