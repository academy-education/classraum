"use client"

import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Gift, Copy, Check, Users, Sparkles, Loader2, Ticket, Share2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { isKakaoShareEnabled, shareToKakao } from '@/lib/kakao-share'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyScrollShell, StudyMetric, StudyPageTransition } from '../_shared/primitives'
import { SkeletonBlock, SkeletonCard, SkeletonMetricCard } from '../skeletons'

/**
 * /mobile/study/referral — invite-a-friend referral loop.
 *
 * Shows the student's own code + shareable invite link, their referral
 * stats, and a box to redeem a friend's code. Both sides get 5 test
 * credits on a successful redemption (server-enforced, once per referee).
 *
 * KakaoTalk share is live one-tap when NEXT_PUBLIC_KAKAO_JS_KEY is set
 * (loads the Kakao JS SDK lazily); without the key the button falls back
 * to a disabled "준비 중" placeholder. See src/lib/kakao-share.ts.
 */

interface ReferralData {
  code: string
  rewardPerReferral: number
  stats: { referrals: number; creditsEarned: number }
}

/** Official KakaoTalk speech-bubble mark. Fills with currentColor so it
 *  inherits the button's near-black text on the #FEE500 yellow. */
function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} fill="currentColor" aria-hidden="true">
      <path d="M128 36C70.562 36 24 72.713 24 118.008c0 29.28 19.466 54.968 48.766 69.397-1.61 5.606-10.35 35.744-10.696 38.108 0 0-.21 1.785.94 2.465 1.15.68 2.503.148 2.503.148 3.307-.462 38.315-25.048 44.372-29.315 6.06.856 12.3 1.31 18.665 1.31 57.438 0 104-36.713 104-82.008S185.438 36 128 36z" />
    </svg>
  )
}

export default function ReferralPage() {
  return (
    <StudySubscriptionGate>
      <ReferralInner />
    </StudySubscriptionGate>
  )
}

function ReferralInner() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/referral', { headers })
      if (!res.ok) throw new Error()
      setData((await res.json()) as ReferralData)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const reward = data?.rewardPerReferral ?? 5

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={ko ? '스터디로 돌아가기' : 'Back to study'}
          icon={Gift}
          iconColorClass="text-primary bg-primary/10"
          eyebrow={ko ? '친구 초대' : 'Invite friends'}
          title={ko ? '친구 초대하고 크레딧 받기' : 'Invite friends, earn credits'}
          subtitle={ko
            ? `친구도 나도 크레딧 ${reward}개씩 받아요.`
            : `You and your friend each get ${reward} credits.`}
        />
      }
    >
      <StudyPageTransition>
        <div className="space-y-6">
          {loading ? (
            // Skeleton mirroring the loaded body (share card → 2 metrics →
            // redeem box), matching the study-wide shimmer standard.
            <>
              <SkeletonCard className="p-5 space-y-4">
                <SkeletonBlock className="h-3 w-24 rounded-full mx-auto" />
                <SkeletonBlock className="h-14 w-52 rounded-2xl mx-auto" />
                <SkeletonBlock className="h-3 w-3/4 rounded-full mx-auto" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
                <SkeletonBlock className="h-12 w-full rounded-xl" />
              </SkeletonCard>
              <div className="grid grid-cols-2 gap-3">
                <SkeletonMetricCard />
                <SkeletonMetricCard />
              </div>
              <SkeletonCard className="p-5 space-y-3">
                <SkeletonBlock className="h-3 w-28 rounded-full" />
                <SkeletonBlock className="h-11 w-full rounded-xl" />
              </SkeletonCard>
            </>
          ) : loadFailed || !data ? (
            <div className="rounded-2xl bg-white ring-1 ring-gray-200/70 px-5 py-10 text-center space-y-3">
              <p className="text-[13.5px] text-gray-600">
                {ko ? '초대 정보를 불러오지 못했어요.' : "We couldn't load your invite info."}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-[13px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] hover:opacity-95 transition"
              >
                {ko ? '다시 시도' : 'Retry'}
              </button>
            </div>
          ) : (
            <>
              <ShareCard code={data.code} reward={reward} ko={ko} />

              <div className="grid grid-cols-2 gap-3">
                <StudyMetric
                  icon={Users}
                  value={data.stats.referrals}
                  label={ko ? '초대한 친구' : 'Friends invited'}
                  accent="primary"
                />
                <StudyMetric
                  icon={Sparkles}
                  value={data.stats.creditsEarned}
                  label={ko ? '받은 크레딧' : 'Credits earned'}
                  accent="emerald"
                />
              </div>

              <RedeemBox ko={ko} onRedeemed={() => void load()} />
            </>
          )}
        </div>
      </StudyPageTransition>
    </StudyScrollShell>
  )
}

