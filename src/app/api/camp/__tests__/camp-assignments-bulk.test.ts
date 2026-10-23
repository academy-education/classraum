/** @jest-environment node */
/**
 * Camp builder: several classrooms at once, bulk due dates, and building
 * before the camp starts (2026-10-23).
 *
 *  - POST /api/camp/assignments with classroomIds builds one assignment
 *    per classroom in ONE request, all-or-nothing: a room the caller
 *    cannot manage, a quota that covers only some of the rooms, or a lost
 *    quota race leaves NO rows and the quota untouched.
 *  - The quota is charged per assignment (count x classrooms) — the same
 *    campQuotaCost the modal shows.
 *  - PATCH with ids moves due dates for all or none, under the single
 *    edit's permission rule.
 *  - Building (assignments and review decks) is allowed before starts_on
 *    and refused after ends_on, by Korean date.
 *
 * The bank draw is REAL (drawCampItems over a seeded study_item_bank), so
 * a shortfall or a per-room draw would show up here.
 */
import { NextRequest } from 'next/server'
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import * as F from '@/tests/camp-fixture'
import { kstDate } from '@/lib/camp/dates'
import { campQuotaCost } from '@/lib/camp/quota-math'

let db: FakeDb
let user = F.MANAGER
/** When set, the next camp_programs UPDATE first sees a concurrent charge land. */
let concurrentChargeTo: number | null = null
let n = 0

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (t: string) => {
      const b = db.from(t) as Record<string, (...a: unknown[]) => unknown>
      if (t === 'camp_assignments') {
        const ins = b.insert
        b.insert = (r: unknown) => {
          const rows = (Array.isArray(r) ? r : [r]) as Record<string, unknown>[]
          return ins(rows.map(x => ({ id: `asg-${++n}`, created_at: new Date().toISOString(), deleted_at: null, kind: null, ...x })))
        }
      }
      if (t === 'camp_programs' && concurrentChargeTo !== null) {
        const upd = b.update
        b.update = (p: unknown) => {
          if (concurrentChargeTo !== null) {
            for (const row of db.tables.camp_programs) if (row.id === F.SAT_CAMP) row.questions_used = concurrentChargeTo
            concurrentChargeTo = null
          }
          return upd(p)
        }
      }
      return b
    },
  },
}))
jest.mock('@/lib/api-auth', () => ({ getUserFromRequest: async () => ({ id: user }) }))

import { POST, PATCH } from '@/app/api/camp/assignments/route'
import { POST as POST_REVIEW } from '@/app/api/camp/review-set/route'

const shift = (days: number) => kstDate(Date.now() + days * 86_400_000)

function bankItem(i: number) {
  return {
    id: `item-${i}`, family: 'sat', section: 'math', domain: 'Algebra', verified: true, archived: false,
    item_type: 'multiple_choice',
    item: { choices: [`a${i}`, `b${i}`, `c${i}`, `d${i}`], correct_answer: `a${i}` },
  }
}

function seed(opts: { quota?: number; used?: number; startsOn?: string | null; endsOn?: string | null } = {}) {
  const s = F.campSeed()
  s.camp_programs = s.camp_programs.map(p => ({
    ...p,
    name: String(p.id), test_family: p.id === F.TOEFL_CAMP ? 'toefl' : 'sat', student_cap: 50,
    question_quota: opts.quota ?? 100, questions_used: opts.used ?? 0,
    starts_on: opts.startsOn ?? null, ends_on: opts.endsOn ?? null,
  }))
  s.study_item_bank = Array.from({ length: 30 }, (_, i) => bankItem(i))
  s.camp_assignments = []
  s.classroom_sessions = [{ id: 'sess-a', classroom_id: F.ROOM_A, deleted_at: null }]
  return s
}

const post = (body: Record<string, unknown>) =>
  POST(new NextRequest('http://localhost/api/camp/assignments', { method: 'POST', body: JSON.stringify(body) }))
