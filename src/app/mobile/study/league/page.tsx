"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Clock, Crown, Sparkles, Camera, ListChecks, Layers, Mic, BookOpen, TrendingUp, TrendingDown, Minus, Users, UserPlus, Award, Diamond, Shield, Confetti, Check } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { validateNickname, NICKNAME_MAX } from '@/lib/study/nickname'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyEmptyState, StudySectionHeader as _StudySectionHeader, StudyPageTransition, StudyScrollShell } from '../_shared/primitives'
import { SkeletonCard, SkeletonBlock, SkeletonRowList } from '../skeletons'
import { SegmentedTabs } from '../_shared/SegmentedTabs'
import { StudyButton, studyButtonClass } from '@/app/mobile/study/_shared/StudyButton'

/**
 * /mobile/study/league — weekly cohort leaderboard.
 *
 * Modeled on Duolingo's 10-tier system (Bronze → Diamond) with
 * Sunday-night UTC resets. v1 displays the current cohort + my rank
 * + top 20 + countdown. Promotion / relegation logic comes when we
 * wire up the Sunday cron.
 */

// Per-tier emblem icons: medals for the entry metals, a trophy for Gold,
// gems for the jewel tiers, a shield for Obsidian, and the crown only at
// the top — the emblem should feel like climbing, not the same crown
// on every rung.
const TIERS = [
  { key: 'bronze',   label_en: 'Bronze',    label_ko: '브론즈',   color: 'from-amber-700 to-orange-800', Icon: Award },
  { key: 'silver',   label_en: 'Silver',    label_ko: '실버',     color: 'from-slate-400 to-slate-600', Icon: Award },
  { key: 'gold',     label_en: 'Gold',      label_ko: '골드',     color: 'from-amber-400 to-yellow-600', Icon: Trophy },
  { key: 'sapphire', label_en: 'Sapphire',  label_ko: '사파이어', color: 'from-blue-400 to-blue-700', Icon: Diamond },
  { key: 'ruby',     label_en: 'Ruby',      label_ko: '루비',     color: 'from-rose-400 to-red-600', Icon: Diamond },
  { key: 'emerald',  label_en: 'Emerald',   label_ko: '에메랄드', color: 'from-emerald-400 to-green-700', Icon: Diamond },
  { key: 'amethyst', label_en: 'Amethyst',  label_ko: '자수정',   color: 'from-violet-400 to-purple-700', Icon: Diamond },
  { key: 'pearl',    label_en: 'Pearl',     label_ko: '진주',     color: 'from-pink-200 to-pink-400', Icon: Sparkles },
  { key: 'obsidian', label_en: 'Obsidian',  label_ko: '흑요석',   color: 'from-gray-700 to-gray-900', Icon: Shield },
  { key: 'diamond',  label_en: 'Diamond',   label_ko: '다이아몬드', color: 'from-sky-300 to-cyan-500', Icon: Crown },
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
  myNickname?: string | null
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
  // Fetch failure must NOT render as "not in a league yet" — a ranked
  // student would see their placement apparently gone.
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Callable so both the mount effect and pull-to-refresh can trigger it;
  // pull-to-refresh awaits it so the spinner holds until the data lands.
  const load = useCallback(async () => {
    setLoadFailed(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/league', { headers })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json as LeagueData)
    } catch {
      setData(null); setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load, retryKey])

  const tier = TIERS.find(t => t.key === data?.tier) ?? TIERS[0]

  // League vs Friends view. Deep-linkable via ?view=friends (the friends
  // page links here) so "Friends leaderboard" lands on the right tab.
  const [view, setView] = useState<'league' | 'friends'>('league')
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('view') === 'friends') setView('friends')
  }, [])

  return (
    <StudyScrollShell
      onRefresh={load}
      header={
        <StudyPageHeader
          icon={Trophy}
          iconColorClass="text-amber-600 bg-amber-50"
          eyebrow={String(t('study.league.eyebrow'))}
          title={String(t('study.league.title'))}
        />
      }
      contentClassName="max-w-3xl lg:max-w-6xl 2xl:max-w-[1600px] mx-auto px-5 lg:px-8 pt-6 pb-14"
    >
        <div className="mb-5">
          <SegmentedTabs
            options={[
              { value: 'league', label: ko ? '리그' : 'League' },
              { value: 'friends', label: ko ? '친구' : 'Friends' },
            ]}
            value={view}
            onChange={(v) => setView(v as 'league' | 'friends')}
          />
        </div>
        {view === 'friends' ? (
          <StudyPageTransition><FriendsLeaderboardView ko={ko} /></StudyPageTransition>
        ) : (!loading && !loadFailed && data && !data.myNickname) ? (
          <StudyPageTransition><NicknameJoinGate ko={ko} onConfirmed={() => { setLoading(true); setRetryKey(k => k + 1) }} /></StudyPageTransition>
        ) : (!loading && !loadFailed && !data?.joined) ? (
          <NotJoinedState ko={ko} />
        ) : (
        <StudyPageTransition>
        {loading ? (
          <div className="space-y-6">
            <SkeletonCard className="p-5 min-h-[160px]">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <SkeletonBlock className="h-2.5 w-20 rounded-full" />
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                </div>
                <SkeletonBlock className="w-8 h-8 rounded-xl" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[0,1,2].map(i => (
                  <div key={i} className="space-y-2">
                    <SkeletonBlock className="h-2 w-3/5 rounded-full" />
                    <SkeletonBlock className="h-6 w-4/5 rounded-full" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
            <SkeletonRowList count={5} />
          </div>
        ) : loadFailed ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
            <p className="text-[13.5px] text-gray-600">
              {ko ? '리그 정보를 불러오지 못했어요.' : "We couldn't load your league."}
            </p>
            <StudyButton
              type="button"
              size="sm"
              onClick={() => { setLoading(true); setRetryKey(k => k + 1) }}
            >
              {ko ? '다시 시도' : 'Retry'}
            </StudyButton>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {data.promotionNotice && (
              <PromotionBanner notice={data.promotionNotice} ko={ko} />
            )}
            <TierBanner tier={tier} ko={ko} myRank={data.myRank} myXp={data.myXp} resetSeconds={data.resetSeconds} />
            <Leaderboard rows={data.leaderboard} ko={ko} />
            <TierLadder activeKey={data.tier ?? 'bronze'} ko={ko} />
            <EarnXpPanel ko={ko} />
          </div>
        ) : null}
        </StudyPageTransition>
        )}
    </StudyScrollShell>
  )
}

