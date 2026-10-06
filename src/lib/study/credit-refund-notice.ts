/**
 * Copy for "we gave your credits back" — pure: no network, no database.
 * `credit-refund-notify.ts` gathers the facts; this renders them, and the
 * tests pin every field.
 *
 * ONE WORDING. The in-app notice and the email body are both rendered from
 * the `notifications.content.study.creditsRefunded.*` locale keys, so the
 * two can never say different things.
 */
import { escapeHtml } from '@/lib/html-escape'
import { BRAND, shell } from '@/lib/auth/email-hook'
import {
  STUDY_NOTIFICATION_COPY,
  translateStudyKey,
  type StudyNotifLang,
  type StudyNotifParams,
} from '@/lib/study/notification-copy'

export type RefundNoticeLang = 'ko' | 'en'
export type RefundNoticeVariant = keyof typeof STUDY_NOTIFICATION_COPY['study_credits_refunded']

/** Student-facing reason, per language. A missing language falls back to
 *  the generic wording — never to the other language's sentence. */
export type RefundNoticeReason = { ko?: string | null; en?: string | null } | null | undefined

export const toNoticeLang = (l: StudyNotifLang): RefundNoticeLang => (l === 'korean' ? 'ko' : 'en')
const toNotifLang = (l: RefundNoticeLang): StudyNotifLang => (l === 'ko' ? 'korean' : 'english')

/** Trim, collapse whitespace, cap, and end the sentence so "{reason} We're
 *  sorry" never runs two sentences together. '' → null (generic copy). */
export function normalizeReason(raw: string | null | undefined): string | null {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 200).trim()
  if (!s) return null
  return /[.!?。)]$/.test(s) ? s : `${s}.`
}

export function pickReason(reason: RefundNoticeReason, lang: RefundNoticeLang): string | null {
  return normalizeReason(reason?.[lang])
}

export function noticeVariant(count: number, reason: string | null): RefundNoticeVariant {
  if (count === 1) return reason ? 'oneWithReason' : 'one'
  return reason ? 'withReason' : 'default'
}

export interface TestName { family: string; section: { en: string; ko: string } | null }

/** "SAT Reading & Writing" / "SAT 읽기와 쓰기". Sections of one test are
 *  named under it once ("SSAT Math, Writing and Reading Comprehension");
 *  nothing known → a generic "your test" / "이전" (KO copy adds "시험"). */
export function testLabel(tests: TestName[], lang: RefundNoticeLang): string {
  const byFamily = new Map<string, string[]>()
  for (const t of tests) {
    const fam = (t.family ?? '').trim()
    const sec = (t.section?.[lang] ?? '').trim()
    if (!fam && !sec) continue
    const list = byFamily.get(fam) ?? []
    if (sec && !list.includes(sec)) list.push(sec)
    byFamily.set(fam, list)
  }
  if (byFamily.size === 0) return lang === 'ko' ? '이전' : 'your test'
  const join = (xs: string[]) => lang === 'ko' || xs.length < 2
    ? xs.join(', ')
    : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
  return join([...byFamily].map(([fam, secs]) => [fam, join(secs)].filter(Boolean).join(' ')))
}

export interface RefundNoticeInput {
  lang: RefundNoticeLang
  count: number
  test: string
  reason: string | null
  name?: string | null
  appOrigin: string
}

export interface RenderedRefundNotice {
  variant: RefundNoticeVariant
  titleParams: StudyNotifParams
  messageParams: StudyNotifParams
  title: string
  message: string
  email: { subject: string; html: string; text: string }
}

const T = {
  ko: {
    subject: (title: string) => `[Classraum] ${title}`,
    hello: (n: string | null) => (n ? `안녕하세요, ${n}님.` : '안녕하세요.'),
    ready: '돌려드린 크레딧은 지금 바로 사용하실 수 있어요.',
    open: 'Classraum Study 열기',
    help: (mail: string) => `궁금하신 점이 있으시면 언제든 문의해 주세요: ${mail}`,
    footer: '이 메일은 Classraum 계정의 크레딧 변동을 안내하기 위해 자동으로 발송되었습니다. 회신은 확인되지 않아요.',
  },
  en: {
    subject: (title: string) => `[Classraum] ${title}`,
    hello: (n: string | null) => (n ? `Hi ${n},` : 'Hello,'),
    ready: 'The credits are ready to use now.',
    open: 'Open Classraum Study',
    help: (mail: string) => `If you have any questions, contact us at ${mail}.`,
    footer: 'This is an automated message about a change to the credits on your Classraum account. Replies to this address are not monitored.',
  },
} as const

const SUPPORT = 'support@classraum.com'
const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Helvetica,Arial,sans-serif;"

export function buildRefundNotice(r: RefundNoticeInput): RenderedRefundNotice {
  const variant = noticeVariant(r.count, r.reason)
  const copy = STUDY_NOTIFICATION_COPY.study_credits_refunded[variant]
  const titleParams: StudyNotifParams = { count: r.count }
  const messageParams: StudyNotifParams = { test: r.test, ...(r.reason ? { reason: r.reason } : {}) }
  const nl = toNotifLang(r.lang)
  const title = translateStudyKey(nl, copy.titleKey, titleParams)
  const message = translateStudyKey(nl, copy.messageKey, messageParams)

  const t = T[r.lang]
  const name = (r.name ?? '').trim() || null
  const home = `${r.appOrigin}/mobile/study`
  const p = (s: string, extra = '') => `<p style="${FONT}margin:0 0 14px;font-size:15px;line-height:1.7;color:${BRAND.ink};${extra}">${s}</p>`
  const inner = `<h1 style="margin:0 0 18px;${FONT}font-size:22px;line-height:1.35;font-weight:700;color:${BRAND.navy};">${escapeHtml(title)}</h1>
    ${p(escapeHtml(t.hello(name)))}
    ${p(escapeHtml(message))}
    ${p(escapeHtml(t.ready))}
    ${p(`<a href="${escapeHtml(home)}" style="color:${BRAND.blue};text-decoration:underline;">${escapeHtml(t.open)}</a>`)}
    <hr style="border:0;border-top:1px solid ${BRAND.line};margin:22px 0 14px;">
    <p style="${FONT}margin:0;font-size:12.5px;line-height:1.7;color:${BRAND.muted};">${escapeHtml(t.help(SUPPORT))}</p>`
  const text = [t.hello(name), '', message, t.ready, '', `${t.open}: ${home}`, '', t.help(SUPPORT)].join('\n')

  return {
    variant, titleParams, messageParams, title, message,
    email: { subject: t.subject(title), html: shell(r.lang, title, message, inner, t.footer), text },
  }
}