const patch = (body: Record<string, unknown>) =>
  PATCH(new NextRequest('http://localhost/api/camp/assignments', { method: 'PATCH', body: JSON.stringify(body) }))
const used = () => db.tables.camp_programs.find(p => p.id === F.SAT_CAMP)!.questions_used

beforeEach(() => { user = F.MANAGER; concurrentChargeTo = null; n = 0 })

describe('POST several classrooms', () => {
  it('builds one assignment per classroom from one draw and charges count x classrooms', async () => {
    db = fakeDb(seed())
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_B], title: 'Week 1', count: 5 })
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(db.tables.camp_assignments).toHaveLength(2)
    expect(db.tables.camp_assignments.map(a => a.classroom_id).sort()).toEqual([F.ROOM_A, F.ROOM_B].sort())
    // Same questions in every room.
    expect(db.tables.camp_assignments[0].item_ids).toEqual(db.tables.camp_assignments[1].item_ids)
    expect(used()).toBe(campQuotaCost(5, 2))
    expect(used()).toBe(10)
    expect(json.charged).toBe(10)
    expect(json.assignments.map((a: { classroom_id: string }) => a.classroom_id)).toEqual([F.ROOM_A, F.ROOM_B])
    expect(json.assignment.classroom_id).toBe(F.ROOM_A)
  })

  it('refuses the whole set when the quota covers only some rooms, with a code and both numbers', async () => {
    db = fakeDb(seed({ quota: 100, used: 92 }))       // 8 left: one room of 5 fits, two do not
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_B], title: 'Week 1', count: 5 })
    const json = await res.json()
    expect(res.status).toBe(402)
    expect(json).toMatchObject({ code: 'quota_exceeded', required: 10, remaining: 8 })
    expect(db.tables.camp_assignments).toHaveLength(0)
    expect(used()).toBe(92)
    // Refused by the pre-flight over the whole set, not by inserting and rolling back.
    expect(db.log).not.toContain('insert camp_assignments')
  })

  it('rolls every row back when a concurrent charge takes the quota after the pre-flight', async () => {
    db = fakeDb(seed({ quota: 100, used: 0 }))
    concurrentChargeTo = 95                            // lands between pre-flight and our CAS
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_B], title: 'Week 1', count: 5 })
    const json = await res.json()
    expect(res.status).toBe(402)
    expect(json.code).toBe('quota_exceeded')
    expect(db.tables.camp_assignments).toHaveLength(0) // nothing survives un-paid-for
    expect(used()).toBe(95)                            // only the other writer's charge
  })

  it('refuses everything when the caller cannot manage one of the rooms', async () => {
    db = fakeDb(seed())
    user = F.T_ROOM_A                                  // teaches room A only
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_B], title: 'Week 1', count: 5 })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('forbidden')
    expect(db.tables.camp_assignments).toHaveLength(0)
    expect(used()).toBe(0)
  })

  it('refuses classrooms from different camps', async () => {
    db = fakeDb(seed())
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_TOEFL], title: 'Week 1', count: 5 })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('mixed_programs')
    expect(db.tables.camp_assignments).toHaveLength(0)
  })

  it('refuses a session link when building for more than one room', async () => {
    db = fakeDb(seed())
    const res = await post({ classroomIds: [F.ROOM_A, F.ROOM_B], title: 'W', count: 5, classroomSessionId: 'sess-a' })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('session_single_classroom')
  })

  it('keeps the single-classroom contract', async () => {
    db = fakeDb(seed())
    const res = await post({ classroomId: F.ROOM_A, title: 'Solo', count: 5, classroomSessionId: 'sess-a' })
    expect(res.status).toBe(201)
    expect((await res.json()).assignment.classroom_session_id).toBe('sess-a')
    expect(used()).toBe(5)
  })
})

