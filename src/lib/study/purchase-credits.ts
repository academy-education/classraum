import { authHeaders } from '@/lib/auth-headers'
import { PortOne } from '@/lib/portone-browser'
import { supabase } from '@/lib/supabase'

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
  const post = async (billingKey?: string) => {
    const headers = await authHeaders()
    const res = await fetch('/api/study/subscription/purchase-pack', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(billingKey ? { packId, billingKey } : { packId }),
    })
    const body = await res.json().catch(() => ({} as Record<string, unknown>))
    return { res, body }
  }

  try {
    const first = await post()
    if (first.res.ok) {
      return { ok: true, creditsAdded: Number(first.body.creditsAdded) || undefined }
    }
    // Card-less buyer → issue a billing key via the overlay, then retry.
    if (first.body.code === 'no_billing_key') {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE
      if (!storeId || !channelKey) return { ok: false, error: 'PortOne not configured' }

      const customer = await billingCustomer(user)
      if (!customer.phoneNumber) return { ok: false, error: missingPhoneMessage(ko) }
      const issued = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: `study-pack-issue-${user?.id ?? 'anon'}-${Date.now()}`,
        issueName: 'Classraum Study credits',
        customer,
        customData: { kind: 'study_credit_pack', packId },
      })
      if (!issued?.billingKey) {
        // No code → user closed the overlay; a code → PortOne error.
        return issued?.code
          ? { ok: false, error: issued.message ?? 'card registration failed' }
          : { ok: false, cancelled: true }
      }
      const second = await post(issued.billingKey)
      if (second.res.ok) {
        return { ok: true, creditsAdded: Number(second.body.creditsAdded) || undefined }
      }
      return { ok: false, error: typeof second.body.message === 'string' ? second.body.message : 'purchase failed' }
    }
    return { ok: false, error: typeof first.body.message === 'string' ? first.body.message : 'purchase failed' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'purchase failed' }
  }
}
