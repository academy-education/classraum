"use client"

import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  CheckCircle2, AlertCircle, Loader2, CreditCard, Calendar, RotateCcw,
  XCircle, ExternalLink, Check, Sparkles, Coins,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { SkeletonBlock, SkeletonCard, SkeletonStickyHeader } from '../skeletons'
import { StudyPageHeader, StudyScrollShell } from '../_shared/primitives'
import { authHeaders } from '@/lib/auth-headers'
import { FREE_CREDITS } from '@/lib/study/plans'
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
  name_en: string
  name_ko: string
}

interface SubPayload {
  subscription: Subscription | null
  tier?: 'general' | 'premium'
  planMeta?: CatalogPlan
  credits?: { grant: number; purchased: number; total: number }
  catalog?: { plans: CatalogPlan[]; pack: { id: string; credits: number; priceWon: number }; packs?: { id: string; credits: number; priceWon: number }[] }
}

type Acting = 'cancel' | 'reactivate' | 'pack' | `checkout:${string}` | `change:${string}` | null

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
    { id: 'general_v1', tier: 'general', priceWon: 9900, monthlyCredits: 8, name_en: 'General', name_ko: '일반' },
    { id: 'premium_v1', tier: 'premium', priceWon: 16900, monthlyCredits: 20, name_en: 'Premium', name_ko: '프리미엄' },
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
  const credits = data?.credits ?? {
    grant: sub?.grant_credits_remaining ?? 0,
    purchased: sub?.purchased_credits_remaining ?? 0,
    total: (sub?.grant_credits_remaining ?? 0) + (sub?.purchased_credits_remaining ?? 0),
  }

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
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/subscription/purchase-pack', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        // No card on file (e.g. trial) → point them at checkout instead
        // of a dead error.
        if (body.code === 'no_billing_key') {
          throw new Error(ko ? '결제 수단을 먼저 등록해 주세요 — 플랜을 시작하면 등록됩니다.' : 'Add a payment method first — start a plan to set one up.')
        }
        throw new Error(typeof body.message === 'string' ? body.message : (ko ? '크레딧 구매에 실패했어요.' : 'Credit purchase failed.'))
      }
      await load()
      setSuccessMessage(ko
        ? `크레딧 ${credits}개가 추가되었어요.`
        : `${credits} credits added to your account.`)
    } catch (e) {
      setError((e instanceof Error && e.message) || (ko ? '크레딧 구매에 실패했어요.' : 'Credit purchase failed.'))
    } finally {
      setActing(null)
    }
  }, [acting, ko, load])

  if (loading) {
    // Settings surface → skeleton (Raumi is reserved for studying
    // screens). Mirrors the loaded layout: header → credit balance →
    // two plan cards.
    return (
      <StudyScrollShell header={<SkeletonStickyHeader />}>
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
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={CreditCard}
          eyebrow={ko ? '학습' : 'Study'}
          title={String(t('study.subscription.title'))}
          subtitle={String(t('study.subscription.subtitle'))}
        />
      }
    >
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

        {/* Credit balance — every generated mock test costs 1 credit. */}
        {sub && (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-[13px] text-gray-500">
                    {ko ? '테스트 크레딧' : 'Test credits'}
                  </div>
                  <div className="text-xl font-semibold tracking-tight text-gray-900 tabular-nums">
                    {credits.total}
                  </div>
                </div>
              </div>
              <StatusPill status={sub.status} cancelling={sub.cancel_at_period_end} />
            </div>
            <p className="text-[12.5px] text-gray-500 mt-3 leading-relaxed">
              {ko
                ? `모의고사 1회 생성에 크레딧 1개가 사용돼요. 이번 달 제공 ${credits.grant}개${credits.purchased > 0 ? ` + 구매 ${credits.purchased}개` : ''} 남았어요. 생성에 실패하면 크레딧은 자동으로 환불됩니다.`
                : `Each generated mock test uses 1 credit. ${credits.grant} from this month's grant${credits.purchased > 0 ? ` + ${credits.purchased} purchased` : ''} remaining. Failed generations are refunded automatically.`}
            </p>
            {/* Credit top-ups — open to any active member (General too),
                three sizes with a lower per-credit price on bigger packs.
                Native app hides in-app purchases (App Store IAP rules). */}
            {isActive && !isNative && (
              <div className="mt-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 mb-2">
                  {ko ? '크레딧 충전' : 'Top up credits'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {packs.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void buyPack(p.id, p.credits)}
                      disabled={acting !== null}
                      className="flex flex-col items-center justify-center gap-0.5 h-16 rounded-xl bg-amber-500/10 text-amber-700 ring-1 ring-amber-200/70 hover:bg-amber-500/15 active:scale-[0.98] disabled:opacity-60 transition-all"
                    >
                      {acting === 'pack' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span className="text-[14px] font-bold tabular-nums">+{p.credits}</span>
                          <span className="text-[11px] font-semibold tabular-nums">{formatWon(p.priceWon)}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trial / period banner */}
        {sub && (
          <div className="rounded-xl bg-gray-50/80 ring-1 ring-gray-200/50 px-4 py-3 text-[13.5px] text-gray-700 inline-flex items-start gap-2.5 w-full">
            <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
            <div className="leading-relaxed">
              {sub.cancel_at_period_end
                ? t('study.subscription.cancelsOn', { date: formatDate(sub.current_period_end, ko) })
                : sub.status === 'trial'
                  ? t('study.subscription.trialEnds', { date: formatDate(sub.current_period_end, ko) })
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

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isCurrent = currentPlanId === plan.id
            const isPending = isActive && sub?.pending_plan === plan.id
            const premium = plan.tier === 'premium'
            const isFreePlan = plan.id === 'free_v1'
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
                      <span className="text-sm font-normal text-gray-400"> / {t('study.subscription.month')}</span>
                    )}
                  </div>
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
                      className="h-11 rounded-full bg-white ring-1 ring-gray-200/70 text-gray-700 text-[13px] font-medium inline-flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t('study.subscription.subscribeOnWeb')}
                    </a>
                  )
                ) : isCurrent ? (
                  sub?.pending_plan ? (
                    <button
                      type="button"
                      onClick={() => void changePlan(plan.id)}
                      disabled={acting !== null}
                      className="h-11 rounded-full bg-white ring-1 ring-gray-200/70 text-gray-700 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 hover:ring-gray-300 active:scale-[0.98] disabled:opacity-60 transition-all"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      {ko ? '플랜 변경 취소' : 'Keep this plan'}
                    </button>
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
                      premium
                        ? 'bg-gradient-to-b from-violet-600 to-violet-600/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(124,58,237,0.28)]'
                        : 'bg-white ring-1 ring-gray-200/70 text-gray-700 hover:ring-gray-300'
                    }`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : premium ? <Sparkles className="w-4 h-4" /> : null}
                    {premium
                      ? (ko ? '프리미엄으로 업그레이드' : 'Upgrade to Premium')
                      : (ko ? '갱신일에 일반으로 변경' : 'Switch at renewal')}
                  </button>
                )}
                {!isNative && !isCurrent && isActive && (
                  <p className="text-[11.5px] text-gray-400 -mt-2 text-center leading-snug">
                    {premium
                      ? (ko ? '지금 결제되고 새 30일 기간이 시작돼요.' : 'Charged now — a fresh 30-day period starts.')
                      : (ko ? '다음 갱신일부터 적용돼요. 그 전까지 프리미엄이 유지됩니다.' : 'Applies at your next renewal. Premium stays until then.')}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Secondary actions */}
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
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={acting !== null}
                    className="flex-1 h-11 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-[13px] font-semibold inline-flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] active:scale-[0.98] disabled:opacity-60 transition-all"
                  >
                    {ko ? '계속 이용하기' : 'Keep subscription'}
                  </button>
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
            <button
              type="button"
              onClick={() => void act('reactivate')}
              disabled={acting !== null}
              className="w-full h-12 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {acting === 'reactivate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {t('study.subscription.reactivate')}
            </button>
          )}
        </div>

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

function formatDate(iso: string, ko: boolean): string {
  return new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
