/**
 * GET /api/cron/account-deletion-digest
 *
 * Weekly health digest for the account-deletion sweep. Runs every
 * Monday at 00:00 UTC (= 09:00 Asia/Seoul, start of work week).
 *
 * Why it exists:
 *   Account deletion is irreversible and legally bound (PIPA + the
 *   privacy policy promises 30-day permanent deletion). The sweep at
 *   /api/cron/process-account-deletions does the work, but until this
 *   digest existed there was zero visibility — a silent cron failure
 *   for a week would mean accounts that legally should have been
 *   purged are still in the database, with no operator notified.
 *
 * What it reports:
 *   - Requests scheduled in the past 7 days
 *   - Reactivations in the past 7 days
 *   - Hard deletions in the past 7 days
 *   - Currently in-grace-period (informational)
 *   - Overdue (CRITICAL): rows where scheduled_at is older than 30 days
 *     but hard_deleted_at is still null and reactivated_at is null. If
 *     this is > 0, the sweep is not running or failing for those rows.
 *
 * Where it goes:
 *   ALERT_EMAIL_RECIPIENTS (comma-separated). Falls back to logging
 *   the digest body if no recipients are configured.
 *
 * Auth: CRON_SECRET_KEY in Authorization: Bearer header, matching the
 * pattern of the existing crons.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendPostmarkEmail } from '@/lib/postmark'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

interface DigestStats {
  scheduledThisWeek: number
  reactivatedThisWeek: number
  hardDeletedThisWeek: number
  currentlyInGrace: number
  overdue: number
  oldestOverdueDays: number | null
}

export async function GET(request: NextRequest) {
  // Auth (matches other crons in this directory)
  const authHeader = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - SEVEN_DAYS_MS)
  const graceCutoff = new Date(now.getTime() - THIRTY_DAYS_MS)

  // Single-query aggregation. The account_deletion_log table has indexes
  // on scheduled_at (via the pending_hard_delete partial index) and
  // user_id, so the counts here are cheap even at scale.
  const [
    scheduledThisWeekRes,
    reactivatedThisWeekRes,
    hardDeletedThisWeekRes,
    currentlyInGraceRes,
    overdueRes,
  ] = await Promise.all([
    supabaseAdmin
      .from('account_deletion_log')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', weekAgo.toISOString()),
    supabaseAdmin
      .from('account_deletion_log')
      .select('id', { count: 'exact', head: true })
      .gte('reactivated_at', weekAgo.toISOString())
      .not('reactivated_at', 'is', null),
    supabaseAdmin
      .from('account_deletion_log')
      .select('id', { count: 'exact', head: true })
      .gte('hard_deleted_at', weekAgo.toISOString())
      .not('hard_deleted_at', 'is', null),
    supabaseAdmin
      .from('account_deletion_log')
      .select('id', { count: 'exact', head: true })
      .is('hard_deleted_at', null)
      .is('reactivated_at', null),
    supabaseAdmin
      .from('account_deletion_log')
      .select('id, scheduled_at', { count: 'exact' })
      .is('hard_deleted_at', null)
      .is('reactivated_at', null)
      .lt('scheduled_at', graceCutoff.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1),
  ])

  const stats: DigestStats = {
    scheduledThisWeek: scheduledThisWeekRes.count ?? 0,
    reactivatedThisWeek: reactivatedThisWeekRes.count ?? 0,
    hardDeletedThisWeek: hardDeletedThisWeekRes.count ?? 0,
    currentlyInGrace: currentlyInGraceRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
    oldestOverdueDays: overdueRes.data?.[0]
      ? Math.floor(
          (now.getTime() - new Date(overdueRes.data[0].scheduled_at).getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : null,
  }

  const isCritical = stats.overdue > 0
  const subject = isCritical
    ? `[CRITICAL] ${stats.overdue} overdue account deletion(s) — sweep may be failing`
    : `[OK] Account deletion weekly digest`

  const htmlBody = renderDigest(stats, isCritical, now)

  // Send to all configured recipients. If none, log + return success so
  // the cron run isn't marked failed (Vercel retries failed crons; we
  // don't want a config gap to spam logs).
  const recipients = (process.env.ALERT_EMAIL_RECIPIENTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  let emailResult: { sent: boolean; error?: string } = { sent: false, error: 'no recipients' }
  if (recipients.length > 0) {
    emailResult = await sendPostmarkEmail({
      to: recipients,
      subject,
      htmlBody,
      from: process.env.ALERT_EMAIL_FROM || undefined,
    })
  } else {
    console.warn('[account-deletion-digest] No ALERT_EMAIL_RECIPIENTS configured; digest:', stats)
  }

  // Always return 200 with the structured summary — useful for manual
  // invocation + dashboards. Vercel's cron UI shows the response body.
  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    critical: isCritical,
    stats,
    email: {
      attempted: recipients.length > 0,
      recipients: recipients.length,
      sent: emailResult.sent,
      error: emailResult.error,
    },
  })
}

function renderDigest(stats: DigestStats, isCritical: boolean, now: Date): string {
  const since = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const criticalBlock = isCritical
    ? `
    <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:0 0 24px 0;">
      <h2 style="margin:0 0 8px 0;color:#991b1b;font-size:16px;">⚠️ Critical: ${stats.overdue} overdue deletion(s)</h2>
      <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.5;">
        These rows have <code>scheduled_at</code> older than 30 days but no <code>hard_deleted_at</code> or <code>reactivated_at</code>.
        The oldest is <strong>${stats.oldestOverdueDays} days</strong> overdue.
        Check the <code>/api/cron/process-account-deletions</code> Vercel logs and the <code>alerts</code> table for failures.
      </p>
    </div>`
    : ''

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 4px 0;">Account Deletion — Weekly Digest</h1>
  <p style="color:#6b7280;font-size:13px;margin:0 0 24px 0;">${since} → ${today}</p>
  ${criticalBlock}
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">Newly scheduled (past 7 days)</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${stats.scheduledThisWeek}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">Reactivated (past 7 days)</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${stats.reactivatedThisWeek}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">Hard-deleted (past 7 days)</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${stats.hardDeletedThisWeek}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">Currently in 30-day grace period</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${stats.currentlyInGrace}</td></tr>
    <tr><td style="padding:8px 0;${isCritical ? 'color:#dc2626;font-weight:600;' : ''}">Overdue (sweep should have processed)</td><td style="padding:8px 0;text-align:right;font-weight:600;${isCritical ? 'color:#dc2626;' : ''}">${stats.overdue}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px;margin:24px 0 0 0;line-height:1.6;">
    Sweep schedule: daily at 03:00 UTC (<code>/api/cron/process-account-deletions</code>).<br>
    Digest schedule: weekly, Monday 00:00 UTC (<code>/api/cron/account-deletion-digest</code>).<br>
    Configure recipients via <code>ALERT_EMAIL_RECIPIENTS</code>.
  </p>
</body></html>`
}
