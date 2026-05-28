/**
 * Postmark email sender — single source of truth.
 *
 * Previously this same fetch-to-Postmark code lived in
 * src/lib/account-deletion-emails.ts and src/app/api/emails/welcome/route.ts
 * with subtle differences (different MessageStream behaviour, different
 * error shapes). Centralised so:
 *   - All transactional email goes through one auditable path
 *   - Future changes (retry logic, batch sends, attachments, message
 *     streams) happen in one place
 *   - The cron monitoring digest can reuse it without reaching into a
 *     feature module
 *
 * Best-effort by design — returns { sent: false, error } on failure
 * rather than throwing. Callers decide whether to surface or swallow.
 */

const FROM_EMAIL =
  process.env.POSTMARK_FROM_EMAIL || 'no-reply@classraum.com'

export interface PostmarkSendResult {
  sent: boolean
  error?: string
}

export interface PostmarkSendOptions {
  to: string | string[]
  subject: string
  htmlBody: string
  /** Postmark message stream — "outbound" (transactional) is the default
   *  and matches what the codebase has used historically. */
  messageStream?: string
  /** Override the From address (default uses POSTMARK_FROM_EMAIL env). */
  from?: string
  /** Optional reply-to override. */
  replyTo?: string
}

/**
 * Send an HTML email via the Postmark REST API.
 *
 * @returns sent=true if Postmark responded 2xx, sent=false with an
 *   error message otherwise. Never throws.
 */
export async function sendPostmarkEmail(
  options: PostmarkSendOptions
): Promise<PostmarkSendResult> {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN
  if (!postmarkToken) {
    return { sent: false, error: 'POSTMARK_SERVER_TOKEN not configured' }
  }

  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to
  if (!to.trim()) {
    return { sent: false, error: 'no recipients' }
  }

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Postmark-Server-Token': postmarkToken,
      },
      body: JSON.stringify({
        From: options.from || FROM_EMAIL,
        To: to,
        ReplyTo: options.replyTo,
        Subject: options.subject,
        HtmlBody: options.htmlBody,
        MessageStream: options.messageStream || 'outbound',
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        sent: false,
        error: (body as { Message?: string })?.Message || `HTTP ${res.status}`,
      }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: (e as Error).message }
  }
}
