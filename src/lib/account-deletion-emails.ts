/**
 * Transactional emails for the account-deletion flow.
 *
 * Three templates:
 *   - accountScheduledForDeletion: sent immediately when a user clicks
 *     Delete Account and the schedule lands. Confirms what's about to
 *     happen + the 30-day reactivation window.
 *   - academyClosureNotice: sent to OTHER academy members when a sole
 *     manager confirms the cascade-delete option. Their account will be
 *     hard-deleted in 30 days along with the academy.
 *   - accountPermanentlyDeleted: sent by the cron after the hard delete
 *     completes. Final confirmation; closes the loop.
 *
 * All three are best-effort — failures are logged but never block the
 * deletion itself (we don't want a Postmark outage to leave a customer's
 * deletion request hanging).
 *
 * Uses Postmark via the same pattern as src/app/api/emails/welcome/route.ts.
 */

const FROM_EMAIL =
  process.env.POSTMARK_FROM_EMAIL || 'no-reply@classraum.com'
const APP_URL = 'https://app.classraum.com'

export type DeletionEmailLanguage = 'en' | 'ko'

function normalizeLanguage(input?: string | null): DeletionEmailLanguage {
  return input === 'korean' || input === 'ko' ? 'ko' : 'en'
}

/**
 * Escape user-controlled values before interpolating into HTML email
 * bodies. CRITICAL: name + academyName flow from user input — a
 * malicious manager could otherwise inject arbitrary HTML (phishing
 * links, fake "click to keep your data" buttons) and have it sent to
 * every academy member from our verified Postmark sender.
 *
 * Subjects don't need escaping for Postmark structured JSON submission
 * (the header is set via JSON field, not raw header line), but we
 * escape them anyway for consistency and defense-in-depth.
 */
function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buttonStyles() {
  return `display:inline-block;background:#2563eb;color:#ffffff !important;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;`
}