describe('camp window for building', () => {
  it('allows an assignment before the camp starts', async () => {
    db = fakeDb(seed({ startsOn: shift(7), endsOn: shift(30) }))
    const res = await post({ classroomId: F.ROOM_A, title: 'Prep', count: 5 })
    expect(res.status).toBe(201)
  })

  it('refuses an assignment after the camp ends', async () => {
    db = fakeDb(seed({ startsOn: shift(-30), endsOn: shift(-1) }))
    const res = await post({ classroomId: F.ROOM_A, title: 'Late', count: 5 })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'camp_ended', endsOn: shift(-1) })
    expect(db.tables.camp_assignments).toHaveLength(0)
  })

  it('allows a review deck before the camp starts, stored with a neutral title', async () => {
    db = fakeDb(seed({ startsOn: shift(7), endsOn: shift(30) }))
    const res = await POST_REVIEW(new NextRequest('http://localhost/api/camp/review-set', {
      method: 'POST', body: JSON.stringify({ classroomId: F.ROOM_A, count: 5 }),
    }))
    expect(res.status).toBe(201)
    expect(db.tables.camp_assignments[0]).toMatchObject({ kind: 'review', title: '' })
  })

  it('refuses a review deck after the camp ends', async () => {
    db = fakeDb(seed({ endsOn: shift(-1) }))
    const res = await POST_REVIEW(new NextRequest('http://localhost/api/camp/review-set', {
      method: 'POST', body: JSON.stringify({ classroomId: F.ROOM_A, count: 5 }),
    }))
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('camp_ended')
  })
})

describe('PATCH bulk due dates', () => {
  function seedWithAssignments() {
    const s = seed()
    s.camp_assignments = [
      { id: 'a1', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, title: 'A1', due_at: null, deleted_at: null, kind: null },
      { id: 'a2', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, title: 'A2', due_at: null, deleted_at: null, kind: null },
      { id: 'b1', classroom_id: F.ROOM_B, camp_program_id: F.SAT_CAMP, title: 'B1', due_at: null, deleted_at: null, kind: null },
      { id: 'deck', classroom_id: F.ROOM_A, camp_program_id: F.SAT_CAMP, title: '', due_at: null, deleted_at: null, kind: 'review' },
    ]
    return s
  }
  const due = '2026-11-01T14:59:59.000Z'
  const dueOf = (id: string) => db.tables.camp_assignments.find(a => a.id === id)!.due_at

  it('moves every selected assignment the caller may edit', async () => {
    db = fakeDb(seedWithAssignments())
    user = F.T_ROOM_A
    const res = await patch({ ids: ['a1', 'a2'], dueAt: due })
    expect(res.status).toBe(200)
    expect((await res.json()).updated).toBe(2)
    expect(dueOf('a1')).toBe(due)
    expect(dueOf('a2')).toBe(due)
    expect(dueOf('b1')).toBeNull()
  })

  it('moves none when one id is in a room the caller cannot edit', async () => {
    db = fakeDb(seedWithAssignments())
    user = F.T_ROOM_A
    const res = await patch({ ids: ['a1', 'b1'], dueAt: due })
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('forbidden')
    expect(dueOf('a1')).toBeNull()
    expect(dueOf('b1')).toBeNull()
  })

  it('treats a review deck id as not found and moves nothing', async () => {
    db = fakeDb(seedWithAssignments())
    const res = await patch({ ids: ['a1', 'deck'], dueAt: due })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('assignment_not_found')
    expect(dueOf('a1')).toBeNull()
  })

  it('clears due dates with null, and refuses a missing dueAt', async () => {
    db = fakeDb(seedWithAssignments())
    db.tables.camp_assignments[0].due_at = due
    expect((await patch({ ids: ['a1'], dueAt: null })).status).toBe(200)
    expect(dueOf('a1')).toBeNull()
    const bad = await patch({ ids: ['a1'] })
    expect(bad.status).toBe(400)
    expect((await bad.json()).code).toBe('invalid_due_date')
  })
})
