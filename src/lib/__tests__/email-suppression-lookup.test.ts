/** @jest-environment node */
/**
 * The REAL suppressedAmong lookup. email-suppression.test.ts mocks it
 * wholesale (to test the senders), so until 2026-10-02 the lookup itself —
 * normalising before the query, and failing OPEN when the DB is down — had
 * no test: either could be inverted with every suite green.
 *
 * Fail-open is the documented choice (email-suppression.ts): failing closed
 * would silence ops alerts during exactly the outage they report.
 */
import { suppressedAmong } from '../email-suppression'
import { sendResendEmail } from '../resend'

const mockIn = jest.fn()
const mockFrom = jest.fn((_table: string) => ({ select: () => ({ in: mockIn }) }))
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => mockFrom(t) } }))

const realFetch = global.fetch
beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => { (console.error as jest.Mock).mockRestore(); global.fetch = realFetch; delete process.env.RESEND_API_KEY })

describe('suppressedAmong', () => {
  it('normalises (trim + lowercase) and de-duplicates before querying', async () => {
    mockIn.mockResolvedValue({ data: [{ email: 'alexandria@gmail.com' }], error: null })
    const out = await suppressedAmong([' Alexandria@Gmail.com ', 'alexandria@gmail.com', 'ok@x.com', ''])
    expect(mockFrom).toHaveBeenCalledWith('email_suppressions')
    expect(mockIn).toHaveBeenCalledWith('email', ['alexandria@gmail.com', 'ok@x.com'])
    expect([...out]).toEqual(['alexandria@gmail.com'])
  })

  it('skips the query entirely for an empty list', async () => {
    expect((await suppressedAmong(['', '  '])).size).toBe(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('fails OPEN on a query error, and says so', async () => {
    mockIn.mockResolvedValue({ data: null, error: { message: 'statement timeout' } })
    expect((await suppressedAmong(['a@x.com'])).size).toBe(0)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('lookup failed'), 'statement timeout')
  })

  it('fails OPEN when the client throws', async () => {
    mockIn.mockRejectedValue(new Error('fetch failed'))
    expect((await suppressedAmong(['a@x.com'])).size).toBe(0)
  })

  it('a failed lookup still lets sendResendEmail deliver (an ops alert must get out)', async () => {
    process.env.RESEND_API_KEY = 're_test'
    mockIn.mockRejectedValue(new Error('db down'))
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ id: 'r1' }), { status: 200 })) as unknown as typeof fetch
    expect(await sendResendEmail({ to: 'ops@classraum.com', subject: 's', html: 'x' })).toEqual({ sent: true, id: 'r1' })
  })
})