function ShareCard({ code, reward, ko }: { code: string; reward: number; ko: boolean }) {
  const [copied, setCopied] = useState(false)

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/mobile/study?ref=${encodeURIComponent(code)}`
    : ''

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (older webview / permissions) — no-op; the
      // code is displayed in full so the student can copy it manually.
    }
  }, [])

  // Share routing: native (Capacitor) uses the OS share sheet — which
  // lists KakaoTalk when it's installed — via @capacitor/share; web uses
  // the Kakao JS SDK when a key is configured. Either way, copy-link is the
  // fallback. On web without a Kakao key the button stays a disabled
  // placeholder below.
  const [isNative, setIsNative] = useState(false)
  useEffect(() => { setIsNative(Capacitor.isNativePlatform()) }, [])
  const kakaoEnabled = isKakaoShareEnabled()
  const canShare = isNative || kakaoEnabled
  const doShare = useCallback(async () => {
    const text = ko
      ? `Classraum에서 함께 공부해요! 초대 코드 "${code}"를 입력하면 친구도 나도 테스트 크레딧 ${reward}개씩 받아요.`
      : `Study with me on Classraum! Use my invite code "${code}" and we each get ${reward} test credits.`
    if (isNative) {
      try {
        await Share.share({ text, url: inviteLink, dialogTitle: ko ? '친구 초대' : 'Invite a friend' })
      } catch {
        // User dismissed the sheet, or share unavailable — offer copy.
        void copy(inviteLink)
      }
      return
    }
    const ok = await shareToKakao({
      text,
      link: inviteLink,
      buttonTitle: ko ? '초대 코드 받기' : 'Get the code',
    })
    if (!ok) void copy(inviteLink)
  }, [isNative, ko, code, reward, inviteLink, copy])

  return (
    <section className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
          {ko ? '내 초대 코드' : 'Your invite code'}
        </p>
        <div className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-primary/5 ring-1 ring-primary/20">
          <span className="text-[32px] font-bold tracking-[0.18em] text-primary tabular-nums select-all">
            {code}
          </span>
        </div>
        <p className="text-[12.5px] text-gray-500 mt-3 leading-relaxed">
          {ko
            ? `친구가 이 코드를 입력하면 친구도 나도 크레딧 ${reward}개씩 받아요.`
            : `When a friend redeems this code, you both get ${reward} credits.`}
        </p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => void copy(inviteLink)}
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] hover:opacity-95 active:scale-[0.99] transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied
            ? (ko ? '복사됐어요!' : 'Copied!')
            : (ko ? '초대 링크 복사' : 'Copy invite link')}
        </button>

        {/* Share — native uses the OS share sheet (@capacitor/share), which
            includes KakaoTalk; web uses the Kakao JS SDK when a key is set.
            Web without a key falls back to a disabled "준비 중" placeholder. */}
        {isNative ? (
          <button
            type="button"
            onClick={() => void doShare()}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] hover:opacity-95 active:scale-[0.99] transition"
          >
            <Share2 className="w-4 h-4" />
            {ko ? '친구에게 공유' : 'Share with a friend'}
          </button>
        ) : canShare ? (
          <button
            type="button"
            onClick={() => void doShare()}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#FEE500] text-[#191600] text-[14px] font-semibold ring-1 ring-[#FEE500] hover:brightness-95 active:scale-[0.99] transition"
          >
            <KakaoIcon className="w-[18px] h-[18px]" />
            {ko ? '카카오톡으로 공유' : 'Share on KakaoTalk'}
          </button>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={ko ? '곧 제공됩니다' : 'Coming soon'}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#FEE500]/60 text-[#3C1E1E]/70 text-[14px] font-semibold ring-1 ring-[#FEE500]/70 cursor-not-allowed"
          >
            <KakaoIcon className="w-[18px] h-[18px]" />
            {ko ? '카카오톡으로 공유' : 'Share on KakaoTalk'}
            <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-black/10">
              {ko ? '준비 중' : 'Soon'}
            </span>
          </button>
        )}
      </div>
    </section>
  )
}

function RedeemBox({ ko, onRedeemed }: { ko: boolean; onRedeemed: () => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'submitting'>('idle')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Prefill from a ?ref=CODE deep link if present.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setCode(ref.toUpperCase())
  }, [])

  const errorText = useCallback((errCode: string | undefined): string => {
    switch (errCode) {
      case 'already_redeemed':
        return ko ? '이미 초대 코드를 사용했어요.' : "You've already redeemed a code."
      case 'self_referral':
        return ko ? '본인 코드는 사용할 수 없어요.' : "You can't redeem your own code."
      case 'unknown_code':
        return ko ? '존재하지 않는 코드예요.' : "That code doesn't exist."
      case 'missing_code':
        return ko ? '코드를 입력해 주세요.' : 'Please enter a code.'
      default:
        return ko ? '코드를 사용할 수 없어요. 다시 시도해 주세요.' : "Couldn't redeem that code. Please try again."
    }
  }, [ko])

  const submit = useCallback(async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed || state === 'submitting') return
    setState('submitting')
    setMessage(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/referral/redeem', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: trimmed }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: 'error', text: errorText(json?.code) })
        return
      }
      const added = typeof json?.creditsAdded === 'number' ? json.creditsAdded : 0
      setMessage({
        kind: 'success',
        text: added > 0
          ? (ko ? `크레딧 ${added}개가 지급됐어요!` : `${added} credits added!`)
          : (ko ? '코드를 사용했어요!' : 'Code redeemed!'),
      })
      setCode('')
      onRedeemed()
    } catch {
      setMessage({ kind: 'error', text: errorText(undefined) })
    } finally {
      setState('idle')
    }
  }, [code, state, ko, errorText, onRedeemed])

  return (
    <section className="rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Ticket className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-semibold text-gray-900">
          {ko ? '친구 코드 입력' : 'Redeem a friend’s code'}
        </h2>
      </div>
      <p className="text-[12.5px] text-gray-500 leading-relaxed">
        {ko
          ? '친구에게 받은 코드를 입력하면 둘 다 크레딧을 받아요.'
          : 'Enter a code a friend shared and you both get credits.'}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') void submit() }}
          placeholder={ko ? '코드 입력' : 'Enter code'}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          className="flex-1 min-w-0 h-12 px-4 rounded-xl bg-white ring-1 ring-gray-200/70 text-[15px] font-semibold tracking-[0.12em] text-gray-900 uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!code.trim() || state === 'submitting'}
          className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-white text-[14px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {state === 'submitting'
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : (ko ? '적용' : 'Redeem')}
        </button>
      </div>
      {message && (
        <p className={`text-[12.5px] font-medium ${message.kind === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}
