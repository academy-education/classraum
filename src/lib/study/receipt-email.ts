/**
 * Receipt and renewal-reminder emails for Classraum Study charges. Pure: no
 * network, no database — `charge-receipt.ts` gathers the facts, this renders
 * them, and the tests pin every field.
 *
 * WHY (2026-09-30): a successful subscription renewal used to send the student
 * nothing. They were charged every month with no confirmation and no way to
 * find the card slip, although Inicis issues one per charge and PortOne hands
 * us its URL. Every charge now produces one of these.
 *
 * Amounts are integers in KRW. Dates are rendered in Asia/Seoul, which is the
 * timezone the card slip and the student's bank statement use.
 */
import { escapeHtml } from '@/lib/html-escape'
import { BRAND, shell } from '@/lib/auth/email-hook'

export type ReceiptLang = 'ko' | 'en'

/** Billing mail footer. The shared shell's default says "sent for account
 *  security", which is the auth-mail line and wrong on a receipt. */
const BILLING_FOOTER: Record<ReceiptLang, string> = {
  ko: '이 메일은 Classraum 결제 안내를 위해 자동으로 발송되었습니다. 회신은 확인되지 않아요.',
  en: 'This is an automated message about a payment on your Classraum account. Replies to this address are not monitored.',
}
export type ChargeKind = 'study_subscription' | 'study_credit_pack' | 'study_exam_pass'

export interface Seller {
  name: string
  representative?: string
  businessNumber?: string
  mailOrderNumber?: string
  address?: string
  contact: string
}

/** Seller block. The Inicis card slip carries the merchant's registered details
 *  regardless; these fill the email footer when RECEIPT_SELLER_* are set. */
export function sellerFromEnv(env: Record<string, string | undefined> = process.env): Seller {
  return {
    name: env.RECEIPT_SELLER_NAME || 'Classraum',
    representative: env.RECEIPT_SELLER_REPRESENTATIVE || undefined,
    businessNumber: env.RECEIPT_SELLER_BUSINESS_NUMBER || undefined,
    mailOrderNumber: env.RECEIPT_SELLER_MAIL_ORDER_NUMBER || undefined,
    address: env.RECEIPT_SELLER_ADDRESS || undefined,
    contact: env.RECEIPT_SELLER_CONTACT || 'support@classraum.com',
  }
}

export function formatWon(amount: number, lang: ReceiptLang): string {
  const n = Math.round(amount).toLocaleString('en-US')
  return lang === 'ko' ? `${n}원` : `₩${n}`
}

export function formatDate(iso: string, lang: ReceiptLang): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: lang === 'ko' ? 'long' : 'short', day: 'numeric',
  }).format(new Date(iso))
}

/** "신한카드 •••• 1234" from whatever the PG returns; the number is already masked by the PG. */
export function cardLabel(card: { name?: string; issuer?: string; number?: string } | null | undefined, lang: ReceiptLang): string {
  const base = card?.name || (lang === 'ko' ? '신용카드' : 'Card')
  const tail = (card?.number ?? '').replace(/[^0-9*]/g, '').slice(-4)
  return /\d{2,}/.test(tail) ? `${base} •••• ${tail.replace(/\*/g, '•')}` : base
}

const T = {
  ko: {
    subject: (a: string) => `[Classraum] 결제 영수증 · ${a}`,
    title: '결제가 완료되었어요', preheader: (item: string, a: string) => `${item} ${a} 결제 영수증`,
    backfill: (d: string) => `이제 Classraum은 모든 결제마다 영수증을 보내드려요. 아래는 ${d} 결제에 대한 영수증이에요.`,
    item: '상품', amount: '결제 금액', paidOn: '결제일', method: '결제 수단', id: '결제 번호',
    renews: (d: string, a: string) => `${d}에 ${a}이 자동으로 결제돼요. 그 전에 언제든 해지할 수 있어요.`,
    receipt: '카드 영수증 보기', history: '결제 내역', manage: '구독 관리 · 해지',
    refund: '환불 정책', seller: '판매자', rep: '대표', bn: '사업자등록번호', mo: '통신판매업 신고번호', contact: '문의',
    noReply: '이 메일은 결제 확인을 위해 자동으로 발송되었습니다.',
  },
  en: {
    subject: (a: string) => `Your Classraum receipt · ${a}`,
    title: 'Payment received', preheader: (item: string, a: string) => `Receipt for ${item}, ${a}`,
    backfill: (d: string) => `Classraum now sends a receipt for every payment. This one is for your payment on ${d}.`,
    item: 'Item', amount: 'Amount', paidOn: 'Paid on', method: 'Payment method', id: 'Payment ID',
    renews: (d: string, a: string) => `Your plan renews automatically on ${d} for ${a}. You can cancel any time before then.`,
    receipt: 'View card receipt', history: 'Billing history', manage: 'Manage or cancel',
    refund: 'Refund policy', seller: 'Seller', rep: 'Representative', bn: 'Business registration no.', mo: 'Mail-order registration no.', contact: 'Contact',
    noReply: 'This email was sent automatically to confirm your payment.',
  },
} as const

export interface ReceiptInput {
  lang: ReceiptLang
  orderName: string
  amountWon: number
  paidAt: string
  card: string
  paymentId: string
  receiptUrl: string | null
  appOrigin: string
  /** Only for the subscription's latest charge while it still auto-renews. */
  renewal?: { on: string; amountWon: number } | null
  backfill?: boolean
  seller?: Seller
}

