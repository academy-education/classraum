"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Users, UserPlus, Copy, Check, Search, X, Loader2, Trophy, Clock } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyScrollShell, StudyPageTransition } from '../_shared/primitives'
import { SkeletonBlock, SkeletonCard } from '../skeletons'

/**
 * /mobile/study/friends — friend management.
 *
 * Add friends by @nickname search or by friend code, accept/decline
 * incoming requests, and jump to the friends leaderboard. The referrer and
 * referee of a redeemed invite are auto-added, so this list is seeded by
 * the referral loop.
 */

interface Person { student_id: string; display_name: string }
interface FriendRequest extends Person { id: string }
interface FriendsData {
  friends: Person[]
  incoming: FriendRequest[]
  outgoing: FriendRequest[]
  myCode: string | null
}
interface SearchResult {
  student_id: string
  nickname: string
  relation: 'none' | 'friends' | 'pending_out' | 'pending_in'
}

export default function FriendsPage() {
  return (
    <StudySubscriptionGate>
      <FriendsInner />
    </StudySubscriptionGate>
  )
}

function FriendsInner() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<FriendsData | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/friends', { headers })
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const header = (
    <StudyPageHeader
      backHref="/mobile/study/league"
      backLabel={ko ? '리그로 돌아가기' : 'Back to league'}
      icon={Users}
      iconColorClass="text-primary bg-primary/10"
      eyebrow={ko ? '소셜' : 'Social'}
      title={ko ? '친구' : 'Friends'}
      subtitle={ko ? '친구를 추가하고 함께 경쟁하세요.' : 'Add friends and compete together.'}
    />
  )

  if (!data) {
    return (
      <StudyScrollShell header={header}>
        {failed ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
            <p className="text-[13.5px] text-gray-600">{ko ? '친구 정보를 불러오지 못했어요.' : "Couldn't load your friends."}</p>
            <button type="button" onClick={() => void load()}
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-[13px] font-semibold hover:opacity-95 transition">
              {ko ? '다시 시도' : 'Retry'}
            </button>
          </div>
        ) : (
          <>
            <SkeletonCard className="p-5 space-y-3">
              <SkeletonBlock className="h-3 w-24 rounded-full" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
            </SkeletonCard>
            <SkeletonCard className="p-5 space-y-3">
              <SkeletonBlock className="h-11 w-full rounded-xl" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
            </SkeletonCard>
          </>
        )}
      </StudyScrollShell>
    )
  }

  return (
    <StudyScrollShell header={header}>
      <StudyPageTransition>
        <div className="space-y-6">
          <ViewLeaderboardButton ko={ko} count={data.friends.length} />
          <AddFriend ko={ko} myCode={data.myCode} onChanged={load} />
          {data.incoming.length > 0 && <IncomingRequests ko={ko} requests={data.incoming} onChanged={load} />}
          <FriendsList ko={ko} friends={data.friends} outgoing={data.outgoing} onChanged={load} />
        </div>
      </StudyPageTransition>
    </StudyScrollShell>
  )
}

function ViewLeaderboardButton({ ko, count }: { ko: boolean; count: number }) {
  return (
    <Link href="/mobile/study/league?view=friends"
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white p-4 shadow-[0_8px_24px_-10px_rgba(251,146,60,0.5)] hover:-translate-y-0.5 transition-transform">
      <div aria-hidden className="pointer-events-none absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center">
        <Trophy className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold leading-tight">{ko ? '친구 리더보드' : 'Friends leaderboard'}</div>
        <div className="text-[12px] opacity-90">{ko ? `친구 ${count}명과 이번 주 경쟁` : `Compete with ${count} friend${count === 1 ? '' : 's'} this week`}</div>
      </div>
    </Link>
  )
}

