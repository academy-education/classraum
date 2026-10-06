import { dbAdmin } from '@/lib/supabase-admin'
import { sendResendEmail } from '@/lib/resend'
import { raiseAlert } from '@/lib/ops/alert'
import { isPlausibleEmail } from '@/lib/auth/email'
import { notifyStudent, studentNotifLang } from '@/lib/study/notify'
import {
  buildRefundNotice,
  pickReason,
  testLabel,
  toNoticeLang,
  type RefundNoticeLang,
  type RefundNoticeReason,
  type RenderedRefundNotice,
  type TestName,
} from '@/lib/study/credit-refund-notice'

/**
 * Tell a student their test credits were given back — exactly once.
 *
 * Owner request 2026-10-06: admin refunds (admin-session-refund.ts) put the
 * credits back silently. This sends ONE in-app notice and ONE email for a
 * group of refund ledger rows (e.g. six sessions refunded in one admin
 * action → "12 credits returned"), in the student's language.
 *
 * EXACTLY ONCE, per ledger row. The rows are claimed with a conditional
 * UPDATE (refund_notified_at IS NULL → now()) that returns them only to the
 * caller that won, so re-running the idempotent refund, two admins at once,
 * or the backfill script overlapping a live call notify nothing twice. No
 * read-then-write "already notified?" check (CLAUDE.md, "idempotent that is
 * a read followed by a write is not"). A failed send releases the claim.
 *
 * NEVER THROWS. A refund must not fail because its notification did.
 *
 * SUPPRESSION. An address on email_suppressions gets nothing — no email and,
 * as with receipts, no in-app notice — and the claim is KEPT: suppressed is
 * done, not a failure to retry.
 */
export type RefundNoticeOutcome =
  | { status: 'sent'; count: number; lang: RefundNoticeLang; to: string; notice: RenderedRefundNotice }
  | { status: 'dry_run'; count: number; lang: RefundNoticeLang; to: string | null; notice: RenderedRefundNotice }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

export interface NotifyCreditRefundOptions {
  /** Sessions the rows belong to, for naming the test. Defaults to the rows'
   *  source ids (slice 0 of a session IS its id). */
  sessionIds?: string[]
  /** Render and return what would be sent; claim nothing, send nothing. */
  dryRun?: boolean
}

const APP_ORIGIN = () => process.env.AUTH_EMAIL_APP_ORIGIN || 'https://app.classraum.com'

type LedgerRow = { id: string; delta: number; source_id: string | null }

async function release(studentId: string, ids: string[], stamp: string) {
  const { error } = await dbAdmin
    .from('study_credit_ledger')
    .update({ refund_notified_at: null })
    .eq('student_id', studentId)
    .eq('refund_notified_at', stamp)
    .in('id', ids)
  if (error) console.error('[credit-refund-notify] claim release failed', studentId, error.message)
}

async function loadTestNames(sessionIds: string[]): Promise<TestName[]> {
  if (sessionIds.length === 0) return []
  const { data: sessions } = await dbAdmin
    .from('study_sessions').select('id, topic_id, config').in('id', sessionIds)
  // In the caller's order (the DB returns `in` matches in any order), so
  // the wording is stable: "SSAT Math, Writing and Reading Comprehension".
  const rows = ((sessions ?? []) as Array<{ id: string; topic_id: string | null; config: unknown }>)
    .sort((a, b) => sessionIds.indexOf(a.id) - sessionIds.indexOf(b.id))
  const topicIds = Array.from(new Set(rows.map(s => s.topic_id).filter((v): v is string => !!v)))
  type Topic = { id: string; parent_id: string | null; name_en: string | null; name_ko: string | null }
  const topics = new Map<string, Topic>()
  if (topicIds.length) {
    const { data } = await dbAdmin.from('study_topics').select('id, parent_id, name_en, name_ko').in('id', topicIds)
    for (const t of (data ?? []) as Topic[]) topics.set(t.id, t)
    const parentIds = Array.from(new Set([...topics.values()].map(t => t.parent_id).filter((v): v is string => !!v && !topics.has(v))))
    if (parentIds.length) {
      const { data: parents } = await dbAdmin.from('study_topics').select('id, parent_id, name_en, name_ko').in('id', parentIds)
      for (const t of (parents ?? []) as Topic[]) topics.set(t.id, t)
    }
  }
  return rows.map(s => {
    const topic = s.topic_id ? topics.get(s.topic_id) : undefined
    const parent = topic?.parent_id ? topics.get(topic.parent_id) : undefined
    const cfg = s.config && typeof s.config === 'object' ? s.config as Record<string, unknown> : {}
    const family = parent?.name_en || (typeof cfg.family === 'string' ? cfg.family.toUpperCase() : '')
    const section = topic && (topic.name_en || topic.name_ko)
      ? { en: topic.name_en ?? topic.name_ko ?? '', ko: topic.name_ko ?? topic.name_en ?? '' }
      : null
    return { family, section }
  })
}

