/**
 * Supabase "Send Email" auth hook — the pure parts.
 *
 * Supabase Auth calls our endpoint instead of sending mail itself. The
 * request is signed per the Standard Webhooks spec (headers webhook-id,
 * webhook-timestamp, webhook-signature; secret `v1,whsec_<base64>`), and
 * carries `{ user, email_data }` where email_data holds the one-time
 * token_hash and the action type (signup, recovery, magiclink, invite,
 * email_change, reauthentication).
 *
 * We build the link ourselves, to OUR /auth/confirm route, and verify the
 * token_hash there server-side (verifyOtp). That is what makes the link
 * work regardless of Supabase's Site URL, on any subdomain, and lets the
 * callback redirect by role. Nothing here touches the network so all of
 * it is unit-tested.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { escapeHtml } from '@/lib/html-escape'

export type EmailActionType =
  | 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change' | 'email_change_new' | 'reauthentication'

export type AuthEmailLanguage = 'ko' | 'en'

export interface HookPayload {
  user: {
    id: string
    email?: string
    new_email?: string | null
    user_metadata?: Record<string, unknown> | null
  }
  email_data: {
    token?: string
    token_hash?: string
    token_new?: string
    token_hash_new?: string
    redirect_to?: string
    email_action_type: EmailActionType | string
    site_url?: string
  }
}

// ── Standard Webhooks signature ────────────────────────────────────────────

const TOLERANCE_S = 5 * 60

/** Returns null when valid, otherwise the reason. `now` is injectable for tests. */
export function verifyStandardWebhook(
  headers: { id?: string | null; timestamp?: string | null; signature?: string | null },
  rawBody: string,
  secret: string,
  now: number = Date.now(),
): string | null {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return 'missing webhook headers'
  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) return 'bad timestamp'
  if (Math.abs(now / 1000 - ts) > TOLERANCE_S) return 'timestamp outside tolerance'
  const b64 = secret.replace(/^v1,/, '').replace(/^whsec_/, '')
  let key: Buffer
  try { key = Buffer.from(b64, 'base64') } catch { return 'bad secret' }
  if (!key.length) return 'bad secret'
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64')
  const candidates = signature.split(' ').map(s => s.trim()).filter(Boolean)
    .map(s => (s.startsWith('v1,') ? s.slice(3) : s))
  const exp = Buffer.from(expected)
  for (const c of candidates) {
    const got = Buffer.from(c)
    if (got.length === exp.length && timingSafeEqual(got, exp)) return null
  }
  return 'signature mismatch'
}

// ── Language ──────────────────────────────────────────────────────────────

export function detectLanguage(user: HookPayload['user'], prefsLanguage?: string | null): AuthEmailLanguage {
  const meta = (user.user_metadata?.lang ?? user.user_metadata?.language) as unknown
  const v = typeof meta === 'string' ? meta : prefsLanguage
  if (v === 'english' || v === 'en') return 'en'
  return 'ko'
}

// ── Links ─────────────────────────────────────────────────────────────────

/** Hosts a confirmation link may land on. Anything else falls back to APP_ORIGIN. */
const ALLOWED_HOST = /^(app\.)?(www\.)?classraum\.com$|^app\.localhost(:\d+)?$|^localhost(:\d+)?$/

export function appOriginFor(redirectTo: string | undefined, fallback: string): string {
  try {
    if (redirectTo) {
      const u = new URL(redirectTo)
      if (ALLOWED_HOST.test(u.host)) return u.origin
    }
  } catch { /* fall through */ }
  return fallback
}

/** The path-and-query part of redirect_to, kept only when it is a plain relative destination on our host. */
export function nextPathFor(redirectTo: string | undefined): string | null {
  try {
    if (!redirectTo) return null
    const u = new URL(redirectTo)
    if (!ALLOWED_HOST.test(u.host)) return null
    const p = `${u.pathname}${u.search}`
    return p.startsWith('/') && !p.startsWith('//') ? p : null
  } catch { return null }
}

export function confirmLink(origin: string, tokenHash: string, type: string, next: string | null): string {
  const u = new URL('/auth/confirm', origin)
  u.searchParams.set('token_hash', tokenHash)
  u.searchParams.set('type', type)
  if (next) u.searchParams.set('next', next)
  return u.toString()
}

// ── Templates ─────────────────────────────────────────────────────────────

export interface AuthEmail { subject: string; html: string; text: string }

