/** @jest-environment node */
jest.mock('../email-suppression', () => {
  const actual = jest.requireActual('../email-suppression') as typeof import('../email-suppression')
  return { ...actual, suppressedAmong: jest.fn(async (list: string[]) => new Set(list.map(actual.normalizeEmail).filter(e => e === 'alexandria@gmail.com'))) }
})
import { sendResendEmail } from '../resend'
import { sendPostmarkEmail } from '../postmark'

describe('email suppression list', () => {
  const realFetch = global.fetch
  const bodies: { url: string; body: Record<string, unknown> }[] = []
  beforeEach(() => {
    bodies.length = 0
    global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) })
      return new Response(JSON.stringify({ id: 'r1' }), { status: 200 })
    }) as unknown as typeof fetch
  })
  afterEach(() => { global.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.POSTMARK_SERVER_TOKEN })

  it('sends nothing when the only recipient is suppressed, whatever its case', async () => {
    process.env.RESEND_API_KEY = 're_test'
    const r = await sendResendEmail({ to: ' Alexandria@Gmail.com ', subject: 's', html: 'x' })
    expect(r).toMatchObject({ sent: false, suppressed: true })
    expect(bodies).toHaveLength(0)
  })
  it('drops the suppressed address and still sends to the others', async () => {
    process.env.RESEND_API_KEY = 're_test'
    const r = await sendResendEmail({ to: ['alexandria@gmail.com', 'ok@classraum.com'], subject: 's', html: 'x' })
    expect(r.sent).toBe(true)
    expect(bodies[0].body.to).toEqual(['ok@classraum.com'])
  })
  it('covers the Postmark wrapper on both providers', async () => {
    process.env.RESEND_API_KEY = 're_test'
    expect(await sendPostmarkEmail({ to: 'alexandria@gmail.com', subject: 's', htmlBody: 'x' })).toMatchObject({ sent: false, suppressed: true })
    delete process.env.RESEND_API_KEY; process.env.POSTMARK_SERVER_TOKEN = 'pm'
    expect(await sendPostmarkEmail({ to: 'alexandria@gmail.com', subject: 's', htmlBody: 'x' })).toMatchObject({ sent: false, suppressed: true })
    expect(bodies).toHaveLength(0)
  })
})