function AddFriend({ ko, myCode, onChanged }: { ko: boolean; myCode: string | null; onChanged: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced nickname search.
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`/api/study/friends/search?q=${encodeURIComponent(query)}`, { headers })
        const json = await res.json()
        setResults(json.results ?? [])
      } catch { setResults([]) } finally { setSearching(false) }
    }, 350)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [q])

  const request = async (body: Record<string, string>): Promise<{ ok: boolean; status?: string }> => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/friends', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', ...body }),
      })
      const json = await res.json().catch(() => ({}))
      return { ok: res.ok, status: json.status }
    } catch { return { ok: false } }
  }

  const addByNickname = async (nickname: string) => {
    const r = await request({ nickname })
    if (r.ok) { onChanged(); void refetchSearch() }
  }
  const refetchSearch = async () => {
    const query = q.trim(); if (query.length < 2) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/study/friends/search?q=${encodeURIComponent(query)}`, { headers })
      setResults((await res.json()).results ?? [])
    } catch { /* keep stale */ }
  }

  const addByCode = async () => {
    const code = codeInput.trim().toUpperCase()
    if (!code || codeBusy) return
    setCodeBusy(true); setCodeMsg(null)
    const r = await request({ code })
    setCodeBusy(false)
    if (!r.ok) { setCodeMsg({ ok: false, text: ko ? '코드를 찾을 수 없어요.' : "Couldn't find that code." }); return }
    setCodeMsg({ ok: true, text: r.status === 'accepted' ? (ko ? '친구가 됐어요!' : "You're now friends!") : (ko ? '요청을 보냈어요.' : 'Request sent.') })
    setCodeInput('')
    onChanged()
  }

  const copyCode = async () => {
    if (!myCode) return
    try { await navigator.clipboard.writeText(myCode); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* no-op */ }
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-semibold text-gray-900">{ko ? '친구 추가' : 'Add a friend'}</h2>
      </div>

      {/* Nickname search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" value={q} onChange={e => setQ(e.target.value)}
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          placeholder={ko ? '닉네임으로 검색' : 'Search by nickname'}
          className="w-full h-11 pl-9 pr-9 rounded-xl bg-gray-50 ring-1 ring-gray-200/70 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
      </div>
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map(r => (
            <div key={r.student_id} className="flex items-center gap-2.5 px-1 py-1">
              <Avatar name={r.nickname} />
              <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-gray-800">{r.nickname}</span>
              {r.relation === 'friends' ? (
                <span className="text-[11.5px] font-semibold text-emerald-600">{ko ? '친구' : 'Friends'}</span>
              ) : r.relation === 'pending_out' ? (
                <span className="text-[11.5px] font-medium text-gray-400">{ko ? '요청됨' : 'Requested'}</span>
              ) : r.relation === 'pending_in' ? (
                <button type="button" onClick={() => void addByNickname(r.nickname)}
                  className="h-8 px-3 rounded-full bg-primary text-white text-[12px] font-semibold hover:opacity-95 active:scale-95 transition">
                  {ko ? '수락' : 'Accept'}
                </button>
              ) : (
                <button type="button" onClick={() => void addByNickname(r.nickname)}
                  className="h-8 px-3 rounded-full bg-gray-900 text-white text-[12px] font-semibold hover:bg-gray-800 active:scale-95 transition">
                  {ko ? '추가' : 'Add'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add by friend code */}
      <div className="pt-1 border-t border-gray-100 space-y-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-gray-400 pt-2">{ko ? '친구 코드로 추가' : 'Add by friend code'}</p>
        <div className="flex gap-2">
          <input
            type="text" value={codeInput} onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeMsg(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void addByCode() }}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={12}
            placeholder={ko ? '코드 입력' : 'Enter code'}
            className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-gray-50 ring-1 ring-gray-200/70 text-[14px] font-semibold tracking-[0.1em] uppercase text-gray-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          />
          <button type="button" onClick={() => void addByCode()} disabled={!codeInput.trim() || codeBusy}
            className="flex-shrink-0 inline-flex items-center justify-center h-11 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-semibold disabled:opacity-40 hover:bg-gray-800 active:scale-[0.98] transition">
            {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : (ko ? '추가' : 'Add')}
          </button>
        </div>
        {codeMsg && <p className={`text-[12px] px-1 ${codeMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{codeMsg.text}</p>}
      </div>

      {/* My own code to share */}
      {myCode && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary/5 ring-1 ring-primary/15 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{ko ? '내 친구 코드' : 'My friend code'}</div>
            <div className="text-[18px] font-bold tracking-[0.14em] text-primary tabular-nums select-all">{myCode}</div>
          </div>
          <button type="button" onClick={() => void copyCode()}
            className="flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white ring-1 ring-gray-200/70 text-[12.5px] font-semibold text-gray-700 hover:ring-primary/30 active:scale-95 transition">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? (ko ? '복사됨' : 'Copied') : (ko ? '복사' : 'Copy')}
          </button>
        </div>
      )}
    </section>
  )
}

