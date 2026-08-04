/** @jest-environment node */
/**
 * The study weekly-recap cron used to read NO preference at all: it
 * selected every onboarded row of study_user_prefs, looked up the
 * address, and sent. A student who had switched every email toggle off
 * still got it every Monday.
 *
 * These tests are written against the ROUTE, not against
 * isStudyRecapOptedOut, on purpose. A unit test of the predicate stays
 * green if the cron simply stops calling it — which is precisely the bug
 * that existed. What has to be pinned is that the send is gated.
 *
 * Both directions matter and the second is the dangerous one:
 *   · study_recap === false  → no email
 *   · anything else (key absent, {}, no user_preferences row at all)
 *     → email still sent. Nobody has this key today, so a key-absent
 *     read of "off" would unsubscribe the entire user base on deploy.
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

describe('GET /api/cron/study-weekly-recap — study_recap opt-out', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    sendMock.mockResolvedValue({ sent: true })
    notifyMock.mockResolvedValue(undefined)
  })

  it('does NOT email a student who set study_recap = false', async () => {
    seedOneActiveStudent(enqueue, [
      { user_id: 'u1', email_notifications: { study_recap: false } },
    ])

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).not.toHaveBeenCalled()
    expect(body).toMatchObject({ sent: 0, optedOut: 1 })
  })

  it('still emails when other categories are off but study_recap is not', async () => {
    // The shape a student who muted every ACADEMY email has. The recap
    // is a study email and those four toggles must not reach it.
    seedOneActiveStudent(enqueue, [{
      user_id: 'u1',
      email_notifications: {
        assignments: false, grades: false, announcements: false, reminders: false,
      },
    }])

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({ sent: 1, optedOut: 0 })
  })

  it.each([
    ['the key absent', [{ user_id: 'u1', email_notifications: { assignments: true } }]],
    ['an empty object', [{ user_id: 'u1', email_notifications: {} }]],
    ['a null column', [{ user_id: 'u1', email_notifications: null }]],
    ['a non-object column', [{ user_id: 'u1', email_notifications: 'yes' }]],
    ['no user_preferences row at all', []],
  ])('STILL emails when %s — absent must never read as off', async (_label, rows) => {
    seedOneActiveStudent(enqueue, rows)

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({ sent: 1, optedOut: 0 })
  })

  it('still emails when the preferences read itself FAILS', async () => {
    // A transient error must not be indistinguishable from "everyone
    // unsubscribed" — that would be a silent zero-send week.
    seedOneActiveStudent(enqueue, [])
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    enqueue('study_user_prefs', { data: [{ student_id: 'u1' }] })
    enqueue('user_preferences', { error: { code: '57014', message: 'canceling statement' } })
    enqueue('study_attempts', {
      data: [{ is_correct: true, time_spent_seconds: 600, created_at: '2026-08-01', topic_id: null }],
    })
    enqueue('users', { data: { email: 'u1@example.com', name: 'Andy' } })
    enqueue('study_mastery', { data: [] })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const body = await (await GET(cronRequest())).json()

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({ sent: 1 })
    warn.mockRestore()
  })

  it('leaves the IN-APP recap alone for an opted-out student', async () => {
    // The toggle lives under "email notifications". Muting an inbox is
    // not a request to stop seeing the recap inside the app, so the
    // notify call must survive the gate.
    seedOneActiveStudent(enqueue, [
      { user_id: 'u1', email_notifications: { study_recap: false } },
    ])

    await GET(cronRequest())

    expect(sendMock).not.toHaveBeenCalled()
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'u1', kind: 'study_weekly_recap' }),
    )
  })
})