function wrapHtml(language: DeletionEmailLanguage, title: string, inner: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#2563eb;margin:0;font-size:28px;">Classraum</h1>
      </div>
      ${inner}
      <div style="margin-top:30px;text-align:center;color:#888;font-size:13px;">
        <p>${
          language === 'ko'
            ? '이 이메일은 Classraum에서 자동으로 발송되었습니다.'
            : 'This email was sent automatically by Classraum.'
        }</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────
// 1) accountScheduledForDeletion
// ─────────────────────────────────────────────────────────────────────────

interface ScheduledEmailParams {
  email: string
  name: string
  language?: string | null
  /** ISO date string for when the hard delete will run. */
  hardDeletionDate: string
}

function scheduledTemplate(p: ScheduledEmailParams) {
  const language = normalizeLanguage(p.language)
  const formattedDate = new Date(p.hardDeletionDate).toLocaleDateString(
    language === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
  // URL-encoded above — but it lands in href="…", so we also need to
  // wrap in a safe attribute context. encodeURIComponent already escapes
  // dangerous chars for URLs; HTML-attribute-context safety comes from
  // the surrounding double-quotes + that no HTML chars survive encoding.
  const reactivateUrl = `${APP_URL}/account/reactivate?email=${encodeURIComponent(p.email)}`
  const name = escapeHtml(p.name)
  const dateStr = escapeHtml(formattedDate)

  if (language === 'ko') {
    return {
      subject: 'Classraum 계정 삭제가 예약되었습니다',
      html: wrapHtml(
        'ko',
        '계정 삭제 예약됨',
        `<h2 style="margin-top:0;color:#111;">계정 삭제가 예약되었습니다, ${name}님</h2>
        <p>요청하신 대로 Classraum 계정을 ${dateStr}에 영구적으로 삭제하도록 예약하였습니다.</p>
        <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#92400e;"><strong>중요:</strong> 30일 이내에 다시 로그인하시면 계정을 복구할 수 있습니다. 30일이 지나면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
        </div>
        <p style="text-align:center;margin:30px 0;">
          <a href="${reactivateUrl}" style="${buttonStyles()}">계정 복구하기</a>
        </p>
        <p style="font-size:13px;color:#666;">실수로 삭제를 요청하셨거나 마음이 바뀌셨다면, 위 링크를 통해 언제든지 복구하실 수 있습니다.</p>`
      ),
    }
  }

  return {
    subject: 'Your Classraum account is scheduled for deletion',
    html: wrapHtml(
      'en',
      'Account scheduled for deletion',
      `<h2 style="margin-top:0;color:#111;">Your account is scheduled for deletion, ${name}</h2>
      <p>As requested, your Classraum account is scheduled to be permanently deleted on <strong>${dateStr}</strong>.</p>
      <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#92400e;"><strong>Important:</strong> You can reactivate your account by signing back in within the next 30 days. After that, all your data will be permanently deleted and cannot be recovered.</p>
      </div>
      <p style="text-align:center;margin:30px 0;">
        <a href="${reactivateUrl}" style="${buttonStyles()}">Reactivate my account</a>
      </p>
      <p style="font-size:13px;color:#666;">If you didn't mean to request deletion or have changed your mind, you can reactivate at any time using the link above.</p>`
    ),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2) academyClosureNotice
// ─────────────────────────────────────────────────────────────────────────

interface AcademyClosureEmailParams {
  email: string
  name: string
  language?: string | null
  academyName: string
  hardDeletionDate: string
}

function academyClosureTemplate(p: AcademyClosureEmailParams) {
  const language = normalizeLanguage(p.language)
  const formattedDate = new Date(p.hardDeletionDate).toLocaleDateString(
    language === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
  // Both name and academyName are user-controlled; HTML-escape before
  // interpolation. The academy name particularly is a phishing vector:
  // a malicious sole-manager could set it to a payload that emails
  // every member with an attacker-controlled link, from our verified
  // sender domain.
  const name = escapeHtml(p.name)
  const academyName = escapeHtml(p.academyName)
  const dateStr = escapeHtml(formattedDate)

  if (language === 'ko') {
    return {
      // Subject is set via Postmark JSON `Subject` field — header
      // injection isn't possible there — but the rendered subject text
      // is still attacker-controlled. Mostly cosmetic but escape for
      // consistency.
      subject: `[중요] ${academyName} 학원이 폐쇄됩니다`,
      html: wrapHtml(
        'ko',
        '학원 폐쇄 알림',
        `<h2 style="margin-top:0;color:#dc2626;">학원 폐쇄 알림</h2>
        <p>안녕하세요 ${name}님,</p>
        <p>소속하고 계신 <strong>${academyName}</strong> 학원이 학원 소유자에 의해 ${dateStr}에 영구적으로 폐쇄될 예정입니다.</p>
        <div style="background:#fee2e2;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 10px 0;color:#991b1b;"><strong>이는 귀하의 계정에 어떤 영향을 미치나요?</strong></p>
          <ul style="margin:0;padding-left:20px;color:#7f1d1d;">
            <li>학원이 폐쇄되면 귀하의 계정도 함께 영구적으로 삭제됩니다</li>
            <li>모든 수업, 과제, 성적, 결제 기록이 삭제됩니다</li>
            <li>이 작업은 ${dateStr} 이후 되돌릴 수 없습니다</li>
          </ul>
        </div>
        <p><strong>${dateStr} 전까지 권장 조치:</strong></p>
        <ul>
          <li>중요한 데이터(과제, 성적, 결제 내역 등)를 저장해두세요</li>
          <li>학원 소유자에게 폐쇄 사유와 일정을 확인하세요</li>
          <li>필요한 경우 다른 학원으로 이동을 준비하세요</li>
        </ul>
        <p style="font-size:13px;color:#666;">이 결정은 학원 소유자가 한 것이며 Classraum이 결정한 것이 아닙니다. 문의 사항이 있으시면 학원 소유자에게 직접 연락하시거나 support@classraum.com으로 문의해주세요.</p>`
      ),
    }
  }

  return {
    subject: `[Important] ${academyName} is closing`,
    html: wrapHtml(
      'en',
      'Academy closure notice',
      `<h2 style="margin-top:0;color:#dc2626;">Academy closure notice</h2>
      <p>Hi ${name},</p>
      <p>The academy you belong to, <strong>${academyName}</strong>, is scheduled to be permanently closed by its owner on <strong>${dateStr}</strong>.</p>
      <div style="background:#fee2e2;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 10px 0;color:#991b1b;"><strong>What this means for your account:</strong></p>
        <ul style="margin:0;padding-left:20px;color:#7f1d1d;">
          <li>When the academy closes, your account will also be permanently deleted</li>
          <li>All your classes, assignments, grades, and payment records will be deleted</li>
          <li>This action cannot be reversed after ${dateStr}</li>
        </ul>
      </div>
      <p><strong>Recommended actions before ${dateStr}:</strong></p>
      <ul>
        <li>Save any important data (assignments, grades, payment history)</li>
        <li>Check with the academy owner for the closure reason and timeline</li>
        <li>Prepare to move to another academy if needed</li>
      </ul>
      <p style="font-size:13px;color:#666;">This decision was made by the academy owner, not by Classraum. If you have questions, please contact the academy owner directly or email support@classraum.com.</p>`
    ),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3) accountPermanentlyDeleted
// ─────────────────────────────────────────────────────────────────────────

interface PermanentlyDeletedEmailParams {
  email: string
  name: string
  language?: string | null
}

function permanentlyDeletedTemplate(p: PermanentlyDeletedEmailParams) {
  const language = normalizeLanguage(p.language)
  const name = escapeHtml(p.name)

  if (language === 'ko') {
    return {
      subject: 'Classraum 계정이 영구적으로 삭제되었습니다',
      html: wrapHtml(
        'ko',
        '계정 삭제 완료',
        `<h2 style="margin-top:0;color:#111;">계정이 영구적으로 삭제되었습니다</h2>
        <p>${name}님, Classraum 계정 및 관련된 모든 데이터가 영구적으로 삭제되었음을 알려드립니다.</p>
        <p>그동안 Classraum을 이용해주셔서 감사합니다. 언제든지 다시 이용하시려면 새 계정을 만드실 수 있습니다.</p>
        <p style="font-size:13px;color:#666;">결제 영수증 등 법적 보존이 필요한 일부 재무 기록은 한국 세법에 따라 익명화된 형태로 보존됩니다.</p>`
      ),
    }
  }

  return {
    subject: 'Your Classraum account has been permanently deleted',
    html: wrapHtml(
      'en',
      'Account permanently deleted',
      `<h2 style="margin-top:0;color:#111;">Your account has been permanently deleted</h2>
      <p>Hi ${name}, we're writing to confirm that your Classraum account and all associated data have been permanently deleted.</p>
      <p>Thank you for using Classraum. If you'd like to return in the future, you're welcome to create a new account.</p>
      <p style="font-size:13px;color:#666;">Some financial records (e.g. payment receipts) are retained in anonymized form per Korean tax law requirements.</p>`
    ),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Send helpers — best-effort; never throw.
// ─────────────────────────────────────────────────────────────────────────

async function sendPostmarkEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ sent: boolean; error?: string }> {
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN
  if (!postmarkToken) {
    return { sent: false, error: 'POSTMARK_SERVER_TOKEN not configured' }
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
        From: FROM_EMAIL,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { sent: false, error: (body as { Message?: string })?.Message || `HTTP ${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: (e as Error).message }
  }
}

export async function sendAccountScheduledForDeletionEmail(
  params: ScheduledEmailParams
): Promise<{ sent: boolean; error?: string }> {
  if (!params.email) return { sent: false, error: 'missing email' }
  const tmpl = scheduledTemplate(params)
  return sendPostmarkEmail(params.email, tmpl.subject, tmpl.html)
}

export async function sendAcademyClosureNoticeEmail(
  params: AcademyClosureEmailParams
): Promise<{ sent: boolean; error?: string }> {
  if (!params.email) return { sent: false, error: 'missing email' }
  const tmpl = academyClosureTemplate(params)
  return sendPostmarkEmail(params.email, tmpl.subject, tmpl.html)
}

export async function sendAccountPermanentlyDeletedEmail(
  params: PermanentlyDeletedEmailParams
): Promise<{ sent: boolean; error?: string }> {
  if (!params.email) return { sent: false, error: 'missing email' }
  const tmpl = permanentlyDeletedTemplate(params)
  return sendPostmarkEmail(params.email, tmpl.subject, tmpl.html)
}
