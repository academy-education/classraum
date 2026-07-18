"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHeaders } from '@/lib/auth-headers'
import { takeBillingIntent } from '@/lib/study/purchase-credits'
import { track } from '@/lib/study/track-client'

/**
 * The PG redirect lands on a cold page load, and Supabase may still be
 * restoring the session from storage when our effect runs — calling the
 * purchase endpoint in that window 401s. Poll (up to ~6s) until a
 * Bearer token is actually present.
 */
async function waitForAuthHeaders(): Promise<HeadersInit | null> {
  for (let i = 0; i < 12; i++) {
    const headers = await authHeaders()
    if ((headers as Record<string, string>).Authorization) return headers
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return null
}
import { MascotLoader } from '../_shared/MascotLoader'
import { StudyButton } from '../_shared/StudyButton'

/**
 * /mobile/study/billing-redirect — lands here after PortOne's redirect
 * flow (mobile WebViews can't use the Promise flow; the PG window only
 * opens via redirect there). The query string carries the issued
 * billingKey (or an error code), and the purchase intent stashed in
 * sessionStorage before the SDK call tells us which server endpoint
 * finishes the job.
 */
export default function BillingRedirectPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  // "Pending" = the PG approved (money taken / card issued) but our
  // client-side redemption couldn't finish (session-restore race, etc.).
  // The server webhook backstop completes it, so we show a reassuring
  // success screen — NOT the failure screen.
  const [pending, setPending] = useState(false)
  const [returnTo, setReturnTo] = useState('/mobile/study/subscription')
  const [ko, setKo] = useState(true)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      const params = new URLSearchParams(window.location.search)
      // Billing-key issuance returns billingKey; one-time checkout
      // (passes, packs) returns paymentId. Either way `code` means
      // the PG reported a failure.
      const billingKey = params.get('billingKey')
      const paymentId = params.get('paymentId')
      const code = params.get('code')
      const message = params.get('message')
      const intent = takeBillingIntent()
      const isKo = intent?.ko ?? true
      setKo(isKo)
      const back = intent?.returnTo ?? '/mobile/study/subscription'
      setReturnTo(back)

      const fail = (msg?: string | null) =>
        setError(msg || (isKo ? '결제에 실패했어요. 다시 시도해 주세요.' : 'Payment failed. Please try again.'))

      // PG returned an error, or the user backed out of the window.
      if (code || (!billingKey && !paymentId)) {
        track('checkout_result', {
          step: 'redirect-return',
          ok: false,
          kind: intent?.kind,
          code,
          message: message?.slice(0, 300),
        })
        if (code) fail(message)
        else router.replace(back)
        return
      }
      track('checkout_result', {
        step: 'redirect-return',
        ok: true,
        kind: intent?.kind,
        hasPaymentId: Boolean(paymentId),
        hasBillingKey: Boolean(billingKey),
      })
      if (!intent) {
        // Stale/unknown redirect (e.g. reopened from history) — nothing
        // safe to charge. Send them home.
        router.replace('/mobile/study/subscription')
        return
      }

      try {
        const headers = await waitForAuthHeaders()
        if (!headers) {
          // The PG already approved (money taken / card issued). The
          // server webhook backstop will grant it — show a success/pending
          // screen, never a failure.
          track('checkout_result', { step: 'redeem', ok: false, kind: intent.kind, reason: 'no_auth_pending' })
          setPending(true)
          return
        }
        const post = (url: string, body: Record<string, unknown>) =>
          fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

        let res: Response
        if (intent.kind === 'plan' && intent.planId && billingKey) {
          res = await post('/api/study/subscription/billing-key', { billingKey, plan: intent.planId })
        } else if (intent.kind === 'pass' && intent.passId && paymentId) {
          res = await post('/api/study/subscription/purchase-pass', { paymentId, passId: intent.passId })
        } else if (intent.kind === 'pack' && intent.packId && paymentId) {
          res = await post('/api/study/subscription/purchase-pack', { paymentId, packId: intent.packId })
        } else if (intent.kind === 'gift' && billingKey) {
          res = await post('/api/study/gift/purchase', { billingKey })
        } else {
          router.replace(back)
          return
        }

        const body = await res.json().catch(() => ({} as Record<string, unknown>))
        // 409 already_processed = this paymentId was already redeemed
        // (page reloaded / reopened from history) — the product was
        // granted, so treat it as success rather than scaring the buyer.
        if (!res.ok && body.code !== 'already_processed') {
          track('checkout_result', {
            step: 'redeem',
            ok: false,
            kind: intent.kind,
            status: res.status,
            code: body.code,
          })
          // The card was charged (or the key issued) at the PG — this
          // failure is only our client-side redemption. The webhook
          // backstop finishes it, so show pending success, not an error.
          setPending(true)
          return
        }
        track('checkout_result', { step: 'redeem', ok: true, kind: intent.kind })
        // The gift page shows the issued code — hand it across the
        // navigation the same way the intent came in.
        if (intent.kind === 'gift' && body.code) {
          try { sessionStorage.setItem('study-gift-issued', String(body.code)) } catch { /* shown on gift page best-effort */ }
        }
        // Pack/pass buyers land back with a success flag so the return
        // page can show its "credits added / pass active" banner — the
        // redirect flow otherwise ends with no feedback at all.
        if (intent.kind === 'pack' || intent.kind === 'pass') {
          const dest = new URL(back, window.location.origin)
          dest.searchParams.set('purchased', intent.kind)
          const credits = Number(body.creditsAdded)
          if (credits > 0) dest.searchParams.set('credits', String(credits))
          router.replace(dest.pathname + dest.search)
          return
        }
        router.replace(back)
      } catch {
        // PG-approved payment + an unexpected client error → the webhook
        // still completes it. Pending success, not failure.
        setPending(true)
      }
    })()
  }, [router])

  if (pending) {
    // Payment succeeded at the PG; the server is finalizing it (webhook
    // backstop). Reassure, don't alarm — the balance updates shortly.
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center px-6 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[15px] font-semibold text-gray-900">
          {ko ? '결제가 완료되었어요' : 'Payment complete'}
        </p>
        <p className="text-[13px] text-gray-500 leading-relaxed max-w-[300px]">
          {ko
            ? '잠시 후 반영돼요. 화면을 새로고침하면 확인할 수 있어요.'
            : "It'll appear in a moment — pull to refresh to see it."}
        </p>
        <StudyButton type="button" variant="primary" onClick={() => router.replace(returnTo)}>
          {ko ? '돌아가기' : 'Go back'}
        </StudyButton>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center px-6 text-center gap-4">
        <p className="text-[15px] font-semibold text-gray-900">
          {ko ? '결제를 완료하지 못했어요' : "Couldn't complete the payment"}
        </p>
        <p className="text-[13px] text-gray-500 leading-relaxed max-w-[300px]">{error}</p>
        <StudyButton type="button" variant="primary" onClick={() => router.replace(returnTo)}>
          {ko ? '돌아가기' : 'Go back'}
        </StudyButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <MascotLoader className="flex-1" label={ko ? '결제를 완료하는 중…' : 'Completing your payment…'} />
    </div>
  )
}