const COPY: Record<AuthEmailLanguage, Record<string, { subject: string; title: string; body: string; cta: string; expiry: string; ignore: string }>> = {
  ko: {
    signup:           { subject: '[Classraum] 이메일 주소를 확인해 주세요', title: '이메일 확인', body: 'Classraum 가입을 환영해요. 아래 버튼을 눌러 이메일 주소를 확인하면 계정이 활성화돼요.', cta: '이메일 확인하기', expiry: '이 링크는 24시간 동안 유효해요.', ignore: '가입한 적이 없다면 이 메일은 무시해 주세요.' },
    recovery:         { subject: '[Classraum] 비밀번호 재설정', title: '비밀번호 재설정', body: '비밀번호 재설정을 요청하셨어요. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.', cta: '비밀번호 재설정하기', expiry: '이 링크는 1시간 동안 유효해요.', ignore: '요청한 적이 없다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.' },
    magiclink:        { subject: '[Classraum] 로그인 링크', title: '로그인 링크', body: '아래 버튼을 눌러 바로 로그인하세요.', cta: '로그인하기', expiry: '이 링크는 1시간 동안 유효해요.', ignore: '요청한 적이 없다면 이 메일은 무시해 주세요.' },
    invite:           { subject: '[Classraum] 초대를 받았어요', title: 'Classraum 초대', body: 'Classraum에 초대되었어요. 아래 버튼을 눌러 계정을 만들어 주세요.', cta: '초대 수락하기', expiry: '이 링크는 24시간 동안 유효해요.', ignore: '모르는 초대라면 이 메일은 무시해 주세요.' },
    email_change:     { subject: '[Classraum] 이메일 변경 확인', title: '이메일 변경 확인', body: '계정 이메일 주소 변경을 요청하셨어요. 아래 버튼을 눌러 변경을 확인해 주세요.', cta: '변경 확인하기', expiry: '이 링크는 24시간 동안 유효해요.', ignore: '요청한 적이 없다면 이 메일은 무시하고 비밀번호를 바꿔 주세요.' },
    verify:           { subject: '[Classraum] 이메일 주소를 인증해 주세요', title: '이메일 인증', body: '계정의 이메일 주소가 본인 것인지 확인하려고 해요. 아래 버튼을 누르면 인증이 완료되고 바로 로그인돼요.', cta: '이메일 인증하기', expiry: '이 링크는 1시간 동안 유효해요.', ignore: '요청한 적이 없다면 이 메일은 무시해 주세요.' },
    reauthentication: { subject: '[Classraum] 인증 코드', title: '인증 코드', body: '아래 코드를 앱에 입력해 주세요.', cta: '', expiry: '이 코드는 5분 동안 유효해요.', ignore: '요청한 적이 없다면 이 메일은 무시해 주세요.' },
  },
  en: {
    signup:           { subject: 'Confirm your email for Classraum', title: 'Confirm your email', body: 'Welcome to Classraum. Press the button below to confirm your email address and activate your account.', cta: 'Confirm email', expiry: 'This link is valid for 24 hours.', ignore: "If you didn't sign up, you can ignore this email." },
    recovery:         { subject: 'Reset your Classraum password', title: 'Reset your password', body: 'You asked to reset your password. Press the button below to choose a new one.', cta: 'Reset password', expiry: 'This link is valid for 1 hour.', ignore: "If you didn't ask for this, ignore this email — your password won't change." },
    magiclink:        { subject: 'Your Classraum sign-in link', title: 'Sign-in link', body: 'Press the button below to sign in.', cta: 'Sign in', expiry: 'This link is valid for 1 hour.', ignore: "If you didn't ask for this, you can ignore this email." },
    invite:           { subject: "You've been invited to Classraum", title: 'Classraum invitation', body: "You've been invited to Classraum. Press the button below to create your account.", cta: 'Accept invitation', expiry: 'This link is valid for 24 hours.', ignore: "If you don't recognise this invitation, ignore this email." },
    email_change:     { subject: 'Confirm your new Classraum email', title: 'Confirm email change', body: 'You asked to change the email address on your account. Press the button below to confirm.', cta: 'Confirm change', expiry: 'This link is valid for 24 hours.', ignore: "If you didn't ask for this, ignore this email and change your password." },
    verify:           { subject: 'Verify your Classraum email address', title: 'Verify your email', body: 'We want to confirm this email address is yours. Press the button below to verify it — you will be signed in at the same time.', cta: 'Verify email', expiry: 'This link is valid for 1 hour.', ignore: "If you didn't ask for this, you can ignore this email." },
    reauthentication: { subject: 'Your Classraum verification code', title: 'Verification code', body: 'Enter the code below in the app.', cta: '', expiry: 'This code is valid for 5 minutes.', ignore: "If you didn't ask for this, you can ignore this email." },
  },
}

