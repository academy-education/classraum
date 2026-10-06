/** @jest-environment node */
/**
 * notifyCreditRefund — one notice per refund event, exactly once, never
 * throws. The DB is the filter-honouring in-memory fake
 * (src/tests/fake-supabase.ts): its conditional UPDATE is atomic like
 * Postgres's, so two concurrent claims have exactly one winner, and a
 * dropped `.is('refund_notified_at', null)` is visible.
 *
 * Break-checked mutations are named in each test's comment.
 */
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import { notifyCreditRefund } from '../credit-refund-notify'
import { sendResendEmail } from '@/lib/resend'
import { raiseAlert } from '@/lib/ops/alert'
import { notifyStudent } from '@/lib/study/notify'

let mockDb: FakeDb
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => mockDb.from(t) } }))
jest.mock('@/lib/resend', () => ({ sendResendEmail: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
// Real studentNotifLang (it reads the fake DB); only the inbox write is mocked.
jest.mock('@/lib/study/notify', () => ({
  ...jest.requireActual('@/lib/study/notify'),
  notifyStudent: jest.fn(async () => {}),
}))

const sendMock = sendResendEmail as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock
const notifyMock = notifyStudent as unknown as jest.Mock

const STU = 'stu-1'
const S = ['sess-math', 'sess-writing', 'sess-reading']
const ledger = (id: string, source: string, over: Record<string, unknown> = {}) => ({
  id, student_id: STU, kind: 'refund', delta: 1, bucket: 'grant', source_id: source, note: 'admin refund by a: x',
  refund_notified_at: null, created_at: '2026-10-06T13:14:41Z', ...over,
})
const rows = () => mockDb.tables.study_credit_ledger
const L2 = ['L1', 'L2']

function seed(extra: Record<string, unknown[]> = {}) {
  mockDb = fakeDb({
    study_credit_ledger: [ledger('L1', S[0]), ledger('L2', 'hash-of-slice-1')],
    users: [{ id: STU, email: 'student@example.com', name: 'Ayoung' }],
    study_user_prefs: [],
    user_preferences: [],
    study_sessions: [
      { id: S[0], topic_id: 't-math', config: { family: 'ssat' } },
      { id: S[1], topic_id: 't-writing', config: { family: 'ssat' } },
      { id: S[2], topic_id: 't-reading', config: { family: 'ssat' } },
    ],
    study_topics: [
      { id: 'p-ssat', parent_id: null, name_en: 'SSAT', name_ko: 'SSAT' },
      { id: 't-math', parent_id: 'p-ssat', name_en: 'Math', name_ko: '수학' },
      { id: 't-writing', parent_id: 'p-ssat', name_en: 'Writing', name_ko: '쓰기' },
      { id: 't-reading', parent_id: 'p-ssat', name_en: 'Reading Comprehension', name_ko: '독해' },
    ],
    ...extra,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  seed()
  sendMock.mockResolvedValue({ sent: true, id: 'r1' })
})
afterEach(() => { (console.error as jest.Mock).mockRestore() })

describe('exactly once', () => {
  it('two concurrent calls for the same refund rows send one email and one in-app notice', async () => {
    // mutation: drop .is('refund_notified_at', null) from the claim → both send
    const out = await Promise.all([notifyCreditRefund(STU, L2), notifyCreditRefund(STU, L2)])
    expect(out.map(o => o.status).sort()).toEqual(['sent', 'skipped'])
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(rows().every(r => r.refund_notified_at)).toBe(true)
  })

  it('a re-run (the idempotent refund called again) notifies nothing', async () => {
    await notifyCreditRefund(STU, L2)
    expect(await notifyCreditRefund(STU, L2)).toMatchObject({ status: 'skipped' })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a failed send releases the claim, posts no in-app notice, and the retry sends', async () => {
    // mutation: delete the release() in the !sent.sent branch
    sendMock.mockResolvedValueOnce({ sent: false, error: 'Resend 500' })
    expect(await notifyCreditRefund(STU, L2)).toEqual({ status: 'failed', reason: 'Resend 500' })
    expect(rows().every(r => r.refund_notified_at === null)).toBe(true)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(alertMock).toHaveBeenCalledTimes(1)
    expect(await notifyCreditRefund(STU, L2)).toMatchObject({ status: 'sent' })
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })

  it('claims only this student\'s REFUND rows', async () => {
    // mutation: drop .eq('kind', 'refund') or .eq('student_id', …) from the claim
    seed({ study_credit_ledger: [
      ledger('L1', S[0]),
      ledger('D1', S[0], { kind: 'debit', delta: -1 }),
      ledger('X1', S[0], { student_id: 'someone-else' }),
    ] })
    const out = await notifyCreditRefund(STU, ['L1', 'D1', 'X1'])
    expect(out).toMatchObject({ status: 'sent', count: 1 })
    expect(rows().find(r => r.id === 'D1')!.refund_notified_at).toBeNull()
    expect(rows().find(r => r.id === 'X1')!.refund_notified_at).toBeNull()
  })

  it('a dry run claims nothing and sends nothing', async () => {
    const out = await notifyCreditRefund(STU, L2, null, { dryRun: true })
    expect(out.status).toBe('dry_run')
    expect(sendMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
    expect(rows().every(r => r.refund_notified_at === null)).toBe(true)
  })

  it('never throws: a DB that explodes is a failed outcome', async () => {
    mockDb = { from: () => { throw new Error('db down') } } as unknown as FakeDb
    await expect(notifyCreditRefund(STU, L2)).resolves.toEqual({ status: 'failed', reason: 'db down' })
  })
})

describe('suppression', () => {
  it('a suppressed address is done: claim kept, no in-app notice, no alert, no retry', async () => {
    // mutation: delete the `if (sent.suppressed)` line → falls into the failed
    // path (released, alerted, re-sent forever)
    sendMock.mockResolvedValue({ sent: false, suppressed: true, error: 'recipient is on the suppression list' })
    expect(await notifyCreditRefund(STU, L2)).toEqual({ status: 'skipped', reason: 'address suppressed' })
    expect(rows().every(r => r.refund_notified_at)).toBe(true)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(alertMock).not.toHaveBeenCalled()
    expect(await notifyCreditRefund(STU, L2)).toMatchObject({ status: 'skipped' })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })
})

describe('grouping', () => {
  it('twelve rows across six sessions are ONE notice with the total and each section named once', async () => {
    // mutation: count rows instead of summing delta / list every session label
    // Four DIFFERENT writing sessions (Ayoung WON's case): the section must
    // still be named once. mutation: drop the dedupe in testLabel.
    const sessions = [S[0], 'w1', 'w2', 'w3', 'w4', S[2]]
    seed()
    mockDb.tables.study_sessions.push(...['w1', 'w2', 'w3', 'w4'].map(id => ({ id, topic_id: 't-writing', config: { family: 'ssat' } })))
    mockDb.tables.study_credit_ledger = sessions.flatMap((s, i) => [ledger(`A${i}`, s), ledger(`B${i}`, `h${i}`)])
    const ids = rows().map(r => r.id as string)
    const out = await notifyCreditRefund(STU, ids, { en: 'A bug stopped your Writing answer from being submitted' }, { sessionIds: sessions })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(out).toMatchObject({ status: 'sent', count: 12 })
    const mail = sendMock.mock.calls[0][0]
    expect(mail.subject).toBe('[Classraum] 12 credits returned to your account')
    expect(mail.text).toContain('used on SSAT Math, Writing and Reading Comprehension. A bug stopped your Writing answer from being submitted. We\'re sorry')
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      kind: 'study_credits_refunded', variant: 'withReason', titleParams: { count: 12 },
      messageParams: { test: 'SSAT Math, Writing and Reading Comprehension' },
    })
  })

  it('one credit reads "1 credit", not "1 credits"', async () => {
    const out = await notifyCreditRefund(STU, ['L1'])
    expect(out).toMatchObject({ status: 'sent', count: 1 })
    expect(sendMock.mock.calls[0][0].subject).toBe('[Classraum] 1 credit returned to your account')
  })
})

describe('language', () => {
  it('study language wins over the account language: ko study pref → Korean mail and notice', async () => {
    // mutation: hardcode lang 'english' / read only user_preferences
    seed({ study_user_prefs: [{ student_id: STU, default_language: 'ko' }], user_preferences: [{ user_id: STU, language: 'english' }] })
    await notifyCreditRefund(STU, L2, { ko: '일시정지 기능 오류가 있었어요', en: 'There was a pause bug' }, { sessionIds: [S[0]] })
    const mail = sendMock.mock.calls[0][0]
    expect(mail.subject).toBe('[Classraum] 크레딧 2개를 돌려드렸어요')
    expect(mail.text).toContain('안녕하세요, Ayoung님.')
    expect(mail.text).toContain('SSAT 수학 시험에 사용하신 크레딧을 계정으로 돌려드렸어요. 일시정지 기능 오류가 있었어요. 불편을 드려 죄송합니다.')
    expect(mail.text).not.toContain('pause bug')
    expect(mail.html).toContain('<html lang="ko">')
    expect(notifyMock.mock.calls[0][0].lang).toBe('korean')
  })

  it('account language korean with no study pref → Korean', async () => {
    seed({ user_preferences: [{ user_id: STU, language: 'korean' }] })
    await notifyCreditRefund(STU, L2)
    expect(sendMock.mock.calls[0][0].subject).toContain('크레딧 2개')
  })

  it('a reason given only in the other language falls back to the generic copy, never crosses over', async () => {
    // mutation: pickReason falls back to the other language
    await notifyCreditRefund(STU, L2, { ko: '오류가 있었어요' })
    const mail = sendMock.mock.calls[0][0]
    expect(mail.text).not.toContain('오류')
    expect(mail.text).toContain("We've returned the credits you used on SSAT Math. We're sorry for the trouble.")
    expect(notifyMock.mock.calls[0][0].variant).toBe('default')
  })
})
