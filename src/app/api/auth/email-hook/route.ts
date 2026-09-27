import { NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { sendResendEmail } from '@/lib/resend'
import { raiseAlert } from '@/lib/ops/alert'
import {
  appOriginFor, buildAuthEmail, confirmLink, detectLanguage, nextPathFor, verifyStandardWebhook,
  type HookPayload,
} from '@/lib/auth/email-hook'

/**
 * POST /api/auth/email-hook — Supabase Auth "Send Email" hook.
 *
 * Supabase calls this instead of sending mail itself (Dashboard → Auth →
 * Hooks → Send Email → HTTPS, URL = this route, secret = SEND_EMAIL_HOOK_SECRET).
 * We verify the Standard Webhooks signature, build a Korean or English mail
 * whose link lands on OUR /auth/confirm, and send it through Resend.
 *
 * Contract: 200 with `{}` means "sent"; any non-2xx makes Supabase report
 * the send as failed to the caller (signUp/resetPasswordForEmail return an
 * error), which is what we want — a silent 200 over a failed send would
 * strand the user with no mail and no message.
 *
 * DRY RUN: with no RESEND_API_KEY outside production, the mail is logged to
 * the server console (link included) and 200 is returned, so the whole flow
 * can be exercised locally before the Resend account exists.
 */
export const dynamic = 'force-dynamic'

const DEFAULT_APP_ORIGIN = process.env.AUTH_EMAIL_APP_ORIGIN || 'https://app.classraum.com'

/**
 * GET — configuration probe, booleans only. Supabase reports a failed hook
 * as "Unexpected status code returned from hook: 500" and nothing else, so
 * this is how "is the Resend key on production?" gets answered without a
 * trip to the Vercel logs. Reveals presence, never values.
 */
export async function GET(request: Request) {
  const base = {
    hookSecret: Boolean(process.env.SEND_EMAIL_HOOK_SECRET),
    resendKey: Boolean(process.env.RESEND_API_KEY),
    from: process.env.RESEND_FROM_EMAIL ?? '(default) Classraum <no-reply@classraum.com>',
    appOrigin: DEFAULT_APP_ORIGIN,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    probe: 6,
  }
  // ?diag=1 asks Resend (read-only) whether the key works and which sending
  // domains are verified — the two things a failed send usually comes down to.
  if (new URL(request.url).searchParams.get('diag') === '1' && process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } })
      const body = (await r.json().catch(() => ({}))) as { data?: Array<{ name: string; status: string; region?: string }>; message?: string; name?: string }
      return NextResponse.json({ ...base, resend: { keyValid: r.ok, status: r.status, error: r.ok ? undefined : (body.message ?? body.name), domains: (body.data ?? []).map(d => ({ name: d.name, status: d.status, region: d.region })) } })
    } catch (e) {
      return NextResponse.json({ ...base, resend: { keyValid: false, error: e instanceof Error ? e.message : String(e) } })
    }
  }
  // Temporary diagnostics (2026-09-28): a direct Resend send to the admin
  // address and a direct alert write, so each half can be tested without
  // Supabase in the loop. Recipient is fixed, so the worst case is a probe
  // mail to the admin. Remove once the hook is proven.
  const probe = new URL(request.url).searchParams
  if (probe.get('send') === '1') {
    const r = await sendResendEmail({ to: 'leeandy755@gmail.com', subject: 'Classraum auth-mail probe', html: '<p>Resend probe from /api/auth/email-hook</p>', text: 'Resend probe' })
    return NextResponse.json({ ...base, directSend: r })
  }
  if (probe.get('alert') === '1') {
    try {
      await raiseAlert({ severity: 'info', title: 'Auth email hook probe', message: 'alert write test', dedupeKey: `auth-email-probe:${Date.now()}` })
      return NextResponse.json({ ...base, alertWrite: 'ok' })
    } catch (e) {
      return NextResponse.json({ ...base, alertWrite: 'threw', error: e instanceof Error ? e.message : String(e) })
    }
  }
  return NextResponse.json(base)
}