const ASSET_ORIGIN = 'https://www.classraum.com'
const BRAND = { navy: '#163a5f', blue: '#2885e8', teal: '#1fc8b6', ink: '#1f2937', muted: '#6b7280', line: '#e5e7eb', bg: '#f3f6fa' }

/**
 * One layout for every auth mail. Table-based and inline-styled on purpose:
 * Gmail strips <style>, Outlook ignores flex/grid, and dark-mode clients
 * recolour anything without an explicit background. The wordmark is the
 * hosted PNG (email clients do not render inline SVG); the button is a
 * solid brand blue with a gradient on clients that honour background-image.
 */
function shell(lang: AuthEmailLanguage, title: string, preheader: string, inner: string): string {
  const footer = lang === 'ko'
    ? '이 메일은 Classraum 계정 보안을 위해 자동으로 발송되었습니다. 회신은 확인되지 않아요.'
    : 'This is an automated message about your Classraum account. Replies to this address are not monitored.'
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
        <tr><td align="left" style="padding:0 8px 20px;">
          <img src="${ASSET_ORIGIN}/text_logo.png" width="168" height="36" alt="Classraum" style="display:block;width:168px;height:auto;border:0;">
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid ${BRAND.line};padding:36px 36px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
          ${inner}
        </td></tr>
        <tr><td style="padding:20px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
          <p style="margin:0 0 6px;">${footer}</p>
          <p style="margin:0;">&copy; ${new Date().getFullYear()} Classraum &middot; <a href="${ASSET_ORIGIN}" style="color:${BRAND.muted};text-decoration:underline;">classraum.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function buildAuthEmail(input: {
  type: string
  lang: AuthEmailLanguage
  link: string | null
  token?: string | null
  toEmail: string
}): AuthEmail | null {
  const t = input.type === 'email_change_new' ? 'email_change' : input.type   // 'verify' is a magiclink sent by the verify-email banner
  const c = COPY[input.lang][t]
  if (!c) return null
  const safeEmail = escapeHtml(input.toEmail)
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Helvetica,Arial,sans-serif;"
  let action = ''
  let textAction = ''
  if (t === 'reauthentication') {
    const code = escapeHtml(input.token ?? '')
    action = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px auto;"><tr><td style="background:${BRAND.bg};border:1px solid ${BRAND.line};border-radius:12px;padding:14px 26px;${font}font-size:30px;letter-spacing:8px;font-weight:700;color:${BRAND.navy};">${code}</td></tr></table>`
    textAction = `${input.lang === 'ko' ? '인증 코드' : 'Code'}: ${input.token ?? ''}`
  } else {
    if (!input.link) return null
    const href = escapeHtml(input.link)
    action = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 22px;"><tr><td align="center" bgcolor="${BRAND.blue}" style="border-radius:10px;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.teal});">
        <a href="${href}" style="display:inline-block;padding:14px 30px;${font}font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;border-radius:10px;">${c.cta}</a>
      </td></tr></table>
      <p style="margin:0 0 4px;${font}font-size:12px;line-height:1.6;color:${BRAND.muted};">${input.lang === 'ko' ? '버튼이 열리지 않으면 아래 주소를 복사해 브라우저에 붙여넣어 주세요.' : "If the button doesn't work, copy this address into your browser."}</p>
      <p style="margin:0 0 20px;${font}font-size:12px;line-height:1.6;word-break:break-all;"><a href="${href}" style="color:${BRAND.blue};text-decoration:underline;">${href}</a></p>`
    textAction = input.link
  }
  const inner = `<h1 style="margin:0 0 14px;${font}font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.navy};">${c.title}</h1>
    <p style="margin:0 0 18px;${font}font-size:15px;line-height:1.7;color:${BRAND.ink};">${c.body}</p>
    <p style="margin:0;${font}font-size:13px;line-height:1.6;color:${BRAND.muted};">${input.lang === 'ko' ? '계정' : 'Account'}: <span style="color:${BRAND.ink};">${safeEmail}</span></p>
    ${action}
    <hr style="border:0;border-top:1px solid ${BRAND.line};margin:0 0 16px;">
    <p style="margin:0 0 6px;${font}font-size:12px;line-height:1.6;color:${BRAND.muted};">${c.expiry}</p>
    <p style="margin:0;${font}font-size:12px;line-height:1.6;color:${BRAND.muted};">${c.ignore}</p>`
  const text = [c.title, '', c.body, '', textAction, '', c.expiry, c.ignore].join('\n')
  return { subject: c.subject, html: shell(input.lang, c.title, c.body, inner), text }
}
