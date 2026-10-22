/** @jest-environment node */
/**
 * POST /api/camp/reports/generate (camp-dashboard-ux-audit, 2026-10-22).
 *
 * Until this change every click inserted a full new set of reports, so parents saw identical cards, and the
 * period end defaulted to the program's END date, so a mid-camp report claimed the whole camp. Now:
 *  - the same period for the same student refreshes the existing row and is NOT queued for delivery again
 *  - a new period still creates new rows (history stays readable)
 *  - the period end defaults to today's Korean date, capped at the program end
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
      const b = db.from(t) as Record<string, unknown> & { insert: (r: Record<string, unknown>) => unknown }
      if (t === 'camp_reports') {
        const ins = b.insert
        b.insert = (r: Record<string, unknown>) => ins({ ...r, id: `rep-${++n}`, created_at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString() })
      }
      return b
    },
  },
}))
jest.mock('@/lib/api-auth', () => ({ getUserFromRequest: async () => ({ id: F.T_ROOM_A }) }))
const queued: string[] = []
jest.mock('@/lib/camp/reports', () => ({
  loadClassroomCampData: jest.fn(async () => ({ studentIds: ['student-a', 'student-b'] })),
  buildCampReportPayload: jest.fn(async () => ({ assignments: [], mockTests: [] })),
  queueCampReportDelivery: jest.fn(async ({ reportId }: { reportId: string }) => { queued.push(reportId) }),
}))

import { POST } from '@/app/api/camp/reports/generate/route'

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://localhost/api/camp/reports/generate', { method: 'POST', body: JSON.stringify(body) }))

function seed(endsOn: string | null) {
  const s = F.campSeed()
  s.camp_programs = s.camp_programs.map(p => (p.id === F.SAT_CAMP ? { ...p, starts_on: '2026-10-01', ends_on: endsOn } : p))
  s.camp_reports = []
  return s
}

beforeEach(() => { n = 0; queued.length = 0 })

it('regenerating the same period refreshes the rows instead of adding duplicates', async () => {
  db = fakeDb(seed('2099-12-31'))
  const first = await post({ classroomId: F.ROOM_A })
  expect(first.status).toBe(201)
  expect(db.tables.camp_reports).toHaveLength(2)
  expect(queued).toHaveLength(2)

  const second = await post({ classroomId: F.ROOM_A })
  const json = await second.json()
  expect(second.status).toBe(201)
  expect(db.tables.camp_reports).toHaveLength(2)          // no duplicate cards for parents
  expect(json.generated.every((r: { refreshed?: boolean }) => r.refreshed)).toBe(true)
  expect(queued).toHaveLength(2)                          // a refresh is not delivered again
})

it('a different period still creates new rows', async () => {
  db = fakeDb(seed('2099-12-31'))
  await post({ classroomId: F.ROOM_A, periodEnd: '2026-10-10' })
  await post({ classroomId: F.ROOM_A, periodEnd: '2026-10-17' })
  expect(db.tables.camp_reports).toHaveLength(4)
  expect(queued).toHaveLength(4)
})

it('the period end defaults to today in Korea while the camp is running', async () => {
  db = fakeDb(seed('2099-12-31'))
  await post({ classroomId: F.ROOM_A })
  expect(db.tables.camp_reports[0].period_end).toBe(kstDate())
})

it('the period end is capped at the program end once the camp is over', async () => {
  db = fakeDb(seed('2026-08-31'))
  await post({ classroomId: F.ROOM_A })
  expect(db.tables.camp_reports[0].period_end).toBe('2026-08-31')
})
