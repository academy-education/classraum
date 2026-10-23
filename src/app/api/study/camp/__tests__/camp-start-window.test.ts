/** @jest-environment node */
/**
 * POST /api/study/camp/start — students cannot start camp work before the
 * camp starts (2026-10-23).
 *
 * Teachers may now BUILD assignments before starts_on (they prepare
 * ahead), so this route is the only thing keeping a student from opening
 * one early. The window is the Korean date, binds only when set, and is
 * checked before any session row is written.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'
import { kstDate } from '@/lib/camp/dates'

let db: FakeDb
let n = 0
jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (t: string) => {
      const b = db.from(t) as Record<string, (...a: unknown[]) => unknown>
      if (t === 'study_sessions' || t === 'study_messages') {
        const ins = b.insert
        b.insert = (r: unknown) => ins({ id: `${t}-${++n}`, ...(r as Record<string, unknown>) })
      }
      return b
    },
  },
}))
jest.mock('@/lib/study/auth', () => ({
  requireStudyUser: async () => ({ user: { id: F.STUDENT_A } }),
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: () => null }))
jest.mock('@/lib/study/analytics', () => ({ trackEvent: async () => undefined }))
jest.mock('@/lib/study/assemble', () => ({
  assembleFromItemIds: async (p: { title: string }) => ({ title: p.title, questions: [{ id: 'q1' }] }),
}))
jest.mock('@/lib/study/section-topics', () => ({ campTopicId: () => 'topic-camp' }))

import { POST } from '@/app/api/study/camp/start/route'

const shift = (days: number) => kstDate(Date.now() + days * 86_400_000)

function seed(startsOn: string | null, endsOn: string | null) {
  const s = F.campSeed()
  s.camp_programs = s.camp_programs.map(p => ({
    ...p, name: String(p.id), test_family: 'sat', question_quota: 100, questions_used: 5, student_cap: 50,
    starts_on: startsOn, ends_on: endsOn,
  }))
  s.camp_assignments = [{
    id: 'asg-1', camp_program_id: F.SAT_CAMP, classroom_id: F.ROOM_A, title: 'Prep', section: 'math',
    question_count: 1, item_ids: ['item-1'], kind: null, deleted_at: null,
  }]
  s.classroom_students = s.classroom_students.map((r, i) => ({ id: `cs-${i}`, ...r }))
  s.study_sessions = []
  s.study_messages = []
  return s
}

const start = () => POST(new NextRequest('http://localhost/api/study/camp/start', {
  method: 'POST', body: JSON.stringify({ assignmentId: 'asg-1' }),
}))

beforeEach(() => { n = 0 })

it('refuses to start before the camp starts, and writes no session', async () => {
  db = fakeDb(seed(shift(1), shift(30)))
  const res = await start()
  expect(res.status).toBe(403)
  expect(await res.json()).toMatchObject({ code: 'camp_not_started', startsOn: shift(1) })
  expect(db.tables.study_sessions).toHaveLength(0)
})

it('starts on the first day of the camp (Korean date)', async () => {
  db = fakeDb(seed(kstDate(), shift(30)))
  const res = await start()
  expect(res.status).toBe(200)
  expect((await res.json()).reused).toBe(false)
  expect(db.tables.study_sessions).toHaveLength(1)
})

it('refuses to start after the camp ends', async () => {
  db = fakeDb(seed(shift(-30), shift(-1)))
  const res = await start()
  expect(res.status).toBe(403)
  expect((await res.json()).code).toBe('camp_ended')
  expect(db.tables.study_sessions).toHaveLength(0)
})

it('binds no window when the grant set no dates', async () => {
  db = fakeDb(seed(null, null))
  expect((await start()).status).toBe(200)
})
