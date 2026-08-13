"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authHeaders } from '@/lib/auth-headers'
import { takeBillingIntent, checkoutContext } from '@/lib/study/purchase-credits'
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
import { MascotLoader, useMascotGate } from '@/app/mobile/study/_shared/MascotLoader'
import { StudyButton } from '@/app/mobile/study/_shared/StudyButton'

/**
 * /mobile/study/billing-redirect — lands here after PortOne's redirect
 * flow (mobile WebViews can't use the Promise flow; the PG window only
 * opens via redirect there). The query string carries the issued
 * billingKey (or an error code), and the purchase intent stashed in
 * sessionStorage before the SDK call tells us which server endpoint
 * finishes the job.
 */
export function BillingReturn() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  // "Pending" = the PG approved (money taken / card issued) but our
  // client-side redemption couldn't finish (session-restore race, etc.).
  // The server webhook backstop completes it, so we show a reassuring
  // success screen — NOT the failure screen.
  const [pending, setPending] = useState(false)
  /** Purchase finished by the server after the client's intent was lost. */
  const [recovered, setRecovered] = useState(false)
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
        // Same context as checkout_started, so the two rows can be
        // compared: if `ss` flipped between them the return landed in a
        // different tab, and if `ls` is false the intent could never
        // have been stored in the first place.
        ...checkoutContext(),
      })
      if (!intent) {
        // The PG approved (card registered / money taken) but we cannot
        // tell WHICH purchase this was, so there is nothing safe to
        // charge. This used to `router.replace` in silence — no event,
        // no message — which is exactly what a real buyer hit on
        // 2026-08-13: she landed back on a page still reading "Free"
        // and had no idea the purchase had failed. Say so, and leave a
        // trace so the next occurrence is diagnosable.
        //
        // Deliberately NOT the `pending` screen: that promises "payment
        // complete, it'll appear shortly", and without an intent we
        // cannot keep that promise — the only thing that could is the
        // server-side BillingKey.Issued backstop, which did NOT complete
        // her subscription. Do not tell a buyer they have paid until
        // something has actually charged them.
        track('checkout_result', {
          step: 'redeem', ok: false, reason: 'no_intent',
          hasPaymentId: Boolean(paymentId), hasBillingKey: Boolean(billingKey),
          ...checkoutContext(),
        })

        // ASK THE SERVER WHAT THIS WAS. The intent is gone, but the PG
        // still holds the customData we stamped at issuance (kind, plan
        // /pass/pack, student_id), and /recover reads it back and
        // finishes the purchase. That is what makes this survivable on
        // Android, where the return is pulled into the app's WebView and
        // the claim list that causes it is compiled into the APK — so
        // unlike iOS it cannot be corrected by a deploy.
        //
        // The server re-verifies ownership against the authed user, so
        // this is not "trust whatever is in the URL".
        const headers = await waitForAuthHeaders()
        if (headers) {
          try {
            const res = await fetch('/api/study/subscription/recover', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(billingKey ? { billingKey } : { paymentId }),
            })
            const body = await res.json().catch(() => ({} as Record<string, unknown>))
            if (res.ok) {
              track('checkout_result', {
                step: 'redeem', ok: true, reason: 'recovered',
                kind: body.kind, applied: body.applied,
              })
              setRecovered(true)
              return
            }
            // 503 = we could not reach PortOne, or the write failed. The
            // card IS registered, so the webhook backstop may still land
            // it — pending, not failure.
            if (res.status === 503) { setPending(true); return }
            track('checkout_result', {
              step: 'redeem', ok: false, reason: 'recover_failed',
              status: res.status, code: body.error,
            })
          } catch {
            setPending(true)
            return
          }
        }

        setError(isKo
          ? '카드는 등록됐지만 결제를 마치지 못했어요. 요금은 청구되지 않았어요 — 다시 시도해 주세요.'
          : "Your card was registered but the purchase didn't complete. You have not been charged — please try again.")
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

  const showPaymentLoader = useMascotGate(true)

  if (recovered) {
    // The server recovered the purchase from the PG's own record. This is
    // a genuine completion, not the "we think it'll land shortly" pending
    // screen — say so plainly.
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
          {ko ? '앱으로 돌아가시면 바로 이용할 수 있어요.' : 'Head back to the app — it is ready now.'}
        </p>
        <StudyButton type="button" variant="primary" onClick={() => router.replace(returnTo)}>
          {ko ? '돌아가기' : 'Go back'}
        </StudyButton>
      </div>
    )
  }


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

  // Reaching here means we are still waiting on the payment round-trip.
  // Gated like every other study wait: if the redirect resolves inside
  // the 300ms grace the student sees nothing rather than a one-frame
  // mascot. (Whether Raumi belongs on a billing screen at all is a
  // separate question — subscription/page.tsx deliberately uses a
  // skeleton and says "Raumi is reserved for studying screens".)
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {showPaymentLoader
        ? <MascotLoader className="flex-1" label={ko ? '결제를 완료하는 중…' : 'Completing your payment…'} />
        : <div className="flex-1" />}
    </div>
  )
}