export async function notifyCreditRefund(
  studentId: string,
  refundLedgerIds: string[],
  reason?: RefundNoticeReason,
  opts: NotifyCreditRefundOptions = {},
): Promise<RefundNoticeOutcome> {
  const ids = Array.from(new Set(refundLedgerIds.filter(Boolean)))
  if (!studentId || ids.length === 0) return { status: 'skipped', reason: 'no refund rows' }
  const stamp = new Date().toISOString()
  let claimed: LedgerRow[] = []
  try {
    // 1. Claim (or, in a dry run, only read what a claim would take).
    if (opts.dryRun) {
      const read = (unclaimedOnly: boolean) => {
        const q = dbAdmin.from('study_credit_ledger')
          .select('id, delta, source_id')
          .eq('student_id', studentId).eq('kind', 'refund').in('id', ids)
        return unclaimedOnly ? q.is('refund_notified_at', null) : q
      }
      let { data, error } = await read(true)
      // Dry run only: before migration 121 the column does not exist, and a
      // preview is still useful. Every row is then unclaimed by definition.
      // A real send never takes this branch — its claim fails loudly instead.
      if (error?.code === '42703') ({ data, error } = await read(false))
      if (error) return { status: 'failed', reason: `read: ${error.message}` }
      claimed = (data ?? []) as LedgerRow[]
    } else {
      const { data, error } = await dbAdmin.from('study_credit_ledger')
        .update({ refund_notified_at: stamp })
        .eq('student_id', studentId).eq('kind', 'refund').is('refund_notified_at', null).in('id', ids)
        .select('id, delta, source_id')
      if (error) return { status: 'failed', reason: `claim: ${error.message}` }
      claimed = (data ?? []) as LedgerRow[]
    }
    if (claimed.length === 0) return { status: 'skipped', reason: 'already notified, not a refund, or unknown' }
    const claimedIds = claimed.map(r => r.id)

    const count = claimed.reduce((n, r) => n + (Number(r.delta) || 0), 0)
    if (count <= 0) {
      if (!opts.dryRun) await release(studentId, claimedIds, stamp)
      return { status: 'skipped', reason: 'no credits returned' }
    }

    // 2. Facts: language, address, which test.
    const sessionIds = opts.sessionIds?.length
      ? opts.sessionIds
      : Array.from(new Set(claimed.map(r => r.source_id).filter((v): v is string => !!v)))
    const [{ data: user }, langPref, tests] = await Promise.all([
      dbAdmin.from('users').select('email, name').eq('id', studentId).maybeSingle(),
      studentNotifLang(studentId),
      loadTestNames(sessionIds),
    ])
    const lang = toNoticeLang(langPref)
    const to = (user as { email?: string | null } | null)?.email ?? ''
    const notice = buildRefundNotice({
      lang, count, test: testLabel(tests, lang), reason: pickReason(reason, lang),
      name: (user as { name?: string | null } | null)?.name ?? null, appOrigin: APP_ORIGIN(),
    })
    const emailable = isPlausibleEmail(to)
    if (opts.dryRun) return { status: 'dry_run', count, lang, to: emailable ? to : null, notice }

    // 3. Email first: a failed send releases the claim and posts no in-app
    //    notice yet, so the retry cannot post it twice.
    if (emailable) {
      const sent = await sendResendEmail({ to, subject: notice.email.subject, html: notice.email.html, text: notice.email.text })
      if (sent.suppressed) return { status: 'skipped', reason: 'address suppressed' }
      if (!sent.sent) {
        await release(studentId, claimedIds, stamp)
        await raiseAlert({ severity: 'warning', title: 'Credit refund email failed', dedupeKey: `refund-notice:${studentId}:${claimedIds.sort()[0]}`,
          message: sent.error ?? 'send failed', context: { studentId, ledgerIds: claimedIds, toDomain: to.split('@')[1] ?? null } })
        return { status: 'failed', reason: sent.error ?? 'send failed' }
      }
    } else {
      await raiseAlert({ severity: 'warning', title: 'Credit refund not emailed: unusable address', dedupeKey: `refund-notice-bad-email:${studentId}`,
        message: `${count} refunded credit(s) were announced in-app only; the account's email cannot receive mail.`, context: { studentId } })
    }

    // 4. In-app notice.
    await notifyStudent({
      studentId, kind: 'study_credits_refunded', variant: notice.variant, push: false, lang: langPref,
      titleParams: notice.titleParams, messageParams: notice.messageParams, link: '/mobile/study',
    })
    if (!emailable) return { status: 'skipped', reason: 'unusable email address (in-app notice posted)' }
    return { status: 'sent', count, lang, to, notice }
  } catch (e) {
    if (!opts.dryRun && claimed.length) await release(studentId, claimed.map(r => r.id), stamp).catch(() => {})
    const why = e instanceof Error ? e.message : String(e)
    console.error('[credit-refund-notify] unexpected', studentId, why)
    return { status: 'failed', reason: why }
  }
}
