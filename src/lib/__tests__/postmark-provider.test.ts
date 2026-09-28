/** @jest-environment node */
import { sendPostmarkEmail } from '../postmark'

describe('sendPostmarkEmail provider switch', () => {
  const realFetch = global.fetch
  const calls: string[] = []
  beforeEach(() => {
    calls.length = 0
    global.fetch = jest.fn(async (url: RequestInfo | URL) => { calls.push(String(url)); return new Response(JSON.stringify({ id: 'r1' }), { status: 200 }) }) as unknown as typeof fetch
  })
  afterEach(() => { global.fetch = realFetch; delete process.env.RESEND_API_KEY; delete process.env.POSTMARK_SERVER_TOKEN })

  it('goes to Resend when RESEND_API_KEY is set, even with a Postmark token present', async () => {
    process.env.RESEND_API_KEY = 're_test'; process.env.POSTMARK_SERVER_TOKEN = 'pm_test'
    const r = await sendPostmarkEmail({ to: 'a@classraum.com, b@example.com', subject: 's', htmlBody: '<p>x</p>' })
    expect(r.sent).toBe(true)
    expect(calls).toEqual(['https://api.resend.com/emails'])
  })
  it('falls back to Postmark without the Resend key', async () => {
    process.env.POSTMARK_SERVER_TOKEN = 'pm_test'
    await sendPostmarkEmail({ to: 'a@classraum.com', subject: 's', htmlBody: '<p>x</p>' })
    expect(calls).toEqual(['https://api.postmarkapp.com/email'])
  })
  it('still refuses an empty recipient list before touching either provider', async () => {
    process.env.RESEND_API_KEY = 're_test'
    const r = await sendPostmarkEmail({ to: '  ', subject: 's', htmlBody: 'x' })
    expect(r).toEqual({ sent: false, error: 'no recipients' })
    expect(calls).toEqual([])
  })
})