/** Nickname confirmation gate — a student must confirm a public handle
 *  before joining the league board (otherwise they'd appear under a masked
 *  real name). Shown whenever the caller has no nickname set; on success it
 *  reloads the league so the gate falls away. */
function NicknameJoinGate({ ko, onConfirmed }: { ko: boolean; onConfirmed: () => void }) {
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced availability check as the user types.
  useEffect(() => {
    const raw = value.trim()
    if (!raw) { setStatus('idle'); return }
    if (validateNickname(raw)) { setStatus('invalid'); return }
    setStatus('checking')
    const handle = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/nickname?check=${encodeURIComponent(raw)}`, { headers })
        const json = await res.json()
        setStatus(json.available ? 'available' : (json.reason === 'taken' ? 'taken' : 'invalid'))
      } catch { setStatus('idle') }
    }, 350)
    return () => clearTimeout(handle)
  }, [value])

  const confirm = async () => {
    setError(null); setSaving(true)
    try {
      const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' }
      const res = await fetch('/api/study/nickname', { method: 'PUT', headers, body: JSON.stringify({ nickname: value.trim() }) })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.code === 'taken'
          ? (ko ? '이미 사용 중인 닉네임이에요.' : 'That nickname is taken.')
          : (ko ? '닉네임을 저장하지 못했어요.' : "Couldn't save your nickname."))
        setSaving(false)
        return
      }
      onConfirmed()
    } catch {
      setError(ko ? '닉네임을 저장하지 못했어요.' : "Couldn't save your nickname.")
      setSaving(false)
    }
  }

  const canConfirm = status === 'available' && !saving

  return (
    <div className="rounded-3xl bg-white ring-1 ring-gray-200/70 px-5 py-7 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
        <Trophy className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="mt-4 text-[17px] font-bold text-gray-900">
        {ko ? '리그에 참가하려면 닉네임을 확인하세요' : 'Confirm your nickname to join the league'}
      </h3>
      <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed max-w-xs mx-auto">
        {ko ? '순위표에 표시될 공개 닉네임이에요. 한 번 정하면 나중에 한 번만 바꿀 수 있어요.'
            : "This is the public handle shown on the leaderboard. You can change it once later."}
      </p>
      <div className="mt-5 max-w-xs mx-auto text-left">
        <div className="relative">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={NICKNAME_MAX}
            placeholder={ko ? '닉네임' : 'Nickname'}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-[14px] text-gray-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
          />
          {status === 'available' && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" weight="bold" />
          )}
        </div>
        <div className="mt-1.5 min-h-[16px] text-[11.5px]">
          {status === 'checking' && <span className="text-gray-400">{ko ? '확인 중…' : 'Checking…'}</span>}
          {status === 'available' && <span className="text-emerald-600">{ko ? '사용 가능해요' : 'Available'}</span>}
          {status === 'taken' && <span className="text-rose-500">{ko ? '이미 사용 중이에요' : 'Already taken'}</span>}
          {status === 'invalid' && <span className="text-rose-500">{ko ? '2–16자, 문자·숫자·밑줄만' : '2–16 characters, letters/numbers/underscore'}</span>}
        </div>
      </div>
      {error && <p className="mt-1 text-[12px] text-rose-500">{error}</p>}
      <div className="mt-4 max-w-xs mx-auto">
        <StudyButton type="button" onClick={confirm} disabled={!canConfirm} className="w-full justify-center">
          {saving ? (ko ? '참가하는 중…' : 'Joining…') : (ko ? '확인하고 참가하기' : 'Confirm & join')}
        </StudyButton>
      </div>
    </div>
  )
}

/** Friends leaderboard — you + accepted friends ranked by this week's XP.
 *  Reuses the league row visuals; empty state routes into adding friends. */
function FriendsLeaderboardView({ ko }: { ko: boolean }) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/friends/leaderboard', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setRows(json.rows as LeaderboardRow[])
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => { cancelled = true }
  }, [retryKey])

  const manageBtn = (
    <Link href="/mobile/study/friends"
      className={studyButtonClass({ size: 'sm' })}>
      <UserPlus className="w-3.5 h-3.5" />{ko ? '친구 관리' : 'Manage friends'}
    </Link>
  )

  if (failed) {
    return (
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
        <p className="text-[13.5px] text-gray-600">{ko ? '친구 순위를 불러오지 못했어요.' : "Couldn't load the friends leaderboard."}</p>
        <StudyButton type="button" size="sm" onClick={() => setRetryKey(k => k + 1)}>
          {ko ? '다시 시도' : 'Retry'}
        </StudyButton>
      </div>
    )
  }
  if (!rows) return <SkeletonRowList count={4} />

  // Only the caller present → no friends yet.
  if (rows.length <= 1) {
    return (
      <StudyEmptyState
        icon={Users}
        iconColorClass="text-amber-600 bg-amber-50"
        headline={ko ? '친구를 추가해 경쟁하세요' : 'Add friends to compete'}
        body={ko ? '친구와 이번 주 XP를 겨뤄보세요.' : "Race your friends on this week's XP."}
        ctaHref="/mobile/study/friends"
        ctaText={ko ? '친구 관리' : 'Manage friends'}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-semibold text-gray-900">{ko ? '이번 주 친구 순위' : "Friends · this week"}</h3>
        {manageBtn}
      </div>
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.student_id}
            style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            className={`flex items-center gap-3 pl-2 pr-3.5 py-2.5 rounded-xl ring-1 animate-card-in opacity-0 ${
              r.is_me ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-gray-200/70'
            }`}>
            <span className={`flex-shrink-0 w-6 text-center text-[13px] font-bold tabular-nums ${r.rank === 1 ? 'text-amber-500' : 'text-gray-400'}`}>{r.rank}</span>
            <span className={`flex-shrink-0 w-8 h-8 rounded-full ${hueOf(r.student_id)} flex items-center justify-center text-[11px] font-bold`}>
              {initialsOf(r.display_name)}
            </span>
            <span className={`flex-1 min-w-0 truncate text-[13.5px] ${r.is_me ? 'font-semibold text-amber-900' : 'text-gray-800'}`}>
              {r.display_name}{r.is_me && <span className="text-[10px] font-semibold text-amber-600 ml-1.5">({ko ? '나' : 'me'})</span>}
            </span>
            {r.rank === 1 && r.xp_this_week > 0 && <Crown className="flex-shrink-0 w-3.5 h-3.5 text-amber-400" />}
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[12.5px] tabular-nums font-semibold text-gray-700">
              <Sparkles className="w-3 h-3 text-amber-500" />{r.xp_this_week}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Top 5 of each cohort advance to the next tier each week (Duolingo-style).
const PROMOTE_ZONE = 5

/** Deterministic initials + a stable hue from a display name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
const AVATAR_HUES = ['bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-cyan-100 text-cyan-700', 'bg-fuchsia-100 text-fuchsia-700', 'bg-indigo-100 text-indigo-700']
function hueOf(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_HUES[h % AVATAR_HUES.length]
}

function TierBanner({ tier, ko, myRank, myXp, resetSeconds }: {
  tier: typeof TIERS[number]; ko: boolean; myRank: number | null; myXp: number; resetSeconds: number
}) {
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const inPromo = myRank != null && myRank <= PROMOTE_ZONE
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tier.color} text-white p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.40)]`}>
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-6 w-36 h-36 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        {/* Tier emblem */}
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm flex items-center justify-center shadow-inner">
          <tier.Icon className="w-8 h-8 drop-shadow" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-[0.16em] uppercase opacity-85">{ko ? '이번 주 리그' : 'This week · League'}</div>
          <h2 className="text-[26px] font-bold tracking-tight leading-none mt-1">{ko ? tier.label_ko : tier.label_en}</h2>
          {next && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium opacity-90">
              <TrendingUp className="w-3 h-3" />
              {ko ? `상위 ${PROMOTE_ZONE}위 → ${next.label_ko} 승급` : `Top ${PROMOTE_ZONE} advance to ${next.label_en}`}
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-3 gap-2">
        {[
          { label: ko ? '내 순위' : 'My rank', node: <span className="tabular-nums">#{myRank ?? '—'}</span> },
          { label: 'XP', node: <span className="tabular-nums">{myXp}</span> },
          { label: ko ? '마감' : 'Resets', node: <span className="inline-flex items-center gap-1 text-[15px]"><Clock className="w-3.5 h-3.5" />{formatCountdown(resetSeconds, ko)}</span> },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl bg-white/12 ring-1 ring-white/15 px-3 py-2.5">
            <div className="text-[9.5px] uppercase tracking-[0.12em] opacity-70">{s.label}</div>
            <div className="text-[22px] font-bold leading-none mt-1">{s.node}</div>
          </div>
        ))}
      </div>
      {myRank != null && (
        <div className={`relative mt-3 rounded-xl px-3 py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 ${inPromo ? 'bg-emerald-400/25 ring-1 ring-emerald-200/40' : 'bg-white/12 ring-1 ring-white/15'}`}>
          {inPromo && <Confetti weight="fill" className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{inPromo
            ? (ko ? '승급권 안에 있어요 — 계속 유지하세요!' : "You're in the promotion zone — hold your spot!")
            : (ko ? `승급권까지 ${Math.max(0, myRank - PROMOTE_ZONE)}계단 남았어요` : `${Math.max(0, myRank - PROMOTE_ZONE)} spots from the promotion zone`)}</span>
        </div>
      )}
    </div>
  )
}

function Podium({ top, ko }: { top: LeaderboardRow[]; ko: boolean }) {
  // Visual order 2 · 1 · 3 with descending heights.
  const order = [top[1], top[0], top[2]].filter(Boolean)
  const meta: Record<number, { h: string; ring: string; badge: string; medal: string }> = {
    1: { h: 'h-20', ring: 'ring-amber-300', badge: 'bg-amber-400 text-amber-950', medal: '🥇' },
    2: { h: 'h-16', ring: 'ring-slate-300', badge: 'bg-slate-300 text-slate-800', medal: '🥈' },
    3: { h: 'h-14', ring: 'ring-orange-300', badge: 'bg-orange-400 text-orange-950', medal: '🥉' },
  }
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{ko ? '이번 주 톱3' : 'Top 3 this week'}</h3>
      <div className="grid grid-cols-3 items-end gap-2.5">
        {order.map((r) => {
          const m = meta[r.rank] ?? meta[3]
          return (
            <div key={r.student_id} className="flex flex-col items-center animate-card-in opacity-0" style={{ animationDelay: `${r.rank * 60}ms` }}>
              <div className="relative">
                <div className={`w-14 h-14 rounded-full ring-2 ${m.ring} ${hueOf(r.student_id)} flex items-center justify-center text-[16px] font-bold shadow-sm`}>
                  {initialsOf(r.display_name)}
                </div>
                <span className="absolute -bottom-1 -right-1 text-[15px] drop-shadow-sm">{m.medal}</span>
              </div>
              <div className={`mt-2 max-w-full truncate text-[12px] font-semibold ${r.is_me ? 'text-amber-700' : 'text-gray-800'}`}>
                {r.display_name}{r.is_me && <span className="text-[9px] text-amber-600 ml-1">({ko ? '나' : 'me'})</span>}
              </div>
              <div className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-gray-500">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />{r.xp_this_week}
              </div>
              <div className={`mt-1.5 w-full ${m.h} rounded-t-xl bg-gradient-to-b from-white to-gray-100 ring-1 ring-gray-200/70 flex items-start justify-center pt-1.5`}>
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold tabular-nums ${m.badge}`}>{r.rank}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Leaderboard({ rows, ko }: { rows: LeaderboardRow[]; ko: boolean }) {
  const hasPodium = rows.length >= 3
  const top = hasPodium ? rows.slice(0, 3) : []
  const rest = hasPodium ? rows.slice(3) : rows
  return (
    <>
      {hasPodium && <Podium top={top} ko={ko} />}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[13px] font-semibold text-gray-900">{ko ? '전체 순위' : 'Full standings'}</h3>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />{ko ? '승급권' : 'Promotion zone'}
          </span>
        </div>
        <ol className="space-y-1.5">
          {rest.map((r, i) => {
            const promo = r.rank <= PROMOTE_ZONE
            const showDivider = hasPodium && r.rank === PROMOTE_ZONE + 1
            return (
              <div key={r.student_id}>
                {showDivider && (
                  <div className="flex items-center gap-2 py-1.5 px-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-300/60 to-transparent" />
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-500">{ko ? '승급 경계선' : 'Promotion line'}</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-emerald-300/60 to-transparent" />
                  </div>
                )}
                <li
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                  className={`flex items-center gap-3 pl-2 pr-3.5 py-2 rounded-xl ring-1 animate-card-in opacity-0 ${
                    r.is_me
                      ? 'bg-amber-50 ring-amber-200'
                      : promo
                        ? 'bg-emerald-50/60 ring-emerald-100'
                        : 'bg-white ring-gray-200/70'
                  }`}>
                  <span className={`flex-shrink-0 w-6 text-center text-[12.5px] font-bold tabular-nums ${promo ? 'text-emerald-600' : 'text-gray-400'}`}>{r.rank}</span>
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full ${hueOf(r.student_id)} flex items-center justify-center text-[11px] font-bold`}>
                    {initialsOf(r.display_name)}
                  </span>
                  <span className={`flex-1 min-w-0 truncate text-[13.5px] ${r.is_me ? 'font-semibold text-amber-900' : 'text-gray-800'}`}>
                    {r.display_name}{r.is_me && <span className="text-[10px] font-semibold text-amber-600 ml-1.5">({ko ? '나' : 'me'})</span>}
                  </span>
                  {promo && <TrendingUp className="flex-shrink-0 w-3.5 h-3.5 text-emerald-500" />}
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-[12.5px] tabular-nums font-semibold text-gray-700">
                    <Sparkles className="w-3 h-3 text-amber-500" />{r.xp_this_week}
                  </span>
                </li>
              </div>
            )
          })}
        </ol>
      </section>
    </>
  )
}

