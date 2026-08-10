/** @jest-environment node */
/**
 * The weekly recap EMAIL is switched off (RECAP_EMAIL_ENABLED in the
 * route). These tests pin that, and pin the two things that must survive
 * being switched off.
 *
 * ── What changed, and why the old tests had to go ────────────────────
 *
 * This file used to assert the opposite: that the cron DID email, in
 * every case except an explicit `study_recap === false`. Those
 * assertions were correct then and are wrong now, and when the kill
 * switch landed seven of them failed — which is the only reason this
 * file is worth having. A suite that had merely checked "the route
 * returns 200" would have stayed green through a change that stops
 * every email in production.
 *
 * The old contract is NOT deleted, it is inverted and kept: each case
 * that used to prove an email was sent now proves the switch beats that
 * case. When the email is re-enabled, flipping these expectations back
 * restores the original coverage — including the dangerous one, that a
 * MISSING preference key must never read as "unsubscribed", which would
 * silently unsubscribe the whole user base on deploy.
 *
 * ── What must survive the switch ─────────────────────────────────────
 *
 *   · the in-app inbox row — a student who taps the bell still gets
 *     their recap. Killing the email was the request; killing the
 *     in-app recap was not, and deleting the cron would have done both.
 *   · every student's stored study_recap value — untouched, so
 *     re-enabling restores their choice rather than opting everyone in.
 */
import { GET } from '@/app/api/cron/study-weekly-recap/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { sendPostmarkEmail } from '@/lib/postmark'
import { notifyStudent } from '@/lib/study/notify'
import { NextRequest } from 'next/server'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/postmark', () => ({ sendPostmarkEmail: jest.fn() }))
jest.mock('@/lib/study/notify', () => ({ notifyStudent: jest.fn() }))
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: () => true }))
// withHeartbeat wraps the body; the real one writes to job_heartbeats,
// which would eat chains out of the table router.
jest.mock('@/lib/ops/heartbeat', () => ({
  withHeartbeat: (_job: string, fn: () => unknown) => fn(),
}))

/** A bare GET — makeRequest() always attaches a body, which Request
 *  forbids on GET. */
const cronRequest = () =>
  new NextRequest('http://localhost:3000/api/cron/study-weekly-recap')

const fromMock = dbAdmin.from as unknown as jest.Mock
const sendMock = sendPostmarkEmail as unknown as jest.Mock
const notifyMock = notifyStudent as unknown as jest.Mock

/**
 * Queue one full pass of the cron for a single student who DID study
 * this week, with the given user_preferences payload.
 *
 * `prefsRows` is what the user_preferences select resolves to — pass []
 * for "this student has no preferences row at all".
 */
function seedOneActiveStudent(
  enqueue: ReturnType<typeof tableRouter>,
  prefsRows: unknown[],
) {
  // 1 · the onboarded-students select
  enqueue('study_user_prefs', { data: [{ student_id: 'u1' }] })
  // 2 · the batched opt-out read
  enqueue('user_preferences', { data: prefsRows })
  // 3 · this student's attempts
  enqueue('study_attempts', {
    data: [{ is_correct: true, time_spent_seconds: 600, created_at: '2026-08-01', topic_id: null }],
  })
  // 4 · the address
  enqueue('users', { data: { email: 'u1@example.com', name: 'Andy' } })
  // 5 · mastery
  enqueue('study_mastery', { data: [] })
}

describe('GET /api/cron/study-weekly-recap — the email is off', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    sendMock.mockResolvedValue({ sent: true })
    notifyMock.mockResolvedValue(undefined)
  })

  it('sends nothing to a student who explicitly opted out', async () => {
    seedOneActiveStudent(enqueue, [
      { user_id: 'u1', email_notifications: { study_recap: false } },
    ])

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).not.toHaveBeenCalled()
    expect(body).toMatchObject({ sent: 0, optedOut: 1 })
  })

  it.each([
    ['other categories are off but study_recap is not', [{
      user_id: 'u1',
      email_notifications: {
        assignments: false, grades: false, announcements: false, reminders: false,
      },
    }]],
    ['the key is absent', [{ user_id: 'u1', email_notifications: { assignments: true } }]],
    ['an empty object', [{ user_id: 'u1', email_notifications: {} }]],
    ['a null column', [{ user_id: 'u1', email_notifications: null }]],
    ['a non-object column', [{ user_id: 'u1', email_notifications: 'yes' }]],
    ['no user_preferences row at all', []],
  ])('sends nothing even when %s — every one of these used to send', async (_label, rows) => {
    seedOneActiveStudent(enqueue, rows)

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).not.toHaveBeenCalled()
    expect(body).toMatchObject({ sent: 0, optedOut: 1 })
  })

  it('sends nothing when the preferences read itself FAILS', async () => {
    // This case used to send, deliberately: a transient error must not
    // be indistinguishable from "everyone unsubscribed". With the switch
    // off it no longer matters what the read returned, and the route
    // must not throw on the error path either.
    enqueue('study_user_prefs', { data: [{ student_id: 'u1' }] })
    enqueue('user_preferences', { error: { code: '57014', message: 'canceling statement' } })
    enqueue('study_attempts', {
      data: [{ is_correct: true, time_spent_seconds: 600, created_at: '2026-08-01', topic_id: null }],
    })
    enqueue('users', { data: { email: 'u1@example.com', name: 'Andy' } })
    enqueue('study_mastery', { data: [] })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).not.toHaveBeenCalled()
    expect(body).toMatchObject({ sent: 0 })
    warn.mockRestore()
  })
})

describe('what the kill switch must NOT take with it', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    sendMock.mockResolvedValue({ sent: true })
    notifyMock.mockResolvedValue(undefined)
  })

  it('still posts the in-app recap to the inbox', async () => {
    // The ask was to stop the EMAIL. Deleting the cron would have been
    // the easy version and would have silently removed this too.
    seedOneActiveStudent(enqueue, [{ user_id: 'u1', email_notifications: {} }])

    await GET(cronRequest())

    expect(sendMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'u1', kind: 'study_weekly_recap' }),
    )
  })

  it('still posts the in-app recap to a student who opted out of the email', async () => {
    seedOneActiveStudent(enqueue, [
      { user_id: 'u1', email_notifications: { study_recap: false } },
    ])

    await GET(cronRequest())

    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'u1', kind: 'study_weekly_recap' }),
    )
  })
})
