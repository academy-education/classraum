import { authHeaders } from '@/lib/auth-headers'
import { PortOne } from '@/lib/portone-browser'
import { supabase } from '@/lib/supabase'
import { resolvePack } from '@/lib/study/plans'

/**
 * PortOne customer block for billing-key issuance. Inicis V2 refuses to
 * even open the card window without the buyer's phone number, so pull
 * it (and the real name) from users — study signups store it there.
 */
export async function billingCustomer(
  user: { id?: string; email?: string | null } | null | undefined,
): Promise<{ customerId?: string; email?: string; phoneNumber?: string; fullName?: string }> {
  let phoneNumber: string | undefined
  let fullName: string | undefined
  if (user?.id) {
    try {
      const { data } = await supabase
        .from('users')
        .select('phone, name')
        .eq('id', user.id)
        .maybeSingle()
      phoneNumber = data?.phone || undefined
      fullName = data?.name || undefined
    } catch { /* fall through — PortOne will surface its own error */ }
  }
  return { customerId: user?.id, email: user?.email ?? undefined, phoneNumber, fullName }
}

/** Localized "add your phone first" message for pre-empting the Inicis error. */
export function missingPhoneMessage(ko: boolean): string {
  return ko
    ? '결제하려면 휴대폰 번호가 필요해요. 프로필에서 먼저 등록해 주세요.'
    : 'A phone number is required for payment. Please add one in your Profile first.'
}

/**
 * Mobile WebViews (the Capacitor app) can't open the PG's card window
 * from the Promise flow — the screen just dims. PortOne's redirect flow
 * is required there: we pass `redirectUrl` on every issue call (the SDK
 * still resolves the Promise on PC, and redirects on mobile), stash the
 * purchase intent in sessionStorage, and /mobile/study/billing-redirect
 * finishes the purchase after the round-trip.
 */
export const BILLING_REDIRECT_PATH = '/mobile/study/billing-redirect'

export interface BillingIntent {
  kind: 'plan' | 'pass' | 'pack' | 'gift'
  planId?: string
  passId?: string
  packId?: string
  /** Where to send the user after the redirect flow completes. */
  returnTo: string
  ko: boolean
  ts: number
}

const INTENT_KEY = 'study-billing-intent'

export function stashBillingIntent(intent: Omit<BillingIntent, 'ts'>): void {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify({ ...intent, ts: Date.now() }))
  } catch { /* storage unavailable → PC Promise flow still works */ }
}

/** Read-and-clear. Returns null when absent or older than 30 minutes. */
export function takeBillingIntent(): BillingIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY)
    sessionStorage.removeItem(INTENT_KEY)
    if (!raw) return null
    const intent = JSON.parse(raw) as BillingIntent
    if (!intent.kind || Date.now() - (intent.ts ?? 0) > 30 * 60_000) return null
    return intent
  } catch {
    return null
  }
}

export function billingRedirectUrl(): string {
  return `${window.location.origin}${BILLING_REDIRECT_PATH}`
}

/**
 * Per-platform window type. Inicis's PC module is a fixed ~820px-wide
 * iframe — on narrower desktop windows the right panel (with the 확인
 * button) clips off-screen and the flow looks broken. Below that width
 * we open a POPUP (own properly-sized browser window) instead. Mobile
 * devices (UA-detected by the SDK) always use redirection.
 */
export function billingWindowType(): { pc: 'IFRAME' | 'POPUP'; mobile: 'REDIRECTION' } {
  return {
    pc: typeof window !== 'undefined' && window.innerWidth < 900 ? 'POPUP' : 'IFRAME',
    mobile: 'REDIRECTION',
  }
}

/**
 * Service offer period — REQUIRED by Inicis for mobile billing-key
 * issuance ('제공기간(offerPeriod)은 필수 입력입니다'). Inicis only
 * accepts `1m`/`1y` as intervals; other durations go as a date range,
 * and open-ended products (credits, gifts) as a from-only range.
 */
export function offerPeriodFor(days?: number | null):
  | { interval: string }
  | { range: { from: string } }
  | { range: { from: string; to: string } } {
  if (days === 30) return { interval: '1m' }
  if (days === 365) return { interval: '1y' }
  const from = new Date()
  if (!days || days <= 0) return { range: { from: from.toISOString() } }
  const to = new Date(from.getTime() + days * 86_400_000)
  return { range: { from: from.toISOString(), to: to.toISOString() } }
}

/**
 * Compact unique issue id. Inicis caps oid at 40 chars, and the old
 * `study-*-issue-<full-uuid>-<ms>` shape was 67 — the card window
 * refused to open. prefix(≤4) + 8 uuid chars + base36 ms ≈ 22 chars.
 */
export function billingIssueId(prefix: string, userId?: string): string {
  return `${prefix}-${(userId ?? 'anon').slice(0, 8)}-${Date.now().toString(36)}`
}

