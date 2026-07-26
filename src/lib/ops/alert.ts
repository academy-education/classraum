import * as Sentry from '@sentry/nextjs'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * The single way server code reports "something is wrong".
 *
 * Every serious bug found in this codebase shared one trait: it failed
 * silently. Four notification kinds were rejected by a CHECK constraint
 * on every attempt since launch and nothing logged it; ₩99,200 of
 * refunded money was counted as revenue for months; credits were spent
 * on tests that never generated. All of it was `console.error` at best —
 * a line in a serverless log nobody reads.
 *
 * raiseAlert() fans one report out to three places:
 *   1. the `alerts` table, which the admin dashboard already renders and
 *      lets you resolve — the durable, in-product record;
 *   2. Sentry, for stack traces and grouping;
 *   3. email, for `critical` only, so genuine pages reach a human.
 *
 * It never throws. An alerting path that can break the thing it is
 * watching is worse than no alerting.
 */

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface AlertInput {
  severity: AlertSeverity
  /** Short human title, e.g. "Cron has not run". */
  title: string
  /** One or two sentences: what happened and what it means. */
  message: string
  /**
   * Stable identity for this condition (e.g. `cron-stale:study-billing`).
   * While an unresolved alert with the same key exists we refresh it
   * instead of inserting a duplicate — otherwise a watchdog running
   * every 30 minutes would bury the dashboard in identical rows.
   */
  dedupeKey: string
  error?: unknown
  context?: Record<string, unknown>
}

const errText = (e: unknown): string | null =>
  e == null ? null : e instanceof Error ? e.message : String(e)
const errStack = (e: unknown): string | null =>
  e instanceof Error ? (e.stack ?? null) : null

export async function raiseAlert(input: AlertInput): Promise<void> {
  const { severity, title, message, dedupeKey, error, context } = input
  const ctx = { ...(context ?? {}), dedupeKey }

  // Always log — this is the last resort if both sinks below fail.
  const line = `[alert:${severity}] ${title} — ${message}`
  if (severity === 'critical') console.error(line, ctx, error ?? '')
  else console.warn(line, ctx, error ?? '')

  try {
    Sentry.captureMessage(`${title}: ${message}`, {
      level: severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info',
      tags: { dedupeKey, alertSeverity: severity },
      extra: ctx,
    })
    if (error) Sentry.captureException(error, { tags: { dedupeKey }, extra: ctx })
  } catch (e) {
    console.error('[alert] sentry capture failed', e)
  }

  try {
    // Dedupe against the OPEN alert only. Once you resolve it on the
    // dashboard, a recurrence is allowed to raise a fresh row — that is
    // how you learn the problem came back.
    const { data: open } = await supabaseAdmin
      .from('alerts')
      .select('id')
      .eq('resolved', false)
      .contains('context', { dedupeKey })
      .limit(1)

    if (open && open.length > 0) {
      await supabaseAdmin
        .from('alerts')
        .update({
          message,
          error_message: errText(error),
          error_stack: errStack(error),
          context: { ...ctx, lastSeenAt: new Date().toISOString() },
        })
        .eq('id', open[0]!.id)
    } else {
      await supabaseAdmin.from('alerts').insert({
        severity, title, message,
        error_message: errText(error),
        error_stack: errStack(error),
        context: ctx,
      })
    }
  } catch (e) {
    console.error('[alert] failed to persist alert row', e)
  }

  if (severity === 'critical') {
    try {
      await emailOncall(title, message, ctx)
    } catch (e) {
      console.error('[alert] critical email failed', e)
    }
  }
}

/**
 * Email for critical alerts only. Deliberately best-effort and quiet
 * when unconfigured — a missing OPS_ALERT_EMAIL must not turn every
 * alert into a second failure.
 */
async function emailOncall(
  title: string,
  message: string,
  ctx: Record<string, unknown>,
): Promise<void> {
  const to = process.env.OPS_ALERT_EMAIL
  if (!to) return
  const { sendPostmarkEmail } = await import('@/lib/postmark')
  // sendPostmarkEmail never throws; it reports {sent,error}. Surface a
  // failed page in the log — if email is down we still have the alerts
  // row and Sentry.
  const res = await sendPostmarkEmail({
    to,
    subject: `[Classraum] ${title}`,
    htmlBody:
      `<p><strong>${title}</strong></p><p>${message}</p>` +
      `<pre style="font:12px/1.5 ui-monospace,monospace;background:#f6f6f6;padding:12px;border-radius:6px">` +
      `${JSON.stringify(ctx, null, 2)}</pre>`,
  })
  if (!res.sent) console.error('[alert] critical email not sent:', res.error)
}
