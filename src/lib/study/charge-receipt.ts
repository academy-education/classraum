import { dbAdmin } from '@/lib/supabase-admin'
import { getPortOneConfig } from '@/lib/portone-config'
import { sendResendEmail } from '@/lib/resend'
import { raiseAlert } from '@/lib/ops/alert'
import { isPlausibleEmail } from '@/lib/auth/email'
import { notifyStudent, studentNotifLang } from '@/lib/study/notify'
import { STUDY_PLANS } from '@/lib/study/plans'
import { buildReceiptEmail, cardLabel, formatWon, type ReceiptLang } from '@/lib/study/receipt-email'

/**
 * Send the receipt for one Classraum Study charge — exactly once.
 *
 * Called right after every successful charge is recorded (first subscription
 * payment, renewal, plan change, credit pack, exam pass) and by the backfill
 * script for charges made before receipts existed. Never throws and never
 * blocks a charge: a receipt that fails is alerted and can be retried, a
 * charge that fails because its receipt did is a far worse bug.
 *
 * EXACTLY ONCE. The row is claimed with a conditional UPDATE (receipt_sent_at
 * IS NULL → now()) that returns the row only to the one caller that won; a cron
 * re-run, the webhook racing the cron, or the backfill overlapping a live
 * charge all lose the race and send nothing. A read-then-write "already
 * sent?" check would not hold under concurrency (see CLAUDE.md, "idempotent
 * that is a read followed by a write is not"). If the send then fails, the
 * claim is released so the next attempt can send.
 *
 * FACTS COME FROM PORTONE. study_payments does not record what was bought, so
 * the item name, amount, paid time, card and the Inicis card slip (신용카드
 * 매출전표) are read from PortOne's own record of the charge — what the card
 * was actually billed for — and saved on the row for the billing-history page.
 */
export type ReceiptOutcome =
  | { status: 'sent'; to: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

interface PortOnePaid {
  status?: string
  orderName?: string
  amount?: { total?: number }
  paidAt?: string
  receiptUrl?: string
  method?: { card?: { name?: string; issuer?: string; number?: string } }
  channel?: { type?: string }
}

export async function fetchPortOnePayment(paymentId: string): Promise<PortOnePaid | null> {
  const secret = getPortOneConfig().apiSecret
  if (!secret) return null
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${secret}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()) as PortOnePaid
  } catch {
    return null
  }
}

const APP_ORIGIN = () => process.env.AUTH_EMAIL_APP_ORIGIN || 'https://app.classraum.com'
const toLang = (l: string): ReceiptLang => (l === 'korean' ? 'ko' : 'en')

async function release(paymentId: string) {
  const { error } = await dbAdmin.from('study_payments').update({ receipt_sent_at: null }).eq('payment_id', paymentId)
  if (error) console.error('[charge-receipt] claim release failed', paymentId, error.message)
}

