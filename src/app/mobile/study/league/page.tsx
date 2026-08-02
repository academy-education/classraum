"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Clock, Crown, Sparkles, Camera, ListChecks, Layers, Mic, BookOpen, TrendingUp, TrendingDown, Minus, Users, UserPlus, Award, Diamond, Shield, Confetti, Check, Lock } from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { validateNickname, NICKNAME_MAX } from '@/lib/study/nickname'
import { PODIUM_CREDITS, PROMOTION_CREDITS, MILESTONE_CREDITS } from '@/lib/study/league-reward-values'
import { promoteZoneFor, relegateStartFor, bandFor, type LeagueBand } from '@/lib/study/league-bands'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyEmptyState, StudySectionHeader as _StudySectionHeader, StudyPageTransition, StudyScrollShell } from '../_shared/primitives'
import { SkeletonCard, SkeletonBlock, SkeletonRowList } from '../skeletons'
import { SegmentedTabs } from '../_shared/SegmentedTabs'
import { StudyButton, studyButtonClass } from '@/app/mobile/study/_shared/StudyButton'
import { StudyAvatar } from '@/app/mobile/study/_shared/avatars'

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
  /** Optional on the wire: absent from responses served before migration
   *  071 is applied, null for anyone who never picked an avatar. Both
   *  render the initials avatar. */
  avatar_id?: string | null
  xp_this_week: number
  rank: number
  is_me: boolean
}

interface PromotionNotice {
  event: 'promoted' | 'held' | 'demoted'
  fromTier: string
  toTier: string
  finalRank: number
  rewardCredits?: number
}

interface LeagueData {
  joined: boolean
  tier: string | null
  weekStart: string
  resetSeconds: number
  myRank: number | null
  myXp: number
  memberCount?: number
  leaderboard: LeaderboardRow[]
  promotionNotice?: PromotionNotice | null
  seasonHigh?: string | null
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

