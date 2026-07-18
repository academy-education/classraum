import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getBillingKeyInfo } from '@/lib/portone-charge'
import { STUDY_PLANS } from '@/lib/study/plans'
import { activateSubscriptionFromBillingKey } from '@/lib/study/activate-subscription'

/**
 * PortOne webhook for the study subscription stream.
 *
 * PortOne posts JSON when a payment transitions state — succeeded,
 * failed, cancelled (refunded). We only act on async events the cron
 * + first-charge endpoint didn't already handle synchronously:
 *
 *   - Transaction.Paid     no-op (we already advanced the row in
 *                          /billing-key or /cron/study-billing)
 *   - Transaction.Failed   if we haven't already flipped to past_due,
 *                          do it now (covers PG-side async declines).
 *   - Transaction.Cancelled refund: revert to status='cancelled' and
 *                          set period_end = now if the refund covers
 *                          the current period.
 *
 * Signature verification: PortOne sends a `webhook-signature` header
 * over the raw body. We re-hash with the configured webhook secret
 * and reject on mismatch. The secret lives in PORTONE_WEBHOOK_SECRET.
 *
 * No retries here — PortOne re-sends on non-2xx, so we MUST return
 * 200 for events we intentionally ignore.
 */

export const dynamic = 'force-dynamic'

interface WebhookPayload {
  type?: string
  data?: {
    paymentId?: string
    billingKey?: string
    customData?: string | Record<string, unknown>
    status?: string
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  // When PORTONE_WEBHOOK_SECRET is configured, EVERY request must carry
  // a valid signature — a missing header is a rejection, not a bypass
  // (the old `secret && sigHeader` gate failed open: omitting the
  // header skipped verification entirely). Unsigned requests are only
  // tolerated when no secret is configured at all (local test mode).
  const sigHeader = req.headers.get('webhook-signature') ?? ''
  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (secret) {
    if (!sigHeader) {
      console.warn('[study/subscription/webhook] missing signature header')
      return NextResponse.json({ error: 'missing signature' }, { status: 401 })
    }
    const ok = await verifySvixSignature(raw, sigHeader, secret, req.headers)
    if (!ok) {
      console.warn('[study/subscription/webhook] signature mismatch')
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }
  }

  let event: WebhookPayload
  try { event = JSON.parse(raw) } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }

  const type = event.type ?? ''

  // Backstop: BillingKey.Issued fires when a card is registered. Normally
  // the subscribe page immediately posts the key to /billing-key to run
  // the first charge — but if that client call is lost (dropped redirect,
  // closed WebView), the card is registered and never charged. Here we
  // complete the first charge server-side. The event body carries only
  // the raw billingKey, so we fetch its stored customData (kind + plan +
  // student_id, stamped at issuance) to recover the buyer.
  if (type === 'BillingKey.Issued') {
    const billingKey = event.data?.billingKey ?? ''
    if (!billingKey) return NextResponse.json({ ok: true, ignored: 'no billingKey' })

    const info = await getBillingKeyInfo(billingKey)
    if (!info.ok) {
      console.warn('[study/subscription/webhook] billing-key fetch failed', { message: info.message })
      return NextResponse.json({ ok: true, ignored: 'billing-key fetch failed' })
    }
    const cd = info.customData ?? {}
    const studentId = typeof cd.student_id === 'string' ? cd.student_id : ''
    const planId = typeof cd.plan === 'string' ? cd.plan : undefined
    // Not one of our subscription billing keys (e.g. a pass/gift key, or
    // pre-backstop issuance without student_id) — nothing to do here.
    if (cd.kind !== 'study_subscription' || !studentId || (planId && !STUDY_PLANS[planId])) {
      return NextResponse.json({ ok: true, ignored: 'not a study subscription key' })
    }
    // onlyIfNoActiveSub: never charges a buyer a client retry already
    // subscribed; the shared guard also no-ops on the exact-key match.
    const outcome = await activateSubscriptionFromBillingKey({
      studentId, billingKey, planId, onlyIfNoActiveSub: true,
    })
    return NextResponse.json({ ok: true, applied: outcome.status })
  }

  const paymentId = event.data?.paymentId ?? ''