export async function POST(request: Request) {
  try {
    return await handle(request)
  } catch (e) {
    // A crash anywhere above returns a bare 500 to Supabase, which reports
    // only the status. Record the exception where it can be read.
    await raiseAlert({
      severity: 'critical', title: 'Auth email hook crashed',
      message: e instanceof Error ? e.message : String(e), dedupeKey: 'auth-email-hook-crash',
      error: e instanceof Error ? e : undefined,
    }).catch(() => {})
    return NextResponse.json({ error: { http_code: 500, message: e instanceof Error ? e.message : 'crash' } }, { status: 500 })
  }
}

async function handle(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  if (!secret) return NextResponse.json({ error: { http_code: 500, message: 'SEND_EMAIL_HOOK_SECRET is not set' } }, { status: 500 })

  const raw = await request.text()
  const bad = verifyStandardWebhook({
    id: request.headers.get('webhook-id'),
    timestamp: request.headers.get('webhook-timestamp'),
    signature: request.headers.get('webhook-signature'),
  }, raw, secret)
  if (bad) return NextResponse.json({ error: { http_code: 401, message: `invalid signature: ${bad}` } }, { status: 401 })

  let payload: HookPayload
  try { payload = JSON.parse(raw) as HookPayload } catch {
    return NextResponse.json({ error: { http_code: 400, message: 'body is not JSON' } }, { status: 400 })
  }
  const { user, email_data: ed } = payload
  const type = ed?.email_action_type
  // email_change sends to the NEW address with token_hash_new; the old address gets the plain token_hash.
  const toEmail = type === 'email_change_new' ? (user.new_email ?? user.email) : user.email
  if (!user?.id || !toEmail || !type) return NextResponse.json({ error: { http_code: 400, message: 'payload missing user/email/type' } }, { status: 400 })

  let prefsLanguage: string | null = null
  try {
    const { data } = await dbAdmin.from('user_preferences').select('language').eq('user_id', user.id).maybeSingle()
    prefsLanguage = (data as { language?: string | null } | null)?.language ?? null
  } catch { /* language falls back below */ }
  const lang = detectLanguage(user, prefsLanguage)

  const origin = appOriginFor(ed.redirect_to, DEFAULT_APP_ORIGIN)
  const tokenHash = type === 'email_change_new' ? ed.token_hash_new : ed.token_hash
  const link = tokenHash && type !== 'reauthentication' ? confirmLink(origin, tokenHash, type === 'email_change_new' ? 'email_change' : type, nextPathFor(ed.redirect_to)) : null
  const mail = buildAuthEmail({ type, lang, link, token: ed.token ?? null, toEmail })
  if (!mail) return NextResponse.json({ error: { http_code: 400, message: `unsupported email_action_type ${type}` } }, { status: 400 })

  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[email-hook DRY RUN] to=${toEmail} type=${type} lang=${lang}\n  subject: ${mail.subject}\n  link: ${link ?? '(none)'}`)
    return NextResponse.json({})
  }

  const sent = await sendResendEmail({ to: toEmail, subject: mail.subject, html: mail.html, text: mail.text })
  if (!sent.sent) {
    // Supabase reports only "unexpected status code" to the caller, so the
    // provider's reason is recorded where it can be read: the ops alerts
    // table (and the log). Recipient domain only — no address.
    await raiseAlert({
      severity: 'warning',
      title: 'Auth email send failed',
      message: sent.error ?? 'send failed',
      dedupeKey: `auth-email-send:${type}`,
      context: { type, lang, toDomain: toEmail.split('@')[1] ?? null },
    })
    return NextResponse.json({ error: { http_code: 500, message: sent.error ?? 'send failed' } }, { status: 500 })
  }
  return NextResponse.json({})
}