  // Cohort size drives every zone boundary, so resolve it once. The API
  // omits memberCount in the not-joined envelope; fall back to the number
  // of rows we did get, and never let it sit below the rendered rows (the
  // leaderboard is capped at 20, so it can only ever be an undercount).
  const memberCount = Math.max(data?.memberCount ?? 0, data?.leaderboard.length ?? 0)

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
            <TierBanner tier={tier} ko={ko} myRank={data.myRank} myXp={data.myXp} resetSeconds={data.resetSeconds} seasonHigh={data.seasonHigh ?? null} promoteCount={promoteZoneFor(memberCount)} />
            <PromotionZone tier={tier} ko={ko} myRank={data.myRank} memberCount={memberCount} />
            <Leaderboard rows={data.leaderboard} ko={ko} memberCount={memberCount} />
            <RewardsPanel ko={ko} tier={tier} myRank={data.myRank} memberCount={memberCount} seasonHigh={data.seasonHigh ?? null} />
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
            <RankAvatar row={r} size={32}
              initialsClass={`flex-shrink-0 w-8 h-8 rounded-full ${hueOf(r.student_id)} flex items-center justify-center text-[11px] font-bold`} />
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

// The top THIRD of each cohort advance to the next tier each week
// (matches close_study_league_week), so the promotion zone depends on
// cohort size — not a fixed rank. At least 1 always advances.
/* promoteZoneFor / relegateStartFor / bandFor now live in
   src/lib/study/league-bands.ts, where a test can diff them against a
   signature generated by close_study_league_week itself. */

// The bottom third drop a tier. close_study_league_week writes
//   rank <= GREATEST(1, total/3)              → 'promoted'
//   rank >  total - GREATEST(1, total/3)      → 'demoted'
//   else                                      → 'held'
// so the relegation band is the SAME size as the promotion band, and
// this returns the first rank inside it. In a tiny cohort the two bands
// can overlap; the SQL CASE tests 'promoted' first, so promotion wins —
// `bandFor` below reproduces that ordering rather than re-deriving it.


/** Per-band visual tokens. Colour is never the only signal — every band
 *  also carries its own arrow glyph (up / flat / down) and the student's
 *  own band is the only one rendered at full contrast. */
const BAND_TONE: Record<LeagueBand, {
  bar: string; text: string; rowBg: string; ring: string; tile: string; dot: string
}> = {
  promote: {
    bar: 'bg-emerald-400', text: 'text-emerald-700', rowBg: 'bg-emerald-50/70',
    ring: 'ring-emerald-200', dot: 'bg-emerald-400',
    tile: 'from-emerald-400 to-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(16,185,129,0.28)]',
  },
  safe: {
    bar: 'bg-slate-300', text: 'text-slate-600', rowBg: 'bg-slate-50',
    ring: 'ring-slate-200', dot: 'bg-slate-300',
    tile: 'from-slate-400 to-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(100,116,139,0.28)]',
  },
  relegate: {
    bar: 'bg-rose-400', text: 'text-rose-700', rowBg: 'bg-rose-50/70',
    ring: 'ring-rose-200', dot: 'bg-rose-400',
    tile: 'from-rose-400 to-red-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(244,63,94,0.28)]',
  },
}

const BAND_ICON: Record<LeagueBand, typeof TrendingUp> = {
  promote: TrendingUp, safe: Minus, relegate: TrendingDown,
}

/**
 * A leaderboard row's avatar: the student's chosen Raumi avatar when they
 * have one, otherwise the deterministic initials disc this page has always
 * drawn.
 *
 * `initialsClass` is the ORIGINAL markup's className, passed through
 * untouched — hue, size and type scale are unchanged, so every student who
 * never opens the avatar picker sees the leaderboard exactly as before.
 * `avatarClass` carries only the framing (the podium's ring + shadow) onto
 * the Raumi branch, which brings its own colour and shape.
 */
function RankAvatar({ row, size, initialsClass, avatarClass = '' }: {
  row: LeaderboardRow; size: number; initialsClass: string; avatarClass?: string
}) {
  return (
    <StudyAvatar
      avatarId={row.avatar_id}
      size={size}
      className={avatarClass}
      fallback={<span className={initialsClass}>{initialsOf(row.display_name)}</span>}
    />
  )
}

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

/** Small tier pill — the destination a band lands you in next week.
 *  When the destination is the tier you're already in (the Safe band, or
 *  Bronze/Diamond where the ladder clamps) it renders neutral, so a
 *  coloured pill always means "your tier changes". */
function TierChip({ tier, muted, ko }: { tier: typeof TIERS[number]; muted: boolean; ko: boolean }) {
  return (
    <span className={`flex-shrink-0 inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
      muted ? 'bg-gray-100 text-gray-500' : `bg-gradient-to-br ${tier.color} text-white`
    }`}>
      {ko ? tier.label_ko : tier.label_en}
    </span>
  )
}

/**
 * Promotion zone — the three outcomes of Sunday's close (promote /
 * hold / relegate) as three explicitly-bounded rank bands, with the
 * student's own band called out.
 *
 * Every band shows its literal rank range and the tier it lands you in,
 * so "am I safe?" is answerable without counting rows in the standings
 * — which matters because the standings are truncated to the top 20
 * while the bands are computed from the full cohort size.
 */
function PromotionZone({ tier, ko, myRank, memberCount }: {
  tier: typeof TIERS[number]; ko: boolean; myRank: number | null; memberCount: number
}) {
  const promoteCount = promoteZoneFor(memberCount)
  const relegateStart = relegateStartFor(memberCount)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  // next_tier / prev_tier exactly as close_study_league_week clamps them:
  // Diamond can't climb further, Bronze can't drop.
  const upTier = TIERS[Math.min(TIERS.length - 1, idx + 1)]
  const downTier = TIERS[Math.max(0, idx - 1)]

  // A tiny cohort can leave the promote and relegate bands touching (or
  // overlapping); promotion wins, so the relegation band starts at
  // promoteCount + 1 at the earliest and the safe band may be empty.
  const relegateFrom = Math.max(relegateStart, promoteCount + 1)
  const allBands: Array<{ key: LeagueBand; label: string; from: number; to: number; dest: typeof TIERS[number] }> = [
    { key: 'promote', label: ko ? '승급권' : 'Promotion', from: 1, to: promoteCount, dest: upTier },
    { key: 'safe', label: ko ? '유지권' : 'Safe', from: promoteCount + 1, to: relegateFrom - 1, dest: tier },
    { key: 'relegate', label: ko ? '강등권' : 'Relegation', from: relegateFrom, to: memberCount, dest: downTier },
  ]
  const bands = allBands.filter(b => b.from <= b.to)

  const myBand = myRank != null ? bandFor(myRank, memberCount) : null
  const headTone = BAND_TONE[myBand ?? 'safe']
  const HeadIcon = BAND_ICON[myBand ?? 'safe']
  const myBandLabel = bands.find(b => b.key === myBand)?.label ?? ''

  // The one number that tells the student what to do next.
  const message = (band: LeagueBand): string | null => {
    if (myRank == null) return null
    if (band === 'promote') return ko ? '자리를 지키세요!' : 'Hold your spot!'
    if (band === 'safe') {
      const n = myRank - promoteCount
      return ko ? `승급권까지 ${n}계단` : `${n} ${n === 1 ? 'spot' : 'spots'} from promotion`
    }
    const n = myRank - relegateFrom + 1
    return ko ? `안전권까지 ${n}계단` : `${n} ${n === 1 ? 'spot' : 'spots'} from safety`
  }

  const range = (from: number, to: number) => from === to ? `#${from}` : `#${from}–${to}`

  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{ko ? '승급 / 강등 구간' : 'Promotion zone'}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Where you stand right now — the answer, before the structure. */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
          <span className={`flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${headTone.tile} text-white flex items-center justify-center ring-1 ring-black/[0.04]`}>
            <HeadIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 leading-none">
              {ko ? '내 위치' : 'Your position'}
            </div>
            <div className="text-[15px] font-semibold text-gray-900 mt-1.5 leading-none truncate">
              {myRank == null
                ? (ko ? `${memberCount}명 참가 중` : `${memberCount} in your cohort`)
                : (
                  <>
                    <span className="tabular-nums">{ko ? `${memberCount}명 중 ${myRank}위` : `#${myRank} of ${memberCount}`}</span>
                    {myBandLabel && (
                      <>
                        <span className="text-gray-300 mx-1.5">·</span>
                        <span className={headTone.text}>{myBandLabel}</span>
                      </>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>
        {/* The three bands. Only the student's own band is at full
            contrast; the others recede but keep their rank range so the
            whole structure stays readable. */}
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {bands.map((b) => {
            const mine = b.key === myBand
            const tone = BAND_TONE[b.key]
            const Icon = BAND_ICON[b.key]
            const msg = mine ? message(b.key) : null
            return (
              <div key={b.key}
                className={`relative flex items-center gap-2.5 pl-4 pr-3.5 py-2.5 ${mine ? tone.rowBg : 'bg-white'}`}>
                <span aria-hidden className={`absolute left-0 top-0 bottom-0 w-1 ${mine ? tone.bar : 'bg-gray-200'}`} />
                <Icon className={`flex-shrink-0 w-4 h-4 ${mine ? tone.text : 'text-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[12.5px] font-semibold truncate ${mine ? 'text-gray-900' : 'text-gray-600'}`}>{b.label}</span>
                    <span className="flex-shrink-0 text-[11.5px] tabular-nums text-gray-400">{range(b.from, b.to)}</span>
                    {mine && myRank != null && (
                      <span className={`flex-shrink-0 inline-flex items-center rounded-full bg-white ring-1 ${tone.ring} px-1.5 py-px text-[10px] font-bold tabular-nums ${tone.text}`}>
                        {ko ? `나 ${myRank}위` : `you #${myRank}`}
                      </span>
                    )}
                  </div>
                  {msg && <div className={`mt-0.5 text-[11px] font-medium ${tone.text}`}>{msg}</div>}
                </div>
                <TierChip tier={b.dest} muted={b.dest.key === tier.key} ko={ko} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TierBanner({ tier, ko, myRank, myXp, resetSeconds, seasonHigh, promoteCount }: {
  tier: typeof TIERS[number]; ko: boolean; myRank: number | null; myXp: number; resetSeconds: number; seasonHigh?: string | null; promoteCount: number
}) {
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const inPromo = myRank != null && myRank <= promoteCount
  // Season high — a personal-best badge, shown only when the peak tier
  // is above the current one (otherwise it's just the current tier).
  const highTier = seasonHigh ? TIERS.find(t => t.key === seasonHigh) : null
  const showHigh = highTier && TIERS.findIndex(t => t.key === highTier.key) > idx
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
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-[26px] font-bold tracking-tight leading-none">{ko ? tier.label_ko : tier.label_en}</h2>
            {showHigh && highTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 ring-1 ring-white/25 px-2 py-0.5 text-[10px] font-bold">
                <Crown className="w-3 h-3" />
                {ko ? `최고 ${highTier.label_ko}` : `Best ${highTier.label_en}`}
              </span>
            )}
          </div>
          {next && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium opacity-90">
              <TrendingUp className="w-3 h-3" />
              {ko ? `상위 ${promoteCount}위 → ${next.label_ko} 승급` : `Top ${promoteCount} advance to ${next.label_en}`}
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
      {/* Only the celebratory half of the old status strip survives here.
          The "N spots from the promotion zone" half moved into
          <PromotionZone>, which says the same thing with the relegation
          side attached — two copies of it 40px apart read as noise. */}
      {inPromo && (
        <div className="relative mt-3 rounded-xl px-3 py-2 text-[12px] font-semibold flex items-center justify-center gap-1.5 bg-emerald-400/25 ring-1 ring-emerald-200/40">
          <Confetti weight="fill" className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{ko ? '승급권 안에 있어요 — 계속 유지하세요!' : "You're in the promotion zone — hold your spot!"}</span>
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
                <RankAvatar row={r} size={56} avatarClass={`ring-2 ${m.ring} shadow-sm`}
                  initialsClass={`w-14 h-14 rounded-full ring-2 ${m.ring} ${hueOf(r.student_id)} flex items-center justify-center text-[16px] font-bold shadow-sm`} />
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

/** The dashed boundary between two bands, drawn inline in the standings. */
function ZoneDivider({ label, tone }: { label: string; tone: LeagueBand }) {
  const line = tone === 'promote' ? 'from-emerald-300/60' : 'from-rose-300/60'
  const text = tone === 'promote' ? 'text-emerald-500' : 'text-rose-500'
  return (
    <div className="flex items-center gap-2 py-1.5 px-1">
      <div className={`flex-1 h-px bg-gradient-to-r ${line} to-transparent`} />
      <span className={`text-[9.5px] font-bold uppercase tracking-wider ${text}`}>{label}</span>
      <div className={`flex-1 h-px bg-gradient-to-l ${line} to-transparent`} />
    </div>
  )
}

function Leaderboard({ rows, ko, memberCount }: { rows: LeaderboardRow[]; ko: boolean; memberCount: number }) {
  const hasPodium = rows.length >= 3
  const top = hasPodium ? rows.slice(0, 3) : []
  const rest = hasPodium ? rows.slice(3) : rows
  const promoteCount = promoteZoneFor(memberCount)
  const relegateFrom = Math.max(relegateStartFor(memberCount), promoteCount + 1)
  return (
    <>
      {hasPodium && <Podium top={top} ko={ko} />}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[13px] font-semibold text-gray-900">{ko ? '전체 순위' : 'Full standings'}</h3>
          {/* The legend that used to live here is now the whole
              <PromotionZone> card above — repeating one of its three
              bands as a lone dot was the weaker half of the pair. */}
          <span className="text-[10.5px] font-medium text-gray-400 tabular-nums">
            {ko ? `${memberCount}명` : `${memberCount} students`}
          </span>
        </div>
        <ol className="space-y-1.5">
          {rest.map((r, i) => {
            const band = bandFor(r.rank, memberCount)
            const tone = BAND_TONE[band]
            const BandIcon = BAND_ICON[band]
            // Draw a boundary only where the row that OPENS the band is
            // actually rendered. The list is capped at the top 20 while
            // the bands are computed from the full cohort, so in a large
            // cohort the relegation line simply isn't on screen — much
            // better than pinning it to the last visible row, which would
            // claim a rank boundary that isn't there.
            const divider = !hasPodium
              ? null
              : r.rank === promoteCount + 1
                ? { label: ko ? '승급 경계선' : 'Promotion line', tone: 'promote' as LeagueBand }
                : r.rank === relegateFrom
                  ? { label: ko ? '강등 경계선' : 'Relegation line', tone: 'relegate' as LeagueBand }
                  : null
            return (
              <div key={r.student_id}>
                {divider && <ZoneDivider label={divider.label} tone={divider.tone} />}
                <li
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                  className={`flex items-center gap-3 pl-2 pr-3.5 py-2 rounded-xl ring-1 animate-card-in opacity-0 ${
                    r.is_me
                      ? 'bg-amber-50 ring-amber-200'
                      : band === 'promote'
                        ? 'bg-emerald-50/60 ring-emerald-100'
                        : band === 'relegate'
                          ? 'bg-rose-50/50 ring-rose-100'
                          : 'bg-white ring-gray-200/70'
                  }`}>
                  <span className={`flex-shrink-0 w-6 text-center text-[12.5px] font-bold tabular-nums ${band === 'safe' ? 'text-gray-400' : tone.text}`}>{r.rank}</span>
                  <RankAvatar row={r} size={32}
                    initialsClass={`flex-shrink-0 w-8 h-8 rounded-full ${hueOf(r.student_id)} flex items-center justify-center text-[11px] font-bold`} />
                  <span className={`flex-1 min-w-0 truncate text-[13.5px] ${r.is_me ? 'font-semibold text-amber-900' : 'text-gray-800'}`}>
                    {r.display_name}{r.is_me && <span className="text-[10px] font-semibold text-amber-600 ml-1.5">({ko ? '나' : 'me'})</span>}
                  </span>
                  {/* The band arrow renders even on the amber "me" row, so
                      the band survives the row tint being overridden. */}
                  {band !== 'safe' && <BandIcon className={`flex-shrink-0 w-3.5 h-3.5 ${tone.text}`} />}
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
          {(notice.rewardCredits ?? 0) > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/25 px-2.5 py-1 text-[12px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              {ko ? `크레딧 +${notice.rewardCredits}` : `+${notice.rewardCredits} credits`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type RewardState = 'ontrack' | 'ahead' | 'unavailable'

/**
 * Weekly rewards — the three payouts the Sunday close can make, each
 * carrying its own state: on track at the student's current rank,
 * still ahead of them, or not available in this tier at all.
 *
 * Amounts come from `league-reward-values.ts`, the same table
 * grantLeagueRewards pays from. They used to be literals here under a
 * "keep in sync" comment, which is how the panel came to advertise a
 * vague "up to +8" for a milestone whose real value is fixed per tier.
 *
 * Nothing here claims credits are EARNED — they are granted at the
 * close, so the on-track state is explicitly labelled as a projection
 * of the current rank and the footnote says so.
 */
function RewardsPanel({ ko, tier, myRank, memberCount, seasonHigh }: {
  ko: boolean; tier: typeof TIERS[number]; myRank: number | null; memberCount: number; seasonHigh: string | null
}) {
  const promoteCount = promoteZoneFor(memberCount)
  const idx = TIERS.findIndex(t => t.key === tier.key)
  const nextIdx = Math.min(TIERS.length - 1, idx + 1)
  const nextTier = TIERS[nextIdx]
  const milestoneCredits = MILESTONE_CREDITS[nextTier.key]

  // grantLeagueRewards pays the milestone only the FIRST time a student
  // is ever placed in a tier. Tiers are climbed one rung at a time, so a
  // season high at or above the next tier means they have already held
  // it and the bonus can never pay again. At Diamond `nextTier` clamps
  // to Diamond itself, which this same comparison correctly marks as
  // already held.
  const seasonHighIdx = seasonHigh ? TIERS.findIndex(t => t.key === seasonHigh) : idx
  const milestoneHeld = seasonHighIdx >= nextIdx

  const onPromoTrack = myRank != null && myRank <= promoteCount
  const podiumCredits = myRank != null ? PODIUM_CREDITS[myRank] : undefined
  const milestoneOpen = !!milestoneCredits && !milestoneHeld

  const rows: Array<{
    Icon: typeof Trophy; tile: string; title: string; detail: string
    value: string; state: RewardState; projected: number
  }> = [
    {
      Icon: Trophy,
      tile: 'from-amber-400 to-orange-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(245,158,11,0.28)]',
      title: ko ? '포디움' : 'Podium finish',
      detail: ko ? '코호트 1 · 2 · 3위' : 'Finish 1st, 2nd or 3rd',
      value: `+${PODIUM_CREDITS[1]} / +${PODIUM_CREDITS[2]} / +${PODIUM_CREDITS[3]}`,
      state: podiumCredits ? 'ontrack' : 'ahead',
      projected: podiumCredits ?? 0,
    },
    {
      Icon: TrendingUp,
      tile: 'from-emerald-400 to-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(16,185,129,0.28)]',
      title: ko ? '승급 보너스' : 'Promotion bonus',
      detail: ko ? `상위 ${promoteCount}위 안에 들기` : `Finish in the top ${promoteCount}`,
      value: `+${PROMOTION_CREDITS}`,
      state: onPromoTrack ? 'ontrack' : 'ahead',
      projected: onPromoTrack ? PROMOTION_CREDITS : 0,
    },
    {
      Icon: Crown,
      tile: 'from-violet-500 to-purple-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(139,92,246,0.28)]',
      title: ko ? `${nextTier.label_ko} 첫 도달` : `First time in ${nextTier.label_en}`,
      detail: !milestoneCredits
        ? (ko ? '골드 리그부터 지급돼요' : 'Milestones start at Gold')
        : milestoneHeld
          ? (ko ? '이미 도달한 적이 있어요 — 1회 한정' : "You've been there — one time only")
          : (ko ? '승급해서 처음 도달하면 지급' : 'Paid the first time you are promoted into it'),
      value: milestoneCredits ? `+${milestoneCredits}` : '—',
      state: !milestoneOpen ? 'unavailable' : onPromoTrack ? 'ontrack' : 'ahead',
      projected: milestoneOpen && onPromoTrack ? milestoneCredits : 0,
    },
  ]

  const projectedTotal = rows.reduce((sum, r) => sum + r.projected, 0)

  const chip = (state: RewardState) => {
    if (state === 'ontrack') return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-1.5 py-px text-[10px] font-bold text-emerald-700">
        <Check className="w-2.5 h-2.5" weight="bold" />{ko ? '획득 예정' : 'On track'}
      </span>
    )
    if (state === 'unavailable') return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 ring-1 ring-gray-200 px-1.5 py-px text-[10px] font-bold text-gray-400">
        <Lock className="w-2.5 h-2.5" />{ko ? '해당 없음' : 'N/A'}
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 ring-1 ring-gray-200 px-1.5 py-px text-[10px] font-bold text-gray-500">
        <span aria-hidden className="w-1.5 h-1.5 rounded-full ring-1 ring-gray-400" />{ko ? '아직' : 'Not yet'}
      </span>
    )
  }

  return (
    <section>
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3 px-1">{ko ? '주간 보상' : 'Weekly rewards'}</h3>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3.5">
          <span className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_-2px_rgba(245,158,11,0.28)]">
            <Sparkles className="w-5 h-5" weight="fill" />
          </span>
          {/* Eyebrow stays short enough to hold one line at 375px — the
              full "what does on track mean" caveat lives in the footnote,
              and the total is NOT repeated as a chip beside the headline
              that already states it. */}
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gray-500 leading-none">
              {ko ? '일요일 마감 지급' : 'Sunday payout'}
            </div>
            <div className="text-[15px] font-semibold text-gray-900 mt-1.5 leading-none">
              {projectedTotal > 0
                ? (ko ? `크레딧 ${projectedTotal}개 획득 예정` : `${projectedTotal} credits on track`)
                : (ko ? '아직 획득 예정 보상 없음' : 'Nothing on track yet')}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {rows.map((r, i) => {
            const dim = r.state === 'unavailable'
            const Icon = r.Icon
            return (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 ${dim ? 'opacity-55' : ''}`}>
                <span className={`flex-shrink-0 mt-0.5 w-8 h-8 rounded-xl text-white flex items-center justify-center ${
                  dim ? 'bg-gray-300' : `bg-gradient-to-br ${r.tile}`
                }`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-gray-900 truncate">{r.title}</div>
                  <div className="text-[11.5px] text-gray-500 leading-snug mt-0.5">{r.detail}</div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums whitespace-nowrap ${dim ? 'text-gray-400' : 'text-amber-700'}`}>
                    {!dim && <Sparkles className="w-3 h-3 text-amber-500" weight="fill" />}
                    {r.value}
                  </span>
                  {chip(r.state)}
                </div>
              </div>
            )
          })}
        </div>
        {/* States above are a PROJECTION of the current standings, not a
            ledger of granted credits — say so rather than letting "on
            track" read as "earned". */}
        <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[11px] text-gray-500 leading-snug">
          {ko
            ? '‘획득 예정’은 지금 순위가 일요일까지 유지될 경우예요. 크레딧은 마감 시 지급되며 만료되지 않아요.'
            : '"On track" assumes your current rank holds until Sunday. Credits are granted at the close and never expire.'}
        </div>
      </div>
    </section>
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
