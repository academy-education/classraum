"use client"

/**
 * /pay/subscribe — the web checkout the native app hands off to.
 *
 * WHY IT EXISTS: the app cannot hand off to its own subscription screen.
 * `subscribeOnWebUrl()` used to send the buyer to
 *   /auth?intent=study&next=/mobile/study/subscription?plan=…
 * and `/mobile/*` is claimed as a Universal Link, so the moment sign-in
 * forwarded to `next`, iOS handed the URL back to the Classraum app —
 * "first she tried with the web only and then it led her back to the
 * app" (real buyer, 2026-08-13). `/pay/*` is unclaimed.
 *
 * IT SELLS ALL THREE THINGS, and that is a fix, not scope creep. Every
 * native CTA funnels through one hand-off — credit packs (packs grid),
 * exam passes (pass card) and plans all called handoffToWeb(id) — but
 * the URL builder only ever emitted `?plan=`. So a pack id was looked up
 * in STUDY_PLANS, missed, and the buyer got "알 수 없는 플랜이에요"; a
 * pass id did the same. Andy hit both within minutes of the first
 * deploy.
 *
 * Worse than the wrong label: passes and packs are ONE-TIME payments,
 * and this page ran billing-key card registration. Even a successful
 * lookup would have run the wrong flow and set up a recurring charge for
 * something that never renews. The three kinds are now distinct:
 *
 *   plan → requestIssueBillingKey  → /api/study/subscription/billing-key
 *   pass → requestOneTimePayment   → /api/study/subscription/purchase-pass
 *   pack → buyCreditPack()         (owns its own one-time flow)
 *
 * It still does NOT duplicate the subscription screen's management UI
 * (cancel, upgrade, held passes) — a hand-off does not need it, and two
 * copies of the money logic would drift.
 *
 * The path keeps the name /pay/subscribe even though it now sells
 * one-time items: it is already live, already allowlisted in middleware,
 * and renaming a payment return path again is a worse risk than a
 * slightly narrow name.
 */
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { db } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { track } from '@/lib/study/track-client'
import { PortOne } from '@/lib/portone-browser'
import { STUDY_PLANS } from '@/lib/study/plans'
import { resolveItem } from '@/lib/study/pay-item'
import { StudyButton } from '@/app/mobile/study/_shared/StudyButton'
import { cn } from '@/lib/utils'
import {
  billingCustomer, missingPhoneMessage, stashBillingIntent, billingRedirectUrl,
  billingIssueId, billingWindowType, offerPeriodFor, checkoutContext,
  requestOneTimePayment, buyCreditPack,
} from '@/lib/study/purchase-credits'

const PATH = '/pay/subscribe'

/**
 * useSearchParams() forces a client-side bailout, and Next FAILS THE BUILD
 * for a page that does it outside a Suspense boundary:
 *
 *   ⨯ useSearchParams() should be wrapped in a suspense boundary at page
 *     "/pay/subscribe"
 *
 * That is not a warning — `npm run build` exits 1 and NOTHING ships.
 * ac4f381 failed exactly this way while `tsc --noEmit` and 1602 jest
 * tests passed on the same tree: neither runs a production build.
 */
export default function PaySubscribePage() {
  return (
    <Suspense fallback={<Shell><Card><p className="text-[13px] text-gray-500">···</p></Card></Shell>}>
      <PaySubscribe />
    </Suspense>
  )
}

