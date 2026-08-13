"use client"

/**
 * /pay/subscribe — the web checkout the native app hands off to.
 *
 * WHY THIS PAGE EXISTS AT ALL, given the app already has a subscription
 * screen: because the app cannot hand off to that screen.
 *
 * `subscribeOnWebUrl()` used to send the buyer to
 *   /auth?intent=study&next=/mobile/study/subscription?plan=…
 * The /auth leg is fine — Apple matches `/auth/*` against a trailing
 * slash, so a bare /auth is not claimed and opens in the browser. But
 * the moment sign-in forwarded to `next`, iOS matched `/mobile/*` in the
 * app's apple-app-site-association and handed the URL to the Classraum
 * app. "Pay on the web" put the buyer straight back inside the app,
 * where the only button available hands off to the web again.
 *
 * That is what a real buyer reported on 2026-08-13: "first she tried
 * with the web only and then what it did was lead her back to the app".
 *
 * So the hand-off needs a destination the app does not claim. `/pay/*`
 * is not in APPLE_APP_LINK_PATHS, and this page is deliberately small:
 * one plan, one button, no shell, nothing that needs the /mobile tree.
 *
 * It does NOT duplicate the subscription screen's management UI (cancel,
 * upgrade, passes, packs) — those are not what a hand-off is for, and
 * duplicating them would mean two copies of the same money logic drifting
 * apart. This does one thing: charge the plan the app asked for.
 */
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { db } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { track } from '@/lib/study/track-client'
import { PortOne } from '@/lib/portone-browser'
import { STUDY_PLANS } from '@/lib/study/plans'
import {
  billingCustomer, missingPhoneMessage, stashBillingIntent, billingRedirectUrl,
  billingIssueId, billingWindowType, offerPeriodFor, checkoutContext,
} from '@/lib/study/purchase-credits'

const PATH = '/pay/subscribe'

/**
 * useSearchParams() forces a client-side bailout, and Next FAILS THE BUILD
 * for a page that does it outside a Suspense boundary:
 *
 *   ⨯ useSearchParams() should be wrapped in a suspense boundary at page
 *     "/pay/subscribe"
 *   Export encountered an error on /pay/subscribe/page, exiting the build
 *
 * That is not a warning — `npm run build` exits 1, Vercel marks the
 * deployment Error, and NOTHING ships. ac4f381 failed exactly this way
 * and I did not notice, because `tsc --noEmit` and the 1602-test jest
 * suite both passed: neither runs a production build, so neither can see
 * a prerender error. The fix sat in GitHub looking merged while
 * production kept serving the broken flow.
 */
export default function PaySubscribePage() {
  return (
    <Suspense fallback={<Shell><p className="text-[13px] text-gray-500">···</p></Shell>}>
      <PaySubscribe />
    </Suspense>
  )
}

function PaySubscribe() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = params.get('plan') ?? ''
  const plan = STUDY_PLANS[planId]

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ko = true

  // Signed out → /auth, coming back HERE. `next` stays inside /pay/* so
  // the return leg cannot be captured by the app the way the old
  // /mobile/study/subscription destination was.
  useEffect(() => {
    void (async () => {
      const { data } = await db.auth.getUser()
      if (!data?.user) {
        const next = `${PATH}?plan=${encodeURIComponent(planId)}`
        router.replace(`/auth?intent=study&next=${encodeURIComponent(next)}`)
        return
      }
      setUser({ id: data.user.id, email: data.user.email ?? undefined })
      setReady(true)
    })()
  }, [planId, router])

  const pay = useCallback(async () => {
    if (busy || !plan || !user) return
    setBusy(true)
    setError(null)
    track('checkout_started', { kind: 'subscription', plan: plan.id, surface: 'pay_web', ...checkoutContext() })
    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) throw new Error('PortOne not configured')

      const customer = await billingCustomer(user)
      if (!customer.phoneNumber) { setError(missingPhoneMessage(ko)); return }

      // returnTo is a CLIENT-side router.replace on the way out, not a
      // fresh URL load, so it cannot re-trigger a Universal Link even
      // though it points back under /mobile.
      stashBillingIntent({ kind: 'plan', planId: plan.id, returnTo: '/mobile/study/subscription', ko })

      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: billingIssueId('sub', user.id),
        issueName: 'Classraum Study subscription',
        customer,
        customData: { kind: 'study_subscription', plan: plan.id, student_id: user.id },
        redirectUrl: billingRedirectUrl(),
        noticeUrls: [`${window.location.origin}/api/study/subscription/webhook`],
        windowType: billingWindowType(),
        offerPeriod: offerPeriodFor(plan.intervalDays),
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
        body: JSON.stringify({ billingKey: issued.billingKey, plan: plan.id }),
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
  }, [busy, plan, user, ko])

  if (!plan) {
    return (
      <Shell>
        <p className="text-[15px] font-semibold text-gray-900">
          {ko ? '알 수 없는 플랜이에요' : 'Unknown plan'}
        </p>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <p className="text-[15px] font-semibold text-gray-900">
          {ko ? '결제가 완료되었어요' : 'Payment complete'}
        </p>
        <p className="text-[13px] text-gray-500 max-w-[300px]">
          {ko ? '앱으로 돌아가시면 바로 이용할 수 있어요.' : 'Head back to the app — it is ready now.'}
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-[13px] text-gray-500">{ko ? '구독 결제' : 'Subscription'}</p>
      <p className="text-[19px] font-bold text-gray-900">{ko ? plan.name_ko : plan.name_en}</p>
      <p className="text-[15px] text-gray-700 tabular-nums">
        ₩{plan.priceWon.toLocaleString()}
        <span className="text-gray-400 text-[13px]">
          {' / '}{plan.intervalDays === 365 ? (ko ? '년' : 'year') : `${plan.intervalDays}${ko ? '일' : ' days'}`}
        </span>
      </p>
      {error && <p className="text-[13px] text-red-600 max-w-[320px]">{error}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={!ready || busy}
        className="mt-2 w-full max-w-[320px] rounded-xl bg-gray-900 text-white text-[15px] font-semibold py-3.5 disabled:opacity-50"
      >
        {busy ? (ko ? '진행 중…' : 'Working…') : ko ? '카드 등록하고 결제하기' : 'Add card and pay'}
      </button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-2.5">
      {children}
    </div>
  )
}
