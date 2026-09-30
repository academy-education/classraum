/** @jest-environment node */
import { buildReceiptEmail, buildRenewalReminderEmail, cardLabel, formatDate, formatWon, sellerFromEnv } from '../receipt-email'

const base = {
  orderName: 'Classraum Study — Premium Plus (Monthly)', amountWon: 26900, paidAt: '2026-09-29T15:30:00Z',
  card: '신한카드 •••• 1234', paymentId: 'sub-a8ec97bf-mfx', receiptUrl: 'https://iniweb.inicis.com/receipt?x=1&y=2',
  appOrigin: 'https://app.classraum.com',
}

describe('formatting', () => {
  it('formats won per language and dates in Seoul time', () => {
    expect(formatWon(26900, 'ko')).toBe('26,900원')
    expect(formatWon(26900, 'en')).toBe('₩26,900')
    // 15:30Z on the 29th is 00:30 on the 30th in Seoul — the slip's date
    expect(formatDate('2026-09-29T15:30:00Z', 'en')).toBe('Sep 30, 2026')
    expect(formatDate('2026-09-29T15:30:00Z', 'ko')).toBe('2026년 9월 30일')
  })
  it('labels a masked card and falls back when the PG gives nothing usable', () => {
    expect(cardLabel({ name: '신한카드', number: '451842******1234' }, 'ko')).toBe('신한카드 •••• 1234')
    expect(cardLabel({ number: '4518****' }, 'en')).toBe('Card')
    expect(cardLabel(null, 'ko')).toBe('신용카드')
  })
})

describe('receipt', () => {
  it('carries every field, the slip link (escaped), history and refund links', () => {
    const m = buildReceiptEmail({ ...base, lang: 'en' })
    expect(m.subject).toBe('Your Classraum receipt · ₩26,900')
    for (const s of ['Payment received', '₩26,900', 'Premium Plus', 'Sep 30, 2026', '•••• 1234', 'sub-a8ec97bf-mfx',
      'href="https://iniweb.inicis.com/receipt?x=1&amp;y=2"', '/mobile/study/billing', '/refund-policy', 'support@classraum.com']) {
      expect(m.html).toContain(s)
    }
    expect(m.text).toContain('View card receipt: https://iniweb.inicis.com/receipt?x=1&y=2')
  })
  it('shows the renewal line and cancel link only when renewal is given', () => {
    const plain = buildReceiptEmail({ ...base, lang: 'ko' })
    expect(plain.html).not.toContain('자동으로 결제돼요'); expect(plain.html).not.toContain('구독 관리')
    const renewing = buildReceiptEmail({ ...base, lang: 'ko', renewal: { on: '2026-10-29T15:30:00Z', amountWon: 26900 } })
    expect(renewing.html).toContain('2026년 10월 30일에 26,900원이(가) 자동으로 결제돼요')
    expect(renewing.html).toContain('/mobile/study/subscription')
  })
  it('explains itself on a backfilled receipt, and not otherwise', () => {
    expect(buildReceiptEmail({ ...base, lang: 'en', backfill: true }).html).toContain('Classraum now sends a receipt for every payment. This one is for your payment on Sep 30, 2026.')
    expect(buildReceiptEmail({ ...base, lang: 'en' }).html).not.toContain('now sends a receipt')
  })
  it('omits the button without a slip URL but still renders', () => {
    const m = buildReceiptEmail({ ...base, lang: 'en', receiptUrl: null })
    expect(m.html).not.toContain('View card receipt'); expect(m.html).toContain('₩26,900')
  })
  it('escapes an order name containing markup', () => {
    expect(buildReceiptEmail({ ...base, lang: 'en', orderName: '<img src=x>' }).html).toContain('&lt;img src=x&gt;')
  })
  it('prints seller registration details only when configured', () => {
    expect(buildReceiptEmail({ ...base, lang: 'ko' }).html).not.toContain('사업자등록번호')
    const s = sellerFromEnv({ RECEIPT_SELLER_NAME: '주식회사 예시', RECEIPT_SELLER_BUSINESS_NUMBER: '123-45-67890' })
    const m = buildReceiptEmail({ ...base, lang: 'ko', seller: s })
    expect(m.html).toContain('사업자등록번호: 123-45-67890'); expect(m.html).toContain('주식회사 예시')
  })
})

describe('renewal reminder', () => {
  it('names plan, date, amount and the manage link in both languages', () => {
    const en = buildRenewalReminderEmail({ lang: 'en', planName: 'Premium Plus', amountWon: 26900, renewsOn: '2026-10-29T15:30:00Z', appOrigin: 'https://app.classraum.com' })
    expect(en.subject).toBe('Your Classraum plan renews on Oct 30, 2026')
    expect(en.html).toContain('renew automatically on Oct 30, 2026 for ₩26,900')
    expect(en.html).toContain('/mobile/study/subscription')
    const ko = buildRenewalReminderEmail({ lang: 'ko', planName: '프리미엄 플러스', amountWon: 26900, renewsOn: '2026-10-29T15:30:00Z', appOrigin: 'https://app.classraum.com' })
    expect(ko.html).toContain('2026년 10월 30일에 26,900원으로 자동 결제될 예정')
  })
})