function PaySubscribe() {
  const router = useRouter()
  const params = useSearchParams()
  const ko = true
  const item = resolveItem(params, ko)

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Signed out → /auth, coming back HERE with the WHOLE query preserved
  // (?pass= and ?pack= would be dropped by a plan-only round-trip).
  useEffect(() => {
    void (async () => {
      const { data } = await db.auth.getUser()
      if (!data?.user) {
        const next = `${PATH}?${params.toString()}`
        router.replace(`/auth?intent=study&next=${encodeURIComponent(next)}`)
        return
      }
      setUser({ id: data.user.id, email: data.user.email ?? undefined })
      setReady(true)
    })()
  }, [params, router])

  const pay = useCallback(async () => {
    if (busy || !item || !user) return
    setBusy(true)
    setError(null)
    track('checkout_started', {
      kind: item.kind === 'plan' ? 'subscription' : item.kind,
      plan: item.kind === 'plan' ? item.id : undefined,
      passId: item.kind === 'pass' ? item.id : undefined,
      packId: item.kind === 'pack' ? item.id : undefined,
      surface: 'pay_web',
      ...checkoutContext(),
    })
    try {
      // Packs own their whole one-time flow (window + redemption), so
      // hand straight over rather than reimplementing it here.
      if (item.kind === 'pack') {
        const r = await buyCreditPack(item.id, user, ko)
        if (!r.ok) {
          if (!r.cancelled) setError(r.error ?? (ko ? '결제에 실패했어요.' : 'Payment failed.'))
          return
        }
        setDone(true)
        return
      }

      const customer = await billingCustomer(user)
      if (!customer.phoneNumber) { setError(missingPhoneMessage(ko)); return }

      if (item.kind === 'pass') {
        // A pass never renews → a normal one-time checkout window, NOT
        // billing-key card registration.
        stashBillingIntent({ kind: 'pass', passId: item.id, returnTo: '/mobile/study/subscription', ko })
        const paid = await requestOneTimePayment({
          paymentId: billingIssueId('pas', user.id),
          orderName: item.title,
          amountWon: item.priceWon,
          customer,
          customData: { kind: 'study_exam_pass', pass: item.id, student_id: user.id },
        })
        if (!paid.ok) {
          if (!paid.cancelled) setError(paid.error ?? (ko ? '결제에 실패했어요.' : 'Payment failed.'))
          return
        }
        const res = await fetch('/api/study/subscription/purchase-pass', {
          method: 'POST',
          headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: paid.paymentId, passId: item.id }),
        })
        const body = await res.json().catch(() => ({} as Record<string, unknown>))
        // already_processed = /pay/return beat us to the redemption; the
        // pass is active, so that is a success for the buyer.
        if (!res.ok && body.code !== 'already_processed') {
          throw new Error(typeof body.message === 'string' ? body.message : (ko ? '패스 구매에 실패했어요.' : 'Pass purchase failed.'))
        }
        track('checkout_result', { step: 'redeem', ok: true, kind: 'pass', surface: 'pay_web' })
        setDone(true)
        return
      }

      // plan — recurring, so a card is registered rather than charged once.
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) throw new Error('PortOne not configured')

      stashBillingIntent({ kind: 'plan', planId: item.id, returnTo: '/mobile/study/subscription', ko })
      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: billingIssueId('sub', user.id),
        issueName: 'Classraum Study subscription',
        customer,
        customData: { kind: 'study_subscription', plan: item.id, student_id: user.id },
        redirectUrl: billingRedirectUrl(),
        noticeUrls: [`${window.location.origin}/api/study/subscription/webhook`],
        windowType: billingWindowType(),
        offerPeriod: offerPeriodFor(STUDY_PLANS[item.id]?.intervalDays ?? 30),
      })
      // Mobile leaves via redirect and never resolves here; /pay/return
      // finishes it. This branch is the desktop Promise flow.
      if (!issued?.billingKey) {
        if (issued?.code) setError(issued.message ?? (ko ? '결제에 실패했어요.' : 'Payment failed.'))
        return
      }
      const res = await fetch('/api/study/subscription/billing-key', {
        method: 'POST',
        headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingKey: issued.billingKey, plan: item.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.message === 'string' ? body.message : 'charge failed')
      }
      track('checkout_result', { step: 'redeem', ok: true, kind: 'plan', surface: 'pay_web' })
      setDone(true)
    } catch (e) {
      setError((e instanceof Error && e.message) || (ko ? '결제에 실패했어요.' : 'Payment failed.'))
    } finally {
      setBusy(false)
    }
  }, [busy, item, user, ko])

  if (!item) {
    return (
      <Shell>
        <Card>
          <p className="text-[15px] font-semibold text-gray-900">
            {ko ? '알 수 없는 상품이에요' : 'Unknown item'}
          </p>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
            {ko ? '앱에서 다시 시도해 주세요.' : 'Please start again from the app.'}
          </p>
        </Card>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="mt-4 text-[17px] font-bold text-gray-900">
            {ko ? '결제가 완료되었어요' : 'Payment complete'}
          </p>
          <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">
            {ko ? '앱으로 돌아가시면 바로 이용할 수 있어요.' : 'Head back to the app — it is ready now.'}
          </p>
        </Card>
      </Shell>
    )
  }

  const oneTime = item.kind !== 'plan'

  return (
    <Shell>
      <Card padded={false}>
        {/* Brand header — the one place colour is spent, so the price is
            unmistakably the subject of the page. */}
        <div className="rounded-t-2xl bg-gradient-to-br from-primary to-primary/85 px-6 pt-5 pb-6 text-left">
          <p className="text-[12px] font-semibold tracking-wide text-white/70 uppercase">
            {oneTime ? (ko ? '단건 결제' : 'One-time purchase') : (ko ? '구독 결제' : 'Subscription')}
          </p>
          <p className="mt-1 text-[20px] font-bold text-white">{item.title}</p>
          <p className="mt-3 text-white tabular-nums">
            <span className="text-[28px] font-bold tracking-tight">₩{item.priceWon.toLocaleString()}</span>
            <span className="text-[13px] text-white/70"> / {item.period}</span>
          </p>
        </div>

        <div className="px-6 pt-5 pb-6 text-left">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-gray-500">{item.detailLabel}</span>
            <span className="text-[14px] font-semibold text-gray-900 tabular-nums">{item.detailValue}</span>
          </div>

          {oneTime && (
            <p className="mt-2 text-[12px] text-gray-400 leading-relaxed">
              {ko ? '자동 갱신되지 않아요.' : 'Does not renew automatically.'}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-600">
              {error}
            </p>
          )}

          <StudyButton
            type="button" variant="primary" size="lg" fullWidth className="mt-5"
            loading={busy} disabled={!ready || busy} onClick={pay}
          >
            {oneTime
              ? (ko ? '결제하기' : 'Pay')
              : (ko ? '카드 등록하고 결제하기' : 'Add card and pay')}
          </StudyButton>

          <p className="mt-3 text-center text-[11.5px] leading-relaxed text-gray-400">
            {ko ? '결제가 끝나면 앱으로 돌아가 주세요.' : 'Return to the app once payment is done.'}
          </p>
        </div>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
      {children}
    </div>
  )
}

/**
 * Same surface treatment the study subscription screen uses — white,
 * rounded-2xl, hairline ring, barely-there shadow. Matched deliberately:
 * this page is reached by leaving the app mid-purchase, and the buyer
 * needs to recognise where she has landed. `padded={false}` lets the
 * brand header bleed to the card's edges.
 */
function Card({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div
      className={cn(
        'w-full max-w-[380px] overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70',
        'shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(40,133,232,0.18)]',
        padded && 'p-6 text-center',
      )}
    >
      {children}
    </div>
  )
}