  // Only respond to study events. customData should mark the kind;
  // skip silently otherwise so this route doesn't conflict with the
  // academy webhook flow that may share the endpoint pool.
  const customData = parseCustomData(event.data?.customData)
  if (customData?.kind !== 'study_subscription') {
    return NextResponse.json({ ok: true, ignored: 'not a study event' })
  }

  // Match the row by either last_payment_id or by the renewal
  // paymentId prefix. Avoids losing track of charges if a race let
  // the webhook arrive before the cron's UPDATE landed.
  const { data: row } = await supabaseAdmin
    .from('study_subscriptions')
    .select('id, status, current_period_end')
    .eq('last_payment_id', paymentId)
    .maybeSingle()

  if (!row) {
    // Not necessarily an error — could be a webhook for a charge we
    // haven't recorded yet. Log and 200 so PortOne stops retrying.
    console.warn('[study/subscription/webhook] no matching row', { type, paymentId })
    return NextResponse.json({ ok: true, ignored: 'no matching row' })
  }

  const now = new Date().toISOString()
  if (type === 'Transaction.Failed') {
    // Only flip if not already terminal — don't resurrect a
    // cancelled/expired row from a stale webhook.
    if (row.status === 'active' || row.status === 'trial') {
      await supabaseAdmin
        .from('study_subscriptions')
        .update({
          status: 'past_due',
          last_payment_failure: 'webhook: ' + (event.data?.status ?? type),
          updated_at: now,
        })
        .eq('id', row.id)
    }
    return NextResponse.json({ ok: true, applied: 'past_due' })
  }

  if (type === 'Transaction.Cancelled') {
    // Refund — set period_end to now so access drops immediately,
    // and mark cancelled. Customer support follows up on partial
    // refund edge cases manually.
    await supabaseAdmin
      .from('study_subscriptions')
      .update({
        status: 'cancelled',
        current_period_end: now,
        cancel_at_period_end: false,
        updated_at: now,
      })
      .eq('id', row.id)
    return NextResponse.json({ ok: true, applied: 'cancelled' })
  }

  // Paid + everything else: no-op (we already wrote the row sync).
  return NextResponse.json({ ok: true })
}

function parseCustomData(input: unknown): { kind?: string } | null {
  if (!input) return null
  if (typeof input === 'object') return input as { kind?: string }
  if (typeof input === 'string') {
    try { return JSON.parse(input) as { kind?: string } } catch { return null }
  }
  return null
}

/**
 * PortOne uses Svix-format signatures (`v1,...` base64). HMAC-SHA256
 * over `{msgId}.{timestamp}.{body}` with the shared secret.
 *
 * Headers expected from PortOne / Svix:
 *   webhook-id          msg id
 *   webhook-timestamp   unix seconds
 *   webhook-signature   "v1,<base64sig>" (space-separated multi)
 */
async function verifySvixSignature(
  body: string,
  sigHeader: string,
  secret: string,
  headers: Headers
): Promise<boolean> {
  const id = headers.get('webhook-id') ?? ''
  const ts = headers.get('webhook-timestamp') ?? ''
  if (!id || !ts) return false

  // Replay protection: the timestamp is part of the signed content, so
  // an old signature only verifies with its old timestamp — rejecting
  // stale timestamps caps the replay window. 5 minutes, matching the
  // tolerance in lib/portone-webhook.ts.
  const tsSeconds = Number(ts)
  if (!Number.isFinite(tsSeconds)) return false
  if (Math.abs(Date.now() / 1000 - tsSeconds) > 5 * 60) {
    console.warn('[study/subscription/webhook] timestamp outside tolerance')
    return false
  }

  const enc = new TextEncoder()
  // Secret strings from PortOne start with "whsec_" — strip + base64-decode.
  const secretBytes = secret.startsWith('whsec_')
    ? base64Decode(secret.slice(6))
    : enc.encode(secret)
  const key = await crypto.subtle.importKey(
    'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const expectedBytes = await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${ts}.${body}`))
  const expected = base64Encode(new Uint8Array(expectedBytes))

  // Header can carry multiple "v1,<sig>" tokens. Match against any.
  return sigHeader
    .split(' ')
    .some(tok => {
      const [version, sig] = tok.split(',')
      return version === 'v1' && timingSafeEqual(sig, expected)
    })
}

function base64Decode(s: string): Uint8Array {
  const binary = atob(s)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}