function TierLadder({ activeKey, ko }: { activeKey: string; ko: boolean }) {
  const activeIdx = TIERS.findIndex(t => t.key === activeKey)
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{ko ? '리그 단계' : 'Tier ladder'}</h3>
      <div className="-mx-5 px-5">
        {/* pt-1 gives the pills' top ring/shadow headroom — overflow-x-auto
            forces overflow-y to clip, which was shaving the top edge. */}
        <div className="flex gap-1.5 overflow-x-auto pt-1 pb-2 scrollbar-hide">
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
  // Per-activity gradient tiles — same icon-tile system as the landing,
  // so each way to earn XP carries its activity's color instead of five
  // identical amber squares.
  const rows = [
    { Icon: ListChecks, xp: 10, label_en: 'Each correct practice answer', label_ko: '연습 문제 정답', href: '/mobile/study', tile: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-[0_3px_8px_-2px_rgba(56,189,248,0.4)]' },
    { Icon: Camera, xp: 5, label_en: 'Solve a problem with Snap', label_ko: '사진으로 문제 풀이', href: '/mobile/study/snap', tile: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_3px_8px_-2px_rgba(251,146,60,0.4)]' },
    { Icon: Mic, xp: 20, label_en: 'Submit a speaking or writing response', label_ko: '말하기·작문 응답 제출', href: '/mobile/study', tile: 'bg-gradient-to-br from-rose-400 to-pink-600 shadow-[0_3px_8px_-2px_rgba(244,63,94,0.4)]' },
    { Icon: Layers, xp: 5, label_en: 'Easy flashcard review', label_ko: '플래시카드 쉬움', href: '/mobile/study/review', tile: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_3px_8px_-2px_rgba(139,92,246,0.4)]' },
    { Icon: BookOpen, xp: 25, label_en: 'Complete a full study session', label_ko: '학습 세션 완료', href: '/mobile/study', tile: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_3px_8px_-2px_rgba(16,185,129,0.4)]' },
  ]
  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{ko ? 'XP 얻는 방법' : 'How to earn XP'}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 overflow-hidden divide-y divide-gray-100">
        {rows.map((r, i) => {
          const Icon = r.Icon
          return (
            <Link key={i} href={r.href}
              className="flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50 transition group">
              <div className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl text-white ${r.tile}`}>
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
