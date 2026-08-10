/** @jest-environment node */
/**
 * The gate must actually be CALLED, not merely exist.
 *
 * push-categories.test.ts proves the predicate is correct. That is not
 * enough, and the history says why: the preference has existed as a
 * column and a UI toggle for months, and the bug was never that the
 * value was wrong — it was that sendPushToStudent never looked at it.
 * A perfect predicate nobody calls is exactly the state we just left.
 *
 * So this tests the SEND FUNCTION: given an opted-out student, does a
 * push actually not go out.
 *
 * BREAK-TEST: delete the pushCategoryAllowed check in push.ts and
 * "does not send to an opted-out student" fails.
 */
const mockMaybeSingle = jest.fn()
const mockTokenSelect = jest.fn()

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (table: string) => {
      if (table === 'user_preferences') {
        return { select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }
      }
      // device_tokens
      return { select: () => ({ eq: () => ({ eq: mockTokenSelect }) }) }
    },
  },
}))

import { sendPushToStudent } from '../push'

beforeEach(() => {
  jest.clearAllMocks()
  // FCM must look configured, or the function short-circuits before the
  // gate and every test below would pass for the wrong reason.
  process.env.FCM_SERVICE_ACCOUNT_JSON = '{}'
  process.env.FCM_PROJECT_ID = 'proj'
  mockTokenSelect.mockResolvedValue({ data: [] })
})

describe('sendPushToStudent consults the preference', () => {
  it('does not send to an opted-out student', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { push_notifications: true, push_categories: { social: false } },
      error: null,
    })

    const res = await sendPushToStudent('s1', { title: 't', body: 'b' }, { category: 'social' })

    expect(res).toMatchObject({ sent: 0, skipped: true, reason: 'opted_out' })
    // And it bailed BEFORE the token query — an opted-out student should
    // cost neither a lookup nor an FCM call.
    expect(mockTokenSelect).not.toHaveBeenCalled()
  })

  it('proceeds past the gate for a category the student kept on', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { push_notifications: true, push_categories: { social: false } },
      error: null,
    })

    const res = await sendPushToStudent('s1', { title: 't', body: 'b' }, { category: 'reminders' })

    // No tokens in this fixture, so it stops there — but reaching the
    // token query at all proves the gate let it through.
    expect(res.reason).toBe('no_tokens')
    expect(mockTokenSelect).toHaveBeenCalled()
  })

  it('sends account pushes even when the master switch is off', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { push_notifications: false, push_categories: {} },
      error: null,
    })

    const res = await sendPushToStudent('s1', { title: 't', body: 'b' }, { category: 'account' })

    expect(res.reason).toBe('no_tokens')
    expect(mockTokenSelect).toHaveBeenCalled()
  })

  it('SENDS when the preference read fails — fail open', async () => {
    // A broken query must not mute the product. This is the direction
    // nobody would report.
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const res = await sendPushToStudent('s1', { title: 't', body: 'b' }, { category: 'social' })

    expect(res.reason).toBe('no_tokens')
    expect(mockTokenSelect).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('SENDS when the student has no preferences row at all', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const res = await sendPushToStudent('s1', { title: 't', body: 'b' }, { category: 'progress' })

    expect(res.reason).toBe('no_tokens')
    expect(mockTokenSelect).toHaveBeenCalled()
  })
})
