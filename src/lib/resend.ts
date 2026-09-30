/**
 * Resend email sender — the auth-email path.
 *
 * Transactional product mail (deletion notices, weekly recap) goes through
 * Postmark (src/lib/postmark.ts). Auth mail — confirmation, password reset,
 * magic link, email change — goes through Resend, because that is the
 * provider wired to Supabase's Send Email hook (src/app/api/auth/email-hook).
 * Same shape as sendPostmarkEmail on purpose: best-effort, never throws,
 * callers decide whether a failure is fatal (the hook route does treat it as
 * fatal — Supabase must know the mail did not go out).
 */
import { normalizeEmail, suppressedAmong } from './email-suppression'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Classraum <no-reply@classraum.com>'

export interface ResendSendOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface ResendSendResult {
  sent: boolean
  id?: string
  error?: string
  /** Every recipient is on the suppression list; nothing was sent, on
   *  purpose. Callers should treat this as done, not as a failure to retry. */
  suppressed?: true
}

export async function sendResendEmail(opts: ResendSendOptions): Promise<ResendSendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, error: 'RESEND_API_KEY is not set' }
  const all = Array.isArray(opts.to) ? opts.to : [opts.to]
  const blocked = await suppressedAmong(all)
  const to = all.filter(a => !blocked.has(normalizeEmail(a)))
  if (to.length === 0) return { sent: false, suppressed: true, error: 'recipient is on the suppression list' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from ?? FROM_EMAIL,
        to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
      }),
    })
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
    if (!res.ok) return { sent: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? 'unknown error'}` }
    return { sent: true, id: body.id }
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) }
  }
}