export interface RenderedEmail { subject: string; html: string; text: string }

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Helvetica,Arial,sans-serif;"

function row(label: string, value: string): string {
  return `<tr><td style="${FONT}padding:9px 0;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.line};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>`
    + `<td style="${FONT}padding:9px 0 9px 16px;font-size:14px;color:${BRAND.ink};border-bottom:1px solid ${BRAND.line};text-align:right;">${value}</td></tr>`
}

function sellerHtml(s: Seller, t: (typeof T)[ReceiptLang]): string {
  const parts = [
    `${escapeHtml(t.seller)}: ${escapeHtml(s.name)}`,
    s.representative && `${escapeHtml(t.rep)}: ${escapeHtml(s.representative)}`,
    s.businessNumber && `${escapeHtml(t.bn)}: ${escapeHtml(s.businessNumber)}`,
    s.mailOrderNumber && `${escapeHtml(t.mo)}: ${escapeHtml(s.mailOrderNumber)}`,
    s.address && escapeHtml(s.address),
    `${escapeHtml(t.contact)}: <a href="mailto:${escapeHtml(s.contact)}" style="color:${BRAND.muted};">${escapeHtml(s.contact)}</a>`,
  ].filter(Boolean)
  return `<p style="${FONT}margin:16px 0 0;font-size:11.5px;line-height:1.7;color:${BRAND.muted};">${parts.join(' · ')}</p>`
}

export function buildReceiptEmail(r: ReceiptInput): RenderedEmail {
  const t = T[r.lang]
  const amount = formatWon(r.amountWon, r.lang)
  const paidOn = formatDate(r.paidAt, r.lang)
  const seller = r.seller ?? sellerFromEnv()
  const history = `${r.appOrigin}/mobile/study/billing`
  const manage = `${r.appOrigin}/mobile/study/subscription`
  const renewal = r.renewal ? t.renews(formatDate(r.renewal.on, r.lang), formatWon(r.renewal.amountWon, r.lang)) : null

  const button = r.receiptUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;"><tr><td bgcolor="${BRAND.blue}" style="border-radius:10px;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.teal});">
        <a href="${escapeHtml(r.receiptUrl)}" style="display:inline-block;padding:13px 26px;${FONT}font-size:15px;font-weight:600;color:#ffffff !important;text-decoration:none;border-radius:10px;">${escapeHtml(t.receipt)}</a></td></tr></table>`
    : ''

  const inner = `${r.backfill ? `<p style="${FONT}margin:0 0 16px;padding:12px 14px;border-radius:10px;background:${BRAND.bg};font-size:13px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(t.backfill(paidOn))}</p>` : ''}
    <h1 style="margin:0 0 6px;${FONT}font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.navy};">${escapeHtml(t.title)}</h1>
    <p style="margin:0 0 18px;${FONT}font-size:30px;font-weight:700;letter-spacing:-.01em;color:${BRAND.ink};">${escapeHtml(amount)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid ${BRAND.line};">
      ${row(t.item, escapeHtml(r.orderName))}
      ${row(t.amount, escapeHtml(amount))}
      ${row(t.paidOn, escapeHtml(paidOn))}
      ${row(t.method, escapeHtml(r.card))}
      ${row(t.id, `<span style="font-size:12px;color:${BRAND.muted};word-break:break-all;">${escapeHtml(r.paymentId)}</span>`)}
    </table>
    ${renewal ? `<p style="${FONT}margin:18px 0 0;font-size:14px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(renewal)}</p>` : ''}
    ${button}
    <p style="${FONT}margin:14px 0 0;font-size:13px;line-height:1.8;">
      <a href="${escapeHtml(history)}" style="color:${BRAND.blue};text-decoration:underline;">${escapeHtml(t.history)}</a>
      ${r.renewal ? ` &nbsp;·&nbsp; <a href="${escapeHtml(manage)}" style="color:${BRAND.blue};text-decoration:underline;">${escapeHtml(t.manage)}</a>` : ''}
      &nbsp;·&nbsp; <a href="https://www.classraum.com/refund-policy" style="color:${BRAND.blue};text-decoration:underline;">${escapeHtml(t.refund)}</a>
    </p>
    <hr style="border:0;border-top:1px solid ${BRAND.line};margin:22px 0 0;">
    ${sellerHtml(seller, t)}
    <p style="${FONT}margin:8px 0 0;font-size:11.5px;color:${BRAND.muted};">${escapeHtml(t.noReply)}</p>`

  const text = [
    r.backfill ? t.backfill(paidOn) + '\n' : null,
    t.title, amount, '',
    `${t.item}: ${r.orderName}`, `${t.amount}: ${amount}`, `${t.paidOn}: ${paidOn}`, `${t.method}: ${r.card}`, `${t.id}: ${r.paymentId}`,
    renewal ? '\n' + renewal : null,
    r.receiptUrl ? `\n${t.receipt}: ${r.receiptUrl}` : null,
    `${t.history}: ${history}`,
    r.renewal ? `${t.manage}: ${manage}` : null,
    '', `${t.seller}: ${seller.name} · ${t.contact}: ${seller.contact}`,
  ].filter(x => x !== null).join('\n')

  return { subject: t.subject(amount), html: shell(r.lang, t.title, t.preheader(r.orderName, amount), inner, BILLING_FOOTER[r.lang]), text }
}