function IncomingRequests({ ko, requests, onChanged }: { ko: boolean; requests: FriendRequest[]; onChanged: () => void }) {
  const respond = async (id: string, action: 'accept' | 'decline') => {
    try {
      const headers = await authHeaders()
      await fetch('/api/study/friends', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      onChanged()
    } catch { /* no-op */ }
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-4 h-4 text-gray-400" />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600">{ko ? '받은 요청' : 'Requests'}</h2>
        <span className="text-[11px] font-bold text-white bg-primary rounded-full px-1.5 min-w-[18px] text-center">{requests.length}</span>
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 divide-y divide-gray-100">
        {requests.map(r => (
          <div key={r.id} className="flex items-center gap-2.5 px-4 py-3">
            <Avatar name={r.display_name} />
            <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-gray-800">{r.display_name}</span>
            <button type="button" onClick={() => void respond(r.id, 'accept')}
              className="h-8 px-3 rounded-full bg-primary text-white text-[12px] font-semibold hover:opacity-95 active:scale-95 transition">
              {ko ? '수락' : 'Accept'}
            </button>
            <button type="button" onClick={() => void respond(r.id, 'decline')} aria-label={ko ? '거절' : 'Decline'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 active:scale-95 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function FriendsList({ ko, friends, outgoing, onChanged }: { ko: boolean; friends: Person[]; outgoing: FriendRequest[]; onChanged: () => void }) {
  const remove = async (friendId: string) => {
    try {
      const headers = await authHeaders()
      await fetch('/api/study/friends', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', friendId }),
      })
      onChanged()
    } catch { /* no-op */ }
  }
  const cancel = async (id: string) => {
    try {
      const headers = await authHeaders()
      await fetch('/api/study/friends', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      })
      onChanged()
    } catch { /* no-op */ }
  }

  if (friends.length === 0 && outgoing.length === 0) {
    return (
      <section className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-50 ring-1 ring-gray-200/70 flex items-center justify-center mb-3">
          <Users className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-[13.5px] text-gray-600">{ko ? '아직 친구가 없어요.' : 'No friends yet.'}</p>
        <p className="text-[12px] text-gray-400 mt-1">{ko ? '위에서 닉네임이나 코드로 친구를 추가하세요.' : 'Add friends by nickname or code above.'}</p>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-gray-400" />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.10em] text-gray-600">{ko ? '친구' : 'Friends'} · {friends.length}</h2>
      </div>
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 divide-y divide-gray-100">
        {friends.map(f => (
          <div key={f.student_id} className="group flex items-center gap-2.5 px-4 py-3">
            <Avatar name={f.display_name} />
            <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-gray-800">{f.display_name}</span>
            <button type="button" onClick={() => void remove(f.student_id)} aria-label={ko ? '친구 삭제' : 'Remove'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-gray-300 hover:bg-rose-50 hover:text-rose-500 active:scale-95 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {outgoing.map(o => (
          <div key={o.id} className="flex items-center gap-2.5 px-4 py-3 opacity-70">
            <Avatar name={o.display_name} />
            <span className="flex-1 min-w-0 truncate text-[14px] font-medium text-gray-500">{o.display_name}</span>
            <span className="text-[11.5px] font-medium text-gray-400">{ko ? '대기 중' : 'Pending'}</span>
            <button type="button" onClick={() => void cancel(o.id)} aria-label={ko ? '취소' : 'Cancel'}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-gray-300 hover:bg-gray-100 hover:text-gray-500 active:scale-95 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Deterministic initials avatar, matching the leaderboard style. */
function Avatar({ name }: { name: string }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return (
    <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
      style={{ backgroundColor: `hsl(${h}, 55%, 55%)` }}>
      {initial}
    </div>
  )
}
