"use client"

import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import Link from 'next/link'
import {
  CheckCircle2, AlertCircle, Loader2, CreditCard, Calendar, RotateCcw,
  XCircle, ExternalLink, Check, Sparkles, Coins, GraduationCap, Gift, Users, ChevronRight,
} from '@/app/mobile/study/_shared/icons'
import { useTranslation } from '@/hooks/useTranslation'
import { SkeletonBlock, SkeletonCard } from '../skeletons'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { StudyButton, studyButtonClass } from '../_shared/StudyButton'
import { authHeaders } from '@/lib/auth-headers'
import { FREE_CREDITS } from '@/lib/study/plans'
import { buyCreditPack } from '@/lib/study/purchase-credits'
import { track } from '@/lib/study/track-client'
import { PortOne } from '@/lib/portone-browser'
import { useAuth } from '@/contexts/AuthContext'

interface Subscription {
  status: 'free' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  plan: string
  pending_plan: string | null
  price_cents: number
  currency: string
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  grant_credits_remaining: number | null
  purchased_credits_remaining: number | null
}

interface CatalogPlan {
  id: string
  tier: 'general' | 'premium'
  priceWon: number
  monthlyCredits: number
  intervalDays: number
  name_en: string
  name_ko: string
}

interface PassInfo {
  id: string
  priceWon: number
  credits: number
  examDate: string | null
  durationDays: number | null
  daysToExam: number | null
  name_en: string
  name_ko: string
  blurb_en: string
  blurb_ko: string
  offer: boolean
  onPass: boolean
}

interface SubPayload {
  subscription: Subscription | null
  tier?: 'general' | 'premium'
  planMeta?: CatalogPlan
  credits?: { grant: number; purchased: number; total: number }
  catalog?: { plans: CatalogPlan[]; pack: { id: string; credits: number; priceWon: number }; packs?: { id: string; credits: number; priceWon: number }[] }
  passes?: PassInfo[]
}

type Acting = 'cancel' | 'reactivate' | 'pack' | 'pass' | `checkout:${string}` | `change:${string}` | null

/**
 * /mobile/study/subscription — plans, credits, and billing management.
 *
 * Two tiers (General / Premium) with a monthly test-credit grant.
 * - New / lapsed users: pick a plan card → PortOne billing-key
 *   checkout charges the first month.
 * - Active users: the other plan's card becomes an upgrade (charged
 *   immediately, fresh period) or downgrade (scheduled for renewal,
 *   cancellable).
 * - Premium actives can buy 5-credit top-up packs charged to the
 *   stored billing key.
 *
 * Native Capacitor clients (iOS especially) can't show purchase CTAs
 * without violating Apple's anti-steering rules, so all money buttons
 * collapse into a "manage on classraum.com" link there.
 */