export async function sendChargeReceipt(paymentId: string, opts: { backfill?: boolean } = {}): Promise<ReceiptOutcome> {
  try {
    // 1. Claim. Refunded charges are not receipted (their refund is the record).
    const { data: claimed, error: claimErr } = await dbAdmin
      .from('study_payments')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('payment_id', paymentId)
      .is('receipt_sent_at', null)
      .is('refunded_at', null)
      .is('receipt_held_reason', null)   // held rows (migration 110) are never receipted
      .select('payment_id, student_id, kind, amount_won, created_at')
      .maybeSingle()
    if (claimErr) return { status: 'failed', reason: `claim: ${claimErr.message}` }
    if (!claimed) return { status: 'skipped', reason: 'already sent, refunded, held, or unknown' }

    // 2. What PortOne says was charged. Anything but PAID is not receipted.
    const pay = await fetchPortOnePayment(paymentId)
    if (!pay || pay.status !== 'PAID') {
      await release(paymentId)
      return { status: 'skipped', reason: `portone status ${pay?.status ?? 'unavailable'}` }
    }
    // A TEST-channel payment moved no money (the backfill found one on a
    // seeded account). Hold it with the reason instead of emailing a receipt
    // for a charge that never happened; held rows are never retried.
    if (pay.channel?.type && pay.channel.type !== 'LIVE') {
      const { error: holdErr } = await dbAdmin.from('study_payments')
        .update({ receipt_sent_at: null, receipt_held_reason: `test-mode charge: PortOne ${pay.channel.type} channel; no real money moved` })
        .eq('payment_id', paymentId)
      if (holdErr) console.error('[charge-receipt] hold failed', paymentId, holdErr.message)
      return { status: 'skipped', reason: 'test-mode charge' }
    }
    const amountWon = pay.amount?.total ?? claimed.amount_won
    const paidAt = pay.paidAt ?? claimed.created_at
    const orderName = pay.orderName ?? 'Classraum Study'

    // Saved whatever happens next, so billing history has the slip link.
    await dbAdmin.from('study_payments')
      .update({ receipt_url: pay.receiptUrl ?? null, order_name: orderName, paid_at: paidAt })
      .eq('payment_id', paymentId)

    const [{ data: user }, langPref] = await Promise.all([
      dbAdmin.from('users').select('email').eq('id', claimed.student_id).maybeSingle(),
      studentNotifLang(claimed.student_id),
    ])
    const lang = toLang(langPref)

    // 3. Next renewal — only on the subscription's CURRENT charge while it
    //    still auto-renews. A backfilled old charge must not quote a date.
    let renewal: { on: string; amountWon: number } | null = null
    if (claimed.kind === 'study_subscription') {
      const { data: sub } = await dbAdmin.from('study_subscriptions')
        .select('status, plan, pending_plan, current_period_end, cancel_at_period_end, last_payment_id')
        .eq('student_id', claimed.student_id).maybeSingle()
      const next = sub && STUDY_PLANS[sub.pending_plan ?? sub.plan]
      if (sub && next && sub.last_payment_id === paymentId && sub.status === 'active' && !sub.cancel_at_period_end
          && sub.current_period_end && next.priceWon > 0 && next.intervalDays < 3650) {
        renewal = { on: sub.current_period_end, amountWon: next.priceWon }
      }
    }

    // 4. Email first. An address that cannot receive mail still gets the
    //    in-app notice and the history page, and is flagged, not bounced.
    const to = user?.email ?? ''
    const emailable = isPlausibleEmail(to)
    if (emailable) {
      const mail = buildReceiptEmail({
        lang, orderName, amountWon, paidAt, paymentId, renewal, backfill: opts.backfill,
        card: cardLabel(pay.method?.card, lang), receiptUrl: pay.receiptUrl ?? null, appOrigin: APP_ORIGIN(),
      })
      const sent = await sendResendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text })
      if (!sent.sent) {
        // Released, and NO in-app notice yet — a retry would otherwise post it twice.
        await release(paymentId)
        await raiseAlert({ severity: 'warning', title: 'Receipt email failed', dedupeKey: `receipt-send:${paymentId}`,
          message: sent.error ?? 'send failed', context: { paymentId, toDomain: to.split('@')[1] ?? null } })
        return { status: 'failed', reason: sent.error ?? 'send failed' }
      }
    } else {
      await raiseAlert({ severity: 'warning', title: 'Receipt not emailed: unusable address', dedupeKey: `receipt-bad-email:${claimed.student_id}`,
        message: `Payment ${paymentId} was receipted in-app only; the account's email cannot receive mail.`, context: { paymentId } })
    }

    // 5. In-app notice for live charges only (a stack of "payment received"
    //    for months-old charges would be noise; the backfill is email-only).
    if (!opts.backfill) {
      await notifyStudent({
        studentId: claimed.student_id, kind: 'study_payment_receipt', variant: 'default', push: false, lang: langPref,
        messageParams: { amount: formatWon(amountWon, lang), item: orderName },
      })
    }
    if (!emailable) return { status: 'skipped', reason: 'unusable email address' }
    return { status: 'sent', to }
  } catch (e) {
    await release(paymentId).catch(() => {})
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[charge-receipt] unexpected', paymentId, reason)
    return { status: 'failed', reason }
  }
}