/**
 * One-time checkout via PortOne requestPayment on the PAYMENT channel —
 * a normal payment window, not the billing-key card-registration form.
 * Used for non-recurring products (passes, credit packs). Mobile leaves
 * via redirect (billing-redirect completes with the paymentId); PC
 * resolves the Promise.
 */
export interface OneTimePaymentResult {
  ok: boolean
  paymentId?: string
  cancelled?: boolean
  error?: string
}

export async function requestOneTimePayment(opts: {
  paymentId: string
  orderName: string
  amountWon: number
  customer: { customerId?: string; email?: string; phoneNumber?: string; fullName?: string }
  customData: Record<string, unknown>
}): Promise<OneTimePaymentResult> {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE
  if (!storeId || !channelKey) return { ok: false, error: 'PortOne not configured' }

  const res = await PortOne.requestPayment({
    storeId,
    channelKey,
    paymentId: opts.paymentId,
    orderName: opts.orderName,
    totalAmount: opts.amountWon,
    currency: 'KRW' as const,
    payMethod: 'CARD' as const,
    customer: opts.customer,
    customData: opts.customData,
    redirectUrl: billingRedirectUrl(),
    // NOT billingWindowType(): Inicis V2 일반결제 rejects POPUP on PC
    // ("PC환경에서 지원하지 않는 PG사 창 유형(POPUP)") — the sub-900px
    // POPUP fallback that billing-key issuance needs kills the payment
    // window outright. Payments must use IFRAME on PC, always.
    windowType: { pc: 'IFRAME' as const, mobile: 'REDIRECTION' as const },
  })
  if (res?.code != null) {
    // PG error or user closed the window.
    return res.code === 'FAILURE_TYPE_PG' || res.message
      ? { ok: false, error: res.message ?? 'payment failed' }
      : { ok: false, cancelled: true }
  }
  return { ok: true, paymentId: res?.paymentId ?? opts.paymentId }
}

/**
 * Client-side credit-pack purchase, shared by the subscription page and
 * the out-of-credits screen.
 *
 * The server tells us when a card is needed: we POST the pack first, and
 * only if it answers 402 `no_billing_key` (a card-less free user) do we
 * open the PortOne overlay to issue one and retry. Buyers who already
 * have a stored card never see the overlay.
 */
export interface BuyCreditPackResult {
  ok: boolean
  creditsAdded?: number
  /** User dismissed the card overlay — treat as a silent no-op, not an error. */
  cancelled?: boolean
  error?: string
}

export async function buyCreditPack(
  packId: string,
  user: { id?: string; email?: string | null } | null | undefined,
  ko = false,
): Promise<BuyCreditPackResult> {
  const post = async (extra?: { billingKey?: string; paymentId?: string }) => {
    const headers = await authHeaders()
    const res = await fetch('/api/study/subscription/purchase-pack', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId, ...(extra ?? {}) }),
    })
    const body = await res.json().catch(() => ({} as Record<string, unknown>))
    return { res, body }
  }

  try {
    const first = await post()
    if (first.res.ok) {
      return { ok: true, creditsAdded: Number(first.body.creditsAdded) || undefined }
    }
    // Card-less buyer → one-time checkout window (normal payment, NOT
    // card registration — packs are one-off purchases), then redeem the
    // paymentId server-side.
    if (first.body.code === 'no_billing_key') {
      const customer = await billingCustomer(user)
      if (!customer.phoneNumber) return { ok: false, error: missingPhoneMessage(ko) }
      // Mobile WebViews leave via redirect here; the billing-redirect
      // page redeems the paymentId.
      stashBillingIntent({
        kind: 'pack',
        packId,
        returnTo: window.location.pathname + window.location.search,
        ko,
      })
      const pay = await requestOneTimePayment({
        paymentId: billingIssueId('spk', user?.id),
        orderName: ko ? 'Classraum 테스트 크레딧' : 'Classraum Study credits',
        amountWon: resolvePack(packId).priceWon,
        customer,
        customData: { kind: 'study_credit_pack', pack: packId, student_id: user?.id },
      })
      if (!pay.ok) {
        return pay.cancelled ? { ok: false, cancelled: true } : { ok: false, error: pay.error }
      }
      const second = await post({ paymentId: pay.paymentId })
      // 409 already_processed means a parallel redemption (e.g. the
      // redirect page) already granted the credits for this payment —
      // that's a success from the buyer's point of view.
      if (second.res.ok || second.body.code === 'already_processed') {
        return { ok: true, creditsAdded: Number(second.body.creditsAdded) || undefined }
      }
      return { ok: false, error: typeof second.body.message === 'string' ? second.body.message : 'purchase failed' }
    }
    return { ok: false, error: typeof first.body.message === 'string' ? first.body.message : 'purchase failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'purchase failed' }
  }
}