export default function SubscriptionPage() {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const ko = language === 'korean'
  const [data, setData] = useState<SubPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<Acting>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isNative, setIsNative] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cycleDays, setCycleDays] = useState<number>(30)
  useEffect(() => { setIsNative(Capacitor.isNativePlatform()) }, [])

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription', { headers })
      if (!res.ok) throw new Error()
      setData(await res.json() as SubPayload)
    } catch {
      setError(t('study.subscription.loadFailed') as string)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  // The feedback banner sits under the header; actions fire from the
  // bottom of a tall page, so bring the result into view.
  useEffect(() => {
    if (error || successMessage) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [error, successMessage])

  const sub = data?.subscription ?? null
  // Fallback catalog so the page still renders plan cards if the API
  // payload predates the tier era (e.g. cached response).
  const plans: CatalogPlan[] = data?.catalog?.plans ?? [
    { id: 'general_v1', tier: 'general', priceWon: 9900, monthlyCredits: 8, intervalDays: 30, name_en: 'General', name_ko: '일반' },
    { id: 'premium_v1', tier: 'premium', priceWon: 16900, monthlyCredits: 20, intervalDays: 30, name_en: 'Premium', name_ko: '프리미엄' },
  ]
  const pack = data?.catalog?.pack ?? { id: 'pack5_v1', credits: 5, priceWon: 6900 }
  const packs = data?.catalog?.packs ?? [pack]

  const isActive = sub?.status === 'active'
  const isTrial = sub?.status === 'trial'
  const isFree = !sub || sub.status === 'free'
  // Anyone not on a live paid subscription goes through checkout to
  // start one — free users, lapsed subscribers, and legacy trials.
  const needsCheckout = isFree || sub?.status === 'expired' || sub?.status === 'cancelled' || sub?.status === 'past_due' || isTrial
  const currentPlanId = isActive
    ? (data?.planMeta?.id ?? sub?.plan ?? null)
    : isFree ? 'free_v1' : null
  // Exam-sitting passes — one-time seasonal Premium passes surfaced
  // outside the recurring plan grid. An active pass hides the plan grid /
  // cancel-reactivate; in-season offers render as purchase CTAs (web only).
  const passes = data?.passes ?? []
  const activePass = passes.find(p => p.onPass) ?? null
  const onPass = activePass !== null
  const passOffers = isNative ? [] : passes.filter(p => p.offer)
  const credits = data?.credits ?? {
    grant: sub?.grant_credits_remaining ?? 0,
    purchased: sub?.purchased_credits_remaining ?? 0,
    total: (sub?.grant_credits_remaining ?? 0) + (sub?.purchased_credits_remaining ?? 0),
  }

  // Duration toggle (월간 / 3개월 / 6개월 / 연간). Free (interval 30, price 0)
  // always shows; paid plans filter to the selected cadence. Durations are
  // derived from whatever the catalog actually offers, so adding/removing a
  // prepaid SKU needs no UI change. Default to the cadence the user is on.
  const availableDurations = Array.from(
    new Set(plans.filter(p => p.priceWon > 0).map(p => p.intervalDays)),
  ).sort((a, b) => a - b)
  const currentPlanInterval = plans.find(p => p.id === currentPlanId)?.intervalDays
  useEffect(() => {
    if (currentPlanInterval && currentPlanInterval !== 30) setCycleDays(currentPlanInterval)
  }, [currentPlanInterval])
  const displayedPlans = plans.filter(p => p.id === 'free_v1' || p.intervalDays === cycleDays)
  // Per-tier monthly price, so longer-cadence cards can show the equivalent
  // month-by-month cost struck through and the savings.
  const monthlyPriceByTier: Record<string, number> = {}
  for (const p of plans) if (p.intervalDays === 30 && p.priceWon > 0) monthlyPriceByTier[p.tier] = p.priceWon
  // Plan-switch direction is set by price, not tier: switching a monthly
  // plan to its annual version costs more → immediate-charge upgrade,
  // while a cheaper target is a downgrade scheduled for renewal. (The
  // change-plan route uses the same priceWon comparison.)
  const currentPrice = plans.find(p => p.id === currentPlanId)?.priceWon ?? 0

  const act = useCallback(async (kind: 'cancel' | 'reactivate') => {
    setActing(kind)
    setConfirmingCancel(false)
    setError(null)
    setSuccessMessage(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/study/subscription/${kind}`, { method: 'POST', headers })
      if (!res.ok) throw new Error()
      await load()
      setSuccessMessage(t(`study.subscription.${kind}Success`) as string)
    } catch {
      setError(t(`study.subscription.${kind}Failed`) as string)
    } finally {
      setActing(null)
    }
  }, [load, t])

  /**
   * New-subscription flow: issue a billing key via the PortOne
   * overlay, then let the server charge the chosen plan's first month.
   */
  const subscribe = useCallback(async (planId: string) => {
    if (acting !== null) return
    setActing(`checkout:${planId}`)
    setError(null)
    setSuccessMessage(null)
    track('checkout_started', { kind: 'subscription', plan: planId })
    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) throw new Error('PortOne not configured')

      const issueId = `study-issue-${user?.id ?? 'anon'}-${Date.now()}`
      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId,
        issueName: 'Classraum Study subscription',
        customer: { customerId: user?.id, email: user?.email ?? undefined },
        customData: { kind: 'study_subscription', plan: planId },
      })

      if (!issued?.billingKey) {
        // User cancelled the overlay or PortOne returned an error code.
        if (issued?.code) {
          setError(issued.message ?? t('study.subscription.checkoutFailed') as string)
        }
        return
      }

      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription/billing-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ billingKey: issued.billingKey, plan: planId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.message === 'string' ? body.message : 'charge failed')
      }
      await load()
      setSuccessMessage(t('study.subscription.checkoutSuccess') as string)
    } catch (e) {
      setError((e instanceof Error && e.message) || (t('study.subscription.checkoutFailed') as string))
    } finally {
      setActing(null)
    }
  }, [acting, load, t, user])

  /**
   * 수능 대비 패스 purchase — same PortOne billing-key overlay as a new
   * subscription, but the server charges once and writes a seasonal
   * Premium pass (no recurring renewal).
   */
  const buyPass = useCallback(async (passId: string, issueName: string) => {
    if (acting !== null) return
    setActing('pass')
    setError(null)
    setSuccessMessage(null)
    track('checkout_started', { kind: 'pass', passId })
    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) throw new Error('PortOne not configured')

      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: `study-pass-issue-${user?.id ?? 'anon'}-${Date.now()}`,
        issueName,
        customer: { customerId: user?.id, email: user?.email ?? undefined },
        customData: { kind: 'study_exam_pass', passId },
      })
      if (!issued?.billingKey) {
        if (issued?.code) setError(issued.message ?? (t('study.subscription.checkoutFailed') as string))
        return
      }

      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription/purchase-pass', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingKey: issued.billingKey, passId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof body.message === 'string' ? body.message : (ko ? '패스 구매에 실패했어요.' : 'Pass purchase failed.'))
      }
      await load()
      setSuccessMessage(ko ? '패스가 활성화되었어요!' : 'Your pass is active!')
    } catch (e) {
      setError((e instanceof Error && e.message) || (ko ? '패스 구매에 실패했어요.' : 'Pass purchase failed.'))
    } finally {
      setActing(null)
    }
  }, [acting, ko, load, t, user])

  /** Active-subscription plan switch (upgrade now / downgrade at renewal). */
  const changePlan = useCallback(async (planId: string) => {
    if (acting !== null) return
    setActing(`change:${planId}`)
    setError(null)
    setSuccessMessage(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription/change-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: planId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof body.message === 'string' ? body.message : (ko ? '플랜 변경에 실패했어요.' : 'Plan change failed.'))
      }
      await load()
      setSuccessMessage(ko ? '플랜이 변경되었어요.' : 'Your plan has been updated.')
    } catch (e) {
      setError((e instanceof Error && e.message) || (ko ? '플랜 변경에 실패했어요.' : 'Plan change failed.'))
    } finally {
      setActing(null)
    }
  }, [acting, ko, load])

  const buyPack = useCallback(async (packId: string, credits: number) => {
    if (acting !== null) return
    setActing('pack')
    setError(null)
    setSuccessMessage(null)
    track('checkout_started', { kind: 'pack', packId })
    // Shared flow: charges a stored card, or issues one via the PortOne
    // overlay for card-less (free) buyers, then retries.
    const r = await buyCreditPack(packId, user)
    if (r.ok) {
      await load()
      setSuccessMessage(ko ? `크레딧 ${credits}개가 추가되었어요.` : `${credits} credits added to your account.`)
    } else if (r.error) {
      setError(r.error)
    }
    setActing(null)
  }, [acting, ko, load, user])

  // Header has a static title, so render it immediately during load too
  // (only the body swaps to a skeleton) — the study-wide standard for
  // static-title pages. Raumi is reserved for studying screens.
  const header = (
    <StudyPageHeader
      backHref="/mobile/study"
      backLabel={String(t('study.topic.backToStudy'))}
      icon={CreditCard}
      eyebrow={ko ? '학습' : 'Study'}
      title={String(t('study.subscription.title'))}
      subtitle={String(t('study.subscription.subtitle'))}
    />
  )

  if (loading) {
    // Skeleton body mirroring the loaded layout: credit balance → two
    // plan cards.
    return (
      <StudyScrollShell header={header}>
        <SkeletonCard className="p-5 space-y-3">
          <SkeletonBlock className="h-3 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-2.5 w-3/5 rounded-full" />
        </SkeletonCard>
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <SkeletonCard key={i} className="p-5 space-y-4 min-h-[280px]">
              <SkeletonBlock className="h-3 w-20 rounded-full" />
              <SkeletonBlock className="h-7 w-28 rounded-lg" />
              <div className="space-y-2.5 pt-2">
                {[0, 1, 2, 3].map(j => <SkeletonBlock key={j} className="h-3 w-full rounded-full" />)}
              </div>
              <SkeletonBlock className="h-11 w-full rounded-full" />
            </SkeletonCard>
          ))}
        </div>
      </StudyScrollShell>
    )
  }

  return (
    <StudyScrollShell header={header}>
        {/* Action feedback lives directly under the header — at the old
            bottom-of-page spot it rendered off-screen after cancel/
            checkout and the page looked like nothing happened. */}
        {(error || successMessage) && (
          <div className={`rounded-2xl px-4 py-3 text-[13.5px] flex items-start gap-2.5 ring-1 ${
            error ? 'bg-rose-50/80 ring-rose-200/60 text-rose-700' : 'bg-emerald-50/80 ring-emerald-200/60 text-emerald-700'
          }`}>
            {error ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span className="leading-relaxed">{error ?? successMessage}</span>
          </div>
        )}

        {/* Credit balance — every generated AI mock test costs 1 credit. */}
        {sub && (
          <div className="rounded-2xl bg-gradient-to-br from-amber-50/70 via-white to-white ring-1 ring-amber-200/50 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-[12px] font-medium text-gray-500">
                    {ko ? '테스트 크레딧' : 'Test credits'}
                  </div>
                  <div className="text-[28px] leading-none font-bold tracking-tight text-gray-900 tabular-nums mt-1">
                    {credits.total}
                  </div>
                </div>
              </div>
              <StatusPill status={sub.status} cancelling={sub.cancel_at_period_end} />
            </div>

            {/* Breakdown — monthly grant vs never-expiring purchased. */}
            <div className="flex flex-wrap items-center gap-1.5 mt-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-gray-200/70 text-[12px] text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {isFree ? (ko ? '가입 크레딧' : 'Starter') : (ko ? '이번 달' : 'Monthly')}
                <b className="tabular-nums text-gray-900 font-semibold">{credits.grant}</b>
              </span>
              {credits.purchased > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-gray-200/70 text-[12px] text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {ko ? '구매' : 'Purchased'}
                  <b className="tabular-nums text-gray-900 font-semibold">{credits.purchased}</b>
                </span>
              )}
              <span className="text-[11.5px] text-gray-400 ml-auto">
                {ko ? '모의고사 1회 = 크레딧 1개' : '1 mock test = 1 credit'}
              </span>
            </div>
            <p className="text-[11.5px] text-gray-400 mt-1.5">
              {ko ? '생성에 실패하면 크레딧은 자동으로 환불돼요.' : 'Failed generations are refunded automatically.'}
            </p>
          </div>
        )}

        {/* Buy credits — its own card so it's always visible on web, even
            for users with no subscription row yet. Open to everyone (free &
            General included; card-less buyers register a card in the flow).
            Native app hides in-app purchases (App Store IAP rules). */}
        {!isNative && (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{ko ? '크레딧 충전' : 'Buy credits'}</p>
                  <p className="text-[11.5px] text-gray-400">{ko ? '구매 크레딧은 만료 없음 · 모의고사 1회 = 1개' : 'Never expire · 1 mock test = 1 credit'}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {packs.map((p, i) => {
                const best = i === packs.length - 1 && packs.length > 1
                const perCredit = Math.round(p.priceWon / p.credits)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void buyPack(p.id, p.credits)}
                    disabled={acting !== null}
                    className={`relative flex flex-col items-center justify-center gap-0.5 h-[80px] rounded-xl active:scale-[0.98] disabled:opacity-60 transition-all ${
                      best
                        ? 'bg-amber-500 text-white ring-1 ring-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
                        : 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-200/70 hover:bg-amber-500/15'
                    }`}
                  >
                    {best && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gray-900 text-white text-[9px] font-bold whitespace-nowrap">
                        {ko ? '최고 혜택' : 'Best value'}
                      </span>
                    )}
                    {acting === 'pack' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-[16px] font-bold tabular-nums">+{p.credits}</span>
                        <span className="text-[12px] font-semibold tabular-nums">{formatWon(p.priceWon)}</span>
                        <span className={`text-[9.5px] tabular-nums ${best ? 'text-amber-100' : 'text-amber-600/70'}`}>
                          {ko ? `개당 ₩${perCredit.toLocaleString()}` : `₩${perCredit.toLocaleString()}/ea`}
                        </span>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Exam pass — active banner */}
        {onPass && sub && activePass && (
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-white ring-1 ring-rose-200/70 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-600">
                  {ko ? activePass.name_ko : activePass.name_en}
                </div>
                <div className="text-[15px] font-semibold text-gray-900">
                  {ko ? '프리미엄 이용 중' : 'Premium active'}
                </div>
              </div>
            </div>
            <p className="text-[12.5px] text-gray-500 mt-3 leading-relaxed">
              {ko
                ? `시험일(${formatDate(sub.current_period_end, ko)})까지 모든 프리미엄 기능을 이용할 수 있어요. 이후 자동으로 무료 플랜으로 전환됩니다.`
                : `Full Premium access through your exam day (${formatDate(sub.current_period_end, ko)}). You'll move to the free plan automatically after that.`}
            </p>
          </div>
        )}

        {/* Exam passes — purchase offers (in-season, web, not on a paid plan) */}
        {passOffers.map(p => (
          <div key={p.id} className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white shadow-[0_8px_24px_-12px_rgba(225,29,72,0.5)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">
              <GraduationCap className="w-4 h-4" />
              {ko ? p.name_ko : p.name_en}
              {p.daysToExam !== null && p.daysToExam > 0 ? (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tabular-nums">
                  D-{p.daysToExam}
                </span>
              ) : p.durationDays ? (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tabular-nums">
                  {ko ? `${Math.round(p.durationDays / 30)}개월` : `${Math.round(p.durationDays / 30)}M`}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">{formatWon(p.priceWon)}</div>
            <p className="text-[13px] text-rose-50 mt-1.5 leading-relaxed">
              {ko
                ? `${p.blurb_ko} + 테스트 크레딧 ${p.credits}개. 한 번 결제로 끝.`
                : `${p.blurb_en} + ${p.credits} test credits. One payment, done.`}
            </p>
            <button
              type="button"
              onClick={() => void buyPass(p.id, ko ? p.name_ko : p.name_en)}
              disabled={acting !== null}
              className="mt-3.5 w-full h-11 rounded-full bg-white text-rose-600 text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-70 transition-all"
            >
              {acting === 'pass' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
              {ko ? '패스 구매하기' : 'Get the pass'}
            </button>
          </div>
        ))}

        {/* Period banner — only meaningful for a live paid subscription
            (renews on / cancels on). Free, expired, and lapsed rows have
            no upcoming billing date, so no banner. */}
        {sub && !onPass && isActive && (
          <div className="rounded-xl bg-gray-50/80 ring-1 ring-gray-200/50 px-4 py-3 text-[13.5px] text-gray-700 inline-flex items-start gap-2.5 w-full">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <div className="leading-relaxed">
              {sub.cancel_at_period_end
                ? t('study.subscription.cancelsOn', { date: formatDate(sub.current_period_end, ko) })
                : t('study.subscription.renewsOn', { date: formatDate(sub.current_period_end, ko) })}
              {isActive && sub.pending_plan && (
                <span className="block text-amber-700 mt-0.5">
                  {ko
                    ? `다음 갱신일에 ${planName(plans, sub.pending_plan, ko)} 플랜으로 변경돼요.`
                    : `Switching to the ${planName(plans, sub.pending_plan, ko)} plan at your next renewal.`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Billing-duration toggle — one segment per cadence the catalog
            offers (월간 / 3개월 / 6개월 / 연간). Horizontal-scrolls if it
            overflows on narrow phones. */}
        {!onPass && availableDurations.length > 1 && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-gray-100/80 ring-1 ring-gray-200/60 max-w-full overflow-x-auto">
              {availableDurations.map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setCycleDays(days)}
                  className={`px-3.5 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                    cycleDays === days
                      ? 'bg-white text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {durationLabel(days, ko)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan cards */}
        {!onPass && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedPlans.map(plan => {
            const isCurrent = currentPlanId === plan.id
            const isPending = isActive && sub?.pending_plan === plan.id
            const premium = plan.tier === 'premium'
            const isFreePlan = plan.id === 'free_v1'
            const isUpgrade = isActive && !isCurrent && plan.priceWon > currentPrice
            const busy = acting === `checkout:${plan.id}` || acting === `change:${plan.id}`
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 flex flex-col gap-4 ring-1 transition-all ${
                  premium
                    ? 'bg-gradient-to-br from-violet-50/60 via-white to-white ring-violet-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_28px_-16px_rgba(124,58,237,0.22)]'
                    : 'bg-white ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${premium ? 'text-violet-600' : 'text-primary/80'}`}>
                      {premium && <Sparkles className="w-3.5 h-3.5" />}
                      {ko ? plan.name_ko : plan.name_en}
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        {ko ? '현재 플랜' : 'Current plan'}
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        {ko ? '변경 예정' : 'Scheduled'}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-semibold tracking-tight text-gray-900">
                    {formatWon(plan.priceWon)}
                    {!isFreePlan && (
                      <span className="text-sm font-normal text-gray-400"> / {durationUnit(plan.intervalDays, ko, t)}</span>
                    )}
                  </div>
                  {plan.intervalDays > 30 && monthlyPriceByTier[plan.tier] && (() => {
                    const months = Math.round(plan.intervalDays / 30)
                    const equiv = monthlyPriceByTier[plan.tier]! * months
                    const saved = equiv - plan.priceWon
                    return saved > 0 ? (
                      <div className="text-[12.5px] text-gray-500 mt-1">
                        <span className="line-through text-gray-400">{formatWon(equiv)}</span>
                        {' · '}
                        <span className="text-emerald-600 font-medium">
                          {ko ? `${formatWon(saved)} 절약` : `Save ${formatWon(saved)}`}
                        </span>
                      </div>
                    ) : null
                  })()}
                </div>

                <ul className="space-y-2 text-[13px] text-gray-600 flex-1">
                  <Feature ok>
                    {isFreePlan
                      ? (ko ? `가입 시 AI 테스트 크레딧 ${FREE_CREDITS}개 (1회)` : `${FREE_CREDITS} AI test credits at signup (one-time)`)
                      : (ko ? `매달 테스트 크레딧 ${plan.monthlyCredits}개` : `${plan.monthlyCredits} test credits every month`)}
                  </Feature>
                  <Feature ok>
                    {ko ? '문제 연습 · 플래시카드 무제한' : 'Unlimited practice & flashcards'}
                  </Feature>
                  <Feature ok={premium}>
                    {ko ? '스피킹 음성 채점 (TOEFL)' : 'Audio Speaking grading (TOEFL)'}
                  </Feature>
                  <Feature ok={premium}>
                    {premium
                      ? (ko ? '스냅 풀이 무제한' : 'Unlimited snap-to-solve')
                      : (ko ? '스냅 풀이 하루 5회' : 'Snap-to-solve 5/day')}
                  </Feature>
                  <Feature ok={premium}>
                    {ko ? '점수 추이 + 상세 분석' : 'Score trend + analytics'}
                  </Feature>
                  <Feature ok={!isFreePlan}>
                    {ko ? '크레딧 추가 구매 가능' : 'Buy extra credit packs'}
                  </Feature>
                </ul>

                {isFreePlan && !isCurrent ? (
                  <div className="h-11 rounded-full bg-gray-50 ring-1 ring-gray-200/50 text-gray-400 text-[12.5px] font-medium inline-flex items-center justify-center text-center px-3">
                    {ko ? '유료 플랜이 없을 때 자동 적용돼요' : 'Applied automatically without a paid plan'}
                  </div>
                ) : isNative ? (
                  !isCurrent && (
                    <a
                      href="https://app.classraum.com/mobile/study/subscription"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={studyButtonClass({ variant: 'secondary' })}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t('study.subscription.subscribeOnWeb')}
                    </a>
                  )
                ) : isCurrent ? (
                  sub?.pending_plan ? (
                    <StudyButton
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={() => void changePlan(plan.id)}
                      disabled={acting !== null}
                      loading={busy}
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                    >
                      {ko ? '플랜 변경 취소' : 'Keep this plan'}
                    </StudyButton>
                  ) : (
                    <div className="h-11 rounded-full bg-gray-50 ring-1 ring-gray-200/50 text-gray-400 text-[13px] font-medium inline-flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      {ko ? '이용 중' : 'Your plan'}
                    </div>
                  )
                ) : needsCheckout ? (
                  <button
                    type="button"
                    onClick={() => void subscribe(plan.id)}
                    disabled={acting !== null}
                    className={`h-11 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60 transition-all ${
                      premium
                        ? 'bg-gradient-to-b from-violet-600 to-violet-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(124,58,237,0.28)]'
                        : 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)]'
                    }`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {ko ? `${plan.name_ko} 시작하기` : `Start ${plan.name_en}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void changePlan(plan.id)}
                    disabled={acting !== null}
                    className={`h-11 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60 transition-all ${
                      isUpgrade
                        ? premium
                          ? 'bg-gradient-to-b from-violet-600 to-violet-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(124,58,237,0.28)]'
                          : 'bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)]'
                        : 'bg-white ring-1 ring-gray-200/70 text-gray-700 hover:ring-gray-300'
                    }`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isUpgrade && premium ? <Sparkles className="w-4 h-4" /> : null}
                    {isUpgrade
                      ? premium
                        ? (ko ? '프리미엄으로 업그레이드' : 'Upgrade to Premium')
                        : (ko ? '이 플랜으로 업그레이드' : 'Upgrade to this plan')
                      : (ko ? '갱신일에 변경' : 'Switch at renewal')}
                  </button>
                )}
                {!isNative && !isCurrent && isActive && (
                  <p className="text-[11.5px] text-gray-400 -mt-2 text-center leading-snug">
                    {isUpgrade
                      ? plan.intervalDays === 365
                        ? (ko ? '지금 결제되고 새 1년 기간이 시작돼요.' : 'Charged now — a fresh 1-year period starts.')
                        : (ko ? '지금 결제되고 새 30일 기간이 시작돼요.' : 'Charged now — a fresh 30-day period starts.')
                      : (ko ? '다음 갱신일부터 적용돼요. 그 전까지 현재 플랜이 유지됩니다.' : 'Applies at your next renewal. Your current plan stays until then.')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        )}

        {/* Gift + referral entry points — each on its own full-width row
            (both pages self-gate native). */}
        <div className="space-y-2.5">
          <Link
            href="/mobile/study/gift"
            className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-gray-200/60 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-gray-300 active:scale-[0.98] transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-gray-900 truncate">{ko ? '프리미엄 선물' : 'Gift Premium'}</span>
              <span className="block text-[11.5px] text-gray-400 truncate">{ko ? '3개월 선물하기' : 'Give 3 months'}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
          </Link>
          <Link
            href="/mobile/study/referral"
            className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-gray-200/60 p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-gray-300 active:scale-[0.98] transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-gray-900 truncate">{ko ? '친구 초대' : 'Refer a friend'}</span>
              <span className="block text-[11.5px] text-gray-400 truncate">{ko ? '가입 시 1개 + 프리미엄 시 10개' : '1 credit + 10 on Premium'}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
          </Link>
        </div>

        {/* Secondary actions */}
        {!onPass && (
        <div className="space-y-2.5">
          {sub && (isTrial || isActive) && !sub.cancel_at_period_end && (
            confirmingCancel ? (
              // Confirm step — cancelling a paid plan must never be one
              // accidental tap. States what happens and when before the
              // destructive action goes through.
              <div className="rounded-2xl bg-white ring-1 ring-rose-200/70 p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <p className="text-[13.5px] text-gray-700 leading-relaxed">
                  {ko
                    ? `구독을 해지할까요? ${formatDate(sub.current_period_end, ko)}까지는 그대로 이용할 수 있고, 이후 무료 플랜으로 전환돼요.`
                    : `Cancel your subscription? You keep full access until ${formatDate(sub.current_period_end, ko)}, then you move to the free plan.`}
                </p>
                <div className="flex gap-2.5">
                  <StudyButton
                    type="button"
                    variant="primary"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={acting !== null}
                    className="flex-1"
                  >
                    {ko ? '계속 이용하기' : 'Keep subscription'}
                  </StudyButton>
                  <button
                    type="button"
                    onClick={() => void act('cancel')}
                    disabled={acting !== null}
                    className="flex-1 h-11 rounded-full bg-white ring-1 ring-rose-200/80 text-rose-600 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-rose-50/60 active:scale-[0.98] disabled:opacity-60 transition-all"
                  >
                    {acting === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {ko ? '해지하기' : 'Cancel plan'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                disabled={acting !== null}
                className="w-full h-12 rounded-full bg-white ring-1 ring-gray-200/70 text-rose-600 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:ring-rose-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:scale-[0.98] disabled:opacity-60 transition-all"
              >
                <XCircle className="w-4 h-4" />
                {t('study.subscription.cancel')}
              </button>
            )
          )}

          {sub?.cancel_at_period_end && (
            <StudyButton
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => void act('reactivate')}
              disabled={acting !== null}
              loading={acting === 'reactivate'}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              {t('study.subscription.reactivate')}
            </StudyButton>
          )}
        </div>
        )}

    </StudyScrollShell>
  )
}

function Feature({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${ok ? '' : 'text-gray-400'}`}>
      {ok
        ? <Check className="w-4 h-4 mt-[1px] flex-shrink-0 text-emerald-500" />
        : <XCircle className="w-4 h-4 mt-[1px] flex-shrink-0 text-gray-300" />}
      <span className="leading-snug">{children}</span>
    </li>
  )
}

function StatusPill({ status, cancelling }: { status: Subscription['status']; cancelling: boolean }) {
  const { t } = useTranslation()
  if (cancelling) {
    return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t('study.subscription.statusCancelling')}</span>
  }
  const map: Record<Subscription['status'], { cls: string; label: string }> = {
    free:      { cls: 'bg-gray-100 text-gray-700 ring-gray-200',         label: t('study.subscription.statusFree') as string },
    trial:     { cls: 'bg-primary/10 text-primary ring-primary/30',     label: t('study.subscription.statusTrial') as string },
    active:    { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: t('study.subscription.statusActive') as string },
    past_due:  { cls: 'bg-amber-50 text-amber-700 ring-amber-200',       label: t('study.subscription.statusPastDue') as string },
    cancelled: { cls: 'bg-gray-100 text-gray-700 ring-gray-200',         label: t('study.subscription.statusCancelled') as string },
    expired:   { cls: 'bg-rose-50 text-rose-700 ring-rose-200',           label: t('study.subscription.statusExpired') as string },
  }
  const m = map[status]
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${m.cls}`}>{m.label}</span>
}

function planName(plans: CatalogPlan[], planId: string, ko: boolean): string {
  const p = plans.find(x => x.id === planId)
  if (!p) return planId
  return ko ? p.name_ko : p.name_en
}

function formatWon(won: number): string {
  return `₩${won.toLocaleString()}`
}

/** Toggle-segment label for a billing cadence (30 → 월간, 90 → 3M…). */
function durationLabel(days: number, ko: boolean): string {
  if (days === 30) return ko ? '월간' : 'Monthly'
  if (days === 365) return ko ? '연간' : 'Annual'
  const months = Math.round(days / 30)
  return ko ? `${months}개월` : `${months}M`
}

/** Per-price unit suffix (/ month, / 3M, / yr). */
function durationUnit(days: number, ko: boolean, t: (k: string) => unknown): string {
  if (days === 30) return String(t('study.subscription.month'))
  if (days === 365) return ko ? '년' : 'yr'
  const months = Math.round(days / 30)
  return ko ? `${months}개월` : `${months}M`
}

function formatDate(iso: string, ko: boolean): string {
  return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
